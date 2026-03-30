import fs from 'fs';
import csv from 'csv-parser';
import { createJob, getJobStatus, updateJobProgress, failJob, updateJobActivity } from '../services/jobService.mjs';
import { processSurveyMonkeyWorkflow, fetchAllSurveys, sendReminderToNonRespondents, fetchRecipientTracking, fetchSurveyCollectors, fetchRecipientTrackingByCollector, fetchReadySurveys, fetchSurveyReportData, markSurveyComplete as markSurveyCompleteService } from '../services/surveyMonkeyService.mjs';
import { sendDoctorNotificationEmail } from '../services/emailService.mjs';

/**
 * POST /api/v1/automate-surveys
 * Handles the CSV upload, validates it, and spawns a background job.
 */
export const uploadAndStartAutomation = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file uploaded.' });
    }

    // Basic MIME type validation (Multer fileFilter also handles this, but secondary check is good)
    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Uploaded file must be a CSV.' });
    }

    const results = [];

    // Auto-detect encoding and separator
    const fd = fs.openSync(req.file.path, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    let encoding = 'utf8';
    let separator = ',';
    
    // Check for UTF-16LE BOM
    if (bytesRead >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        encoding = 'utf16le';
    }

    // Read the first chunk to guess the separator
    const firstChunk = buffer.toString(encoding, 0, bytesRead);
    const firstLine = firstChunk.split('\n')[0];
    if (firstLine.includes('\t') && !firstLine.includes(',')) {
        separator = '\t';
    } else if (firstLine.includes(';') && !firstLine.includes(',')) {
        separator = ';';
    }

    // Parse the CSV
    fs.createReadStream(req.file.path, { encoding })
        .pipe(csv({ 
            separator: separator,
            // Clean BOM, quotes, carriage returns, and whitespace from headers
            mapHeaders: ({ header }) => header
                .replace(/^\ufeff/gi, '')
                .replace(/^"|"$/g, '')
                .replace(/[\r\n]+/g, '')
                .trim(),
            // Clean carriage returns, quotes, and whitespace from actual values
            mapValues: ({ value }) => typeof value === 'string' ? value.replace(/[\r\n]+/g, '').replace(/^"|"$/g, '').trim() : value
        }))
        .on('data', (data) => results.push(data))
        .on('error', (error) => {
            console.error("CSV Parse Error:", error);
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Failed to parse CSV file.' });
        })
        .on('end', () => {
            // Delete the temp file now that we have data in memory
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ error: 'The CSV file is empty or could not be parsed.' });
            }

            // 1. Create the job
            const doctorNames = results.map(r => r.doctorName);
            const jobId = createJob(doctorNames);

            // 2. Respond to client immediately with jobId
            res.status(202).json({ 
                message: "Automation started in the background.", 
                jobId: jobId 
            });

            // 3. Process the job asynchronously
            processSurveysInBackground(jobId, results);
        });
};

/**
 * Internal worker function to process the parsed CSV data
 */
const processSurveysInBackground = async (jobId, dataRows) => {
    console.log(`Job ${jobId}: Started processing ${dataRows.length} rows.`);

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        try {
            updateJobActivity(jobId, `Processing surveys for ${row.doctorName}...`, i);
            await processSurveyMonkeyWorkflow(row);
            
            // Send doctor notification email right after successful SurveyMonkey creation
            if (row.doctorEmail) {
                try {
                    await sendDoctorNotificationEmail(row.doctorName, row.doctorEmail);
                } catch (emailError) {
                    console.error(`Failed to send notification email to ${row.doctorEmail}. Survey workflow completed anyway.`, emailError);
                    // Decide if you want to fail the job if the email fails, or just log it. 
                    // Usually we don't want to fail the whole survey creation if only the final notification failed.
                }
            }
            
            console.log(`✅ Success: ${row.doctorName}`);
            updateJobProgress(jobId, { rowIndex: i, success: true });
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ Failed: ${row.doctorName}`, errorMsg);
            
            updateJobProgress(jobId, { 
                rowIndex: i,
                success: false, 
                errorDetail: `Failed for ${row.doctorName}: ${errorMsg}` 
            });
        }
    }

    updateJobActivity(jobId, 'Finished processing all doctors in the list.');
    console.log(`Job ${jobId}: Finished processing.`);
};

/**
 * GET /api/v1/status/:jobId
 * Returns the current progress of a background job.
 */
export const checkJobStatus = (req, res) => {
    const { jobId } = req.params;
    const job = getJobStatus(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found or expired.' });
    }

    res.json(job);
};

/**
 * GET /api/v1/surveys
 * Fetches all surveys from SurveyMonkey API with pagination.
 */
export const getAllSurveys = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const perPage = parseInt(req.query.perPage, 10) || 20;
        const search = req.query.search || '';

        const data = await fetchAllSurveys(page, perPage, search);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("Error fetching surveys:", errorMsg);
        res.status(500).json({ error: 'Failed to fetch surveys.' });
    }
};

/**
 * POST /api/v1/surveys/:surveyId/reminders
 * Automates sending reminders to non-respondents for a survey.
 */
export const sendReminders = async (req, res) => {
    try {
        const { surveyId } = req.params;
        await sendReminderToNonRespondents(surveyId);
        res.json({ success: true, message: 'Reminders successfully sent to non-respondents.' });
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error sending reminders for survey ${req.params.surveyId}:`, errorMsg);
        res.status(500).json({ error: `Failed to send reminders: ${errorMsg}` });
    }
};

