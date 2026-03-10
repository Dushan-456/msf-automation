import fs from 'fs';
import csv from 'csv-parser';
import { createJob, getJobStatus, updateJobProgress, failJob } from '../services/jobService.mjs';
import { processSurveyMonkeyWorkflow } from '../services/surveyMonkeyService.mjs';

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

    // Parse the CSV first to know the total count
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('error', (error) => {
            fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Failed to parse CSV file.' });
        })
        .on('end', () => {
            // Delete the temp file now that we have data in memory
            fs.unlinkSync(req.file.path);

            if (results.length === 0) {
                return res.status(400).json({ error: 'The CSV file is empty.' });
            }

            // 1. Create the job
            const jobId = createJob(results.length);

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

    for (const row of dataRows) {
        try {
            await processSurveyMonkeyWorkflow(row);
            console.log(`✅ Success: ${row.doctorName}`);
            updateJobProgress(jobId, { success: true });
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ Failed: ${row.doctorName}`, errorMsg);
            
            updateJobProgress(jobId, { 
                success: false, 
                errorDetail: `Failed for ${row.doctorName}: ${errorMsg}` 
            });
        }
    }

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
