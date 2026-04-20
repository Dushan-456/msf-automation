import fs from 'fs';
import csv from 'csv-parser';
import asyncHandler from '../middleware/asyncHandler.mjs';
import { createJob, getJobStatus, updateJobProgress, failJob, updateJobActivity, updateRowStatus } from '../services/jobService.mjs';
import { processSurveyMonkeyWorkflow, fetchAllSurveys, sendReminderToNonRespondents, fetchRecipientTracking, fetchSurveyCollectors, fetchRecipientTrackingByCollector, fetchReadySurveys, fetchToBeAnalyzedSurveys, fetchCompletedSurveys, fetchSurveyReportData, markSurveyComplete as markSurveyCompleteService } from '../services/surveyMonkeyService.mjs';
import { sendDoctorNotificationEmail } from '../services/emailService.mjs';

/**
 * POST /api/v1/automate-surveys
 * Handles the CSV upload, validates it, and spawns a background job.
 */
export const uploadAndStartAutomation = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Uploaded file must be a CSV.' });
    }

    const results = [];
    const fd = fs.openSync(req.file.path, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    let encoding = 'utf8';
    let separator = ',';
    
    if (bytesRead >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        encoding = 'utf16le';
    }

    const firstChunk = buffer.toString(encoding, 0, bytesRead);
    const firstLine = firstChunk.split('\n')[0];
    if (firstLine.includes('\t') && !firstLine.includes(',')) {
        separator = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
        separator = ';';
    }

    fs.createReadStream(req.file.path, { encoding })
        .pipe(csv({ 
            separator: separator,
            mapHeaders: ({ header }) => header.replace(/^\ufeff/gi, '').replace(/^"|"$/g, '').replace(/[\r\n]+/g, '').trim(),
            mapValues: ({ value }) => typeof value === 'string' ? value.replace(/[\r\n]+/g, '').replace(/^"|"$/g, '').trim() : value
        }))
        .on('data', (data) => results.push(data))
        .on('error', (error) => {
            console.error("CSV Parse Error:", error);
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Failed to parse CSV file.' });
        })
        .on('end', () => {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ error: 'The CSV file is empty or could not be parsed.' });
            }

            const doctorNames = results.map(r => r.doctorName);
            const jobId = createJob(doctorNames);

            res.status(202).json({ 
                message: "Automation started in the background.", 
                jobId: jobId 
            });

            processSurveysInBackground(jobId, results);
        });
};

const processSurveysInBackground = async (jobId, dataRows) => {
    console.log(`Job ${jobId}: Started processing ${dataRows.length} rows.`);

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
            updateJobActivity(jobId, `Working on ${row.doctorName}...`, i);
            
            // Pass a progress callback to track internal steps
            await processSurveyMonkeyWorkflow(row, (detail) => {
                updateRowStatus(jobId, i, 'processing', detail);
            });
            
            if (row.doctorEmail) {
                try {
                    updateRowStatus(jobId, i, 'processing', 'Sending Notification Email...');
                    await sendDoctorNotificationEmail(row.doctorName, row.doctorEmail, row.specialty, row.level);
                } catch (emailError) {
                    console.error(`Email notification failed for ${row.doctorName}:`, emailError.message);
                }
            }
            
            console.log(`✅ Success: ${row.doctorName}`);
            updateRowStatus(jobId, i, 'completed', 'Finished successfully');
            updateJobProgress(jobId, { rowIndex: i, success: true });
        } catch (error) {
            if (error.response?.status === 429) {
                console.error(`🚫 Rate limit hit during processing of ${row.doctorName}.`);
                updateJobProgress(jobId, { rowIndex: i, success: false, errorDetail: `Rate limit hit for ${row.doctorName}: SurveyMonkey API daily limit reached.` });
                for (let j = i + 1; j < dataRows.length; j++) {
                    updateJobProgress(jobId, { rowIndex: j, success: false, errorDetail: 'Skipped — SurveyMonkey API daily limit reached.' });
                }
                failJob(jobId, 'SurveyMonkey API daily limit reached. Please try again tomorrow.');
                return; 
            }

            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ Failed: ${row.doctorName}`, errorMsg);
            
            updateJobProgress(jobId, { rowIndex: i, success: false, errorDetail: `Failed for ${row.doctorName}: ${errorMsg}` });
        }
    }

    updateJobActivity(jobId, 'Finished processing all doctors in the list.');
    console.log(`Job ${jobId}: Finished processing.`);
};

// ─── API ENDPOINTS USING ASYNC_HANDLER ────────────────────────────────────────────────────────

export const checkJobStatus = (req, res) => {
    const { jobId } = req.params;
    const job = getJobStatus(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found or expired.' });
    res.json(job);
};

export const getAllSurveys = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;
    const search = req.query.search || '';
    const data = await fetchAllSurveys(page, perPage, search);
    res.json(data);
});

export const sendReminders = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const { title } = req.body;
    await sendReminderToNonRespondents(surveyId, title);
    res.json({ success: true, message: 'Reminders successfully sent to non-respondents.' });
});

export const processManualEntry = asyncHandler(async (req, res) => {
    const { doctorName, doctorEmail, trainerName, specialty, level, emails, slmc } = req.body;
    
    if (!doctorName || !emails) {
        return res.status(400).json({ error: "Missing required fields (doctorName, emails)." });
    }

    await processSurveyMonkeyWorkflow({ doctorName, trainerName, specialty, level, emails, slmc });
    
    if (doctorEmail) {
        try {
            await sendDoctorNotificationEmail(doctorName, doctorEmail, specialty, level);
        } catch (emailError) {}
    }
    
    res.status(200).json({ success: true, message: `Successfully processed survey for ${doctorName}.` });
});

export const getTrackingData = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const data = await fetchRecipientTracking(surveyId);
    res.json(data);
});

export const getSurveyCollectors = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const data = await fetchSurveyCollectors(surveyId);
    res.json(data);
});

export const getTrackingByCollector = asyncHandler(async (req, res) => {
    const { collectorId } = req.params;
    const data = await fetchRecipientTrackingByCollector(collectorId);
    res.json(data);
});

export const getReadySurveys = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 50;
    const data = await fetchReadySurveys(page, perPage);
    res.json(data);
});

export const getSurveyReportData = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    const data = await fetchSurveyReportData(surveyId);
    res.json(data);
});

export const markSurveyComplete = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    await markSurveyCompleteService(surveyId);
    res.json({ success: true, message: 'Survey successfully marked as complete.' });
});

export const analyzeInSM = asyncHandler(async (req, res) => {
    const { surveyId } = req.params;
    // The PATCH response from markSurveyComplete already includes analyze_url,
    // so we don't need a separate getSurveyAnalyzeUrl call (saves 1 API call)
    const surveyData = await markSurveyCompleteService(surveyId);
    res.json({ success: true, analyze_url: surveyData.analyze_url });
});

export const getToBeAnalyzedSurveys = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;
    const data = await fetchToBeAnalyzedSurveys(page, perPage);
    res.json(data);
});

export const getCompletedSurveys = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const perPage = parseInt(req.query.perPage, 10) || 20;
    const data = await fetchCompletedSurveys(page, perPage);
    res.json(data);
});
