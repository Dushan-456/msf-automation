import fs from 'fs';
import csv from 'csv-parser';
import { createJob, getJobStatus, updateJobProgress, failJob, updateJobActivity } from '../services/jobService.mjs';
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

    for (const row of dataRows) {
        try {
            updateJobActivity(jobId, `Processing surveys for ${row.doctorName}...`, row.doctorName);
            await processSurveyMonkeyWorkflow(row);
            console.log(`✅ Success: ${row.doctorName}`);
            updateJobProgress(jobId, { doctorName: row.doctorName, success: true });
        } catch (error) {
            const errorMsg = error.response?.data?.error?.message || error.message;
            console.error(`❌ Failed: ${row.doctorName}`, errorMsg);
            
            updateJobProgress(jobId, { 
                doctorName: row.doctorName,
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