/**
 * POST /api/v1/automate-manual
 * Directly processes a single doctor's survey from JSON payload.
 */
export const processManualEntry = async (req, res) => {
    try {
        const { doctorName, doctorEmail, trainerName, specialty, level, emails } = req.body;
        
        if (!doctorName || !emails) {
            return res.status(400).json({ error: "Missing required fields (doctorName, emails)." });
        }

        // Run the workflow
        await processSurveyMonkeyWorkflow({ doctorName, trainerName, specialty, level, emails });
        
        // Send notification email
        if (doctorEmail) {
            try {
                await sendDoctorNotificationEmail(doctorName, doctorEmail);
            } catch (emailError) {
                console.error(`Failed to send notification email to ${doctorEmail}. Survey workflow completed anyway.`, emailError);
                // Continue with success response because main workflow succeeded
            }
        }
        
        res.status(200).json({ success: true, message: `Successfully processed survey for ${doctorName}.` });
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`❌ Manual Entry Failed: ${req.body?.doctorName}`, errorMsg);
        res.status(500).json({ error: `Manual entry failed: ${errorMsg}` });
    }
};

/**
 * GET /api/v1/surveys/:surveyId/tracking
 * Returns recipient email & response tracking data for a specific survey.
 */
export const getTrackingData = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const data = await fetchRecipientTracking(surveyId);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error fetching tracking data for survey ${req.params.surveyId}:`, errorMsg);
        res.status(500).json({ error: `Failed to fetch tracking data: ${errorMsg}` });
    }
};

/**
 * GET /api/v1/surveys/:surveyId/collectors
 * Returns the list of all collectors for a survey (id, name, type, status).
 */
export const getSurveyCollectors = async (req, res) => {
    try {
        const { surveyId } = req.params;
        const data = await fetchSurveyCollectors(surveyId);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error fetching collectors for survey ${req.params.surveyId}:`, errorMsg);
        res.status(500).json({ error: `Failed to fetch collectors: ${errorMsg}` });
    }
};

/**
 * GET /api/v1/collectors/:collectorId/tracking
 * Returns recipient tracking data for a specific collector.
 */
export const getTrackingByCollector = async (req, res) => {
    try {
        const { collectorId } = req.params;
        const data = await fetchRecipientTrackingByCollector(collectorId);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error fetching tracking for collector ${req.params.collectorId}:`, errorMsg);
        res.status(500).json({ error: `Failed to fetch tracking data: ${errorMsg}` });
    }
};

/**
 * GET /api/v1/reports/ready
 * Returns list of eligible surveys dynamically fetched from SM.
 */
export const getReadySurveys = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const perPage = parseInt(req.query.perPage, 10) || 50;
        const data = await fetchReadySurveys(page, perPage);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error("Error fetching ready surveys:", errorMsg);
        res.status(500).json({ error: 'Failed to fetch ready surveys.' });
    }
};

/**
 * GET /api/v1/reports/:surveyId/data
 * Returns details, rollups, and bulk responses for a survey.
 */
export const getSurveyReportData = async (req, res) => {
    try {
        const { surveyId } = req.params;
        console.log(`[Backend] Fetching report data for survey: ${surveyId}...`);
        const data = await fetchSurveyReportData(surveyId);
        console.log(`[Backend] Successfully fetched report data for survey: ${surveyId}`);
        res.json(data);
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error fetching report data for survey ${req.params.surveyId}:`, errorMsg);
        res.status(500).json({ error: `Failed to fetch report data: ${errorMsg}` });
    }
};

/**
 * PATCH /api/v1/reports/:surveyId/complete
 * Moves survey to completed folder.
 */
export const markSurveyComplete = async (req, res) => {
    try {
        const { surveyId } = req.params;
        await markSurveyCompleteService(surveyId);
        res.json({ success: true, message: 'Survey successfully marked as complete.' });
    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`Error marking survey ${req.params.surveyId} as complete:`, errorMsg);
        res.status(500).json({ error: `Failed to mark survey complete: ${errorMsg}` });
    }
};
