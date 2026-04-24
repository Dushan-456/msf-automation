import fs from 'fs';
import csv from 'csv-parser';
import Subject from '../models/Subject.mjs';
import { getSetting, setSetting } from '../models/Settings.mjs';
import { getNestedSubjectFolder, uploadFileToDrive } from '../services/googleDriveService.mjs';
import { updateSurveyStatusInSheet } from '../services/googleSheetsService.mjs';
import { getTransporter } from '../services/emailService.mjs';

// ─── Subject CRUD ─────────────────────────────────────────────

/**
 * POST /api/v1/subjects
 * Create a new Subject.
 */
export const addSubject = async (req, res) => {
    try {
        const { name, clerkEmail } = req.body;

        if (!name || !clerkEmail) {
            return res.status(400).json({ error: 'All fields (name, clerkEmail) are required.' });
        }

        const subject = new Subject({ name, clerkEmail });
        await subject.save();

        res.status(201).json({ success: true, data: subject });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: `A subject with the name "${req.body.name}" already exists.` });
        }
        console.error('Error adding subject:', error);
        res.status(500).json({ error: 'Failed to add subject.' });
    }
};

/**
 * GET /api/v1/subjects
 * Return all subjects.
 */
export const getSubjects = async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ name: 1 });
        res.json({ success: true, data: subjects });
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ error: 'Failed to fetch subjects.' });
    }
};

/**
 * PUT /api/v1/subjects/:id
 * Update an existing subject.
 */
export const updateSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, clerkEmail } = req.body;

        const subject = await Subject.findByIdAndUpdate(
            id,
            { name, clerkEmail },
            { new: true, runValidators: true }
        );

        if (!subject) {
            return res.status(404).json({ error: 'Subject not found.' });
        }

        res.json({ success: true, data: subject });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: `A subject with the name "${req.body.name}" already exists.` });
        }
        console.error('Error updating subject:', error);
        res.status(500).json({ error: 'Failed to update subject.' });
    }
};

/**
 * DELETE /api/v1/subjects/:id
 * Remove a subject by ID.
 */
export const deleteSubject = async (req, res) => {
    try {
        const { id } = req.params;
        const subject = await Subject.findByIdAndDelete(id);

        if (!subject) {
            return res.status(404).json({ error: 'Subject not found.' });
        }

        res.json({ success: true, message: `Subject "${subject.name}" deleted.` });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ error: 'Failed to delete subject.' });
    }
};

// ─── Upload & Send ────────────────────────────────────────────

/**
 * POST /api/v1/subjects/upload
 * Receives subjectId + PDF files.
 * 1. Looks up the Subject from MongoDB
 * 2. Uploads PDFs to Google Drive (if uploadToDrive is true)
 * 3. Sends email to assistantRegistrarEmail, BCC clerkEmail, with PDF attachments
 * 4. Deletes the temp files
 */
export const uploadAndSend = async (req, res) => {
    const files = req.files || [];
    
    try {
        const { subjectId, uploadToDrive } = req.body;
        const shouldUploadToDrive = uploadToDrive === 'true' || uploadToDrive === true;

        if (!subjectId) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ error: 'Subject ID is required.' });
        }

        if (files.length === 0) {
            return res.status(400).json({ error: 'At least one PDF file is required.' });
        }

        // 1. Look up the subject
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(404).json({ error: 'Subject not found.' });
        }

        const assistantRegistrarEmail = await getSetting('assistantRegistrarEmail');
        if (!assistantRegistrarEmail) {
            files.forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ error: 'Assistant Registrar email is not configured. Please set it in Subject Settings.' });
        }

        let driveFiles = [];
        
        // 2. Upload to Google Drive (if checked)
        if (shouldUploadToDrive) {
            console.log(`📤 Uploading ${files.length} file(s) to Drive for subject "${subject.name}"...`);
            const subjectFolderId = await getNestedSubjectFolder(subject.name);
            
            for (const file of files) {
                const driveFile = await uploadFileToDrive(
                    file.path,
                    file.originalname,
                    file.mimetype || 'application/pdf',
                    subjectFolderId
                );
                driveFiles.push(driveFile);
            }
        } else {
            console.log(`⏩ Skipping Google Drive upload as requested.`);
        }

        // 3. Send email with attachments
        console.log(`📧 Sending email to ${assistantRegistrarEmail} (CC: ${subject.clerkEmail})...`);
        
        const attachments = files.map(file => ({
            filename: file.originalname,
            path: file.path
        }));

        const fileListHtml = files.map(f => `<li>${f.originalname}</li>`).join('');

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: assistantRegistrarEmail,
          cc: subject.clerkEmail,
          subject: `MSF reports - ${subject.name} - ${new Date().toISOString().slice(0, 10)}`,
          html: `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                        <h2 style="color: #2c3e50; margin-top: 0;">MSF reports - ${subject.name}</h2>
                        <p>Dear Miss,</p>
                        <p>Please find attached the analyzed MSF reports for the subject of <strong>${subject.name}</strong>. Kindly arrange to forward them to the relevant Boards of Study/Specialty Boards.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                            <tr>
                                <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; border-radius: 4px 0 0 0;">Subject</td>
                                <td style="padding: 8px 12px; background: #f1f3f5;">${subject.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Files</td>
                                <td style="padding: 8px 12px; background: #f1f3f5;">
                                    <ul style="margin: 0; padding-left: 20px;">
                                        ${fileListHtml}
                                    </ul>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; border-radius: 0 0 0 4px;">Date</td>
                                <td style="padding: 8px 12px; background: #f1f3f5;">${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</td>
                            </tr>
                        </table>
                        <p>The documents have been attached to this email ${shouldUploadToDrive ? "and uploaded to Google Drive " : ""}for your records.</p>
                        <p>Thank you.<br>Best regards,<br>K N Dushan</p>
                        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;" />
                        <p style="font-size: 12px; color: #868e96;">MERC - PGIM - MSF Reports</p>
                    </div>
                </div>
            `,
          attachments,
        };

        await getTransporter().sendMail(mailOptions);
        console.log(`✅ Email sent successfully for subject "${subject.name}".`);

        // 4. Clean up temp files
        files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
                else console.log(`🗑️ Temp file deleted: ${file.path}`);
            });
        });

        res.json({
            success: true,
            message: shouldUploadToDrive 
                ? `Documents uploaded to Drive and email sent for "${subject.name}".`
                : `Email sent successfully with attachments for "${subject.name}". (Drive skipped)`,
            driveFiles: shouldUploadToDrive ? driveFiles : []
        });
    } catch (error) {
        // Clean up temp files on error
        files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        console.error('Upload & Send error:', error);
        res.status(500).json({ error: `Upload & Send failed: ${error.message}` });
    }
};

/**
 * POST /api/v1/subjects/upload-stream
 * Same pipeline as uploadAndSend but streams per-file progress via SSE.
 * Only used when uploadToDrive is enabled (Drive + Sheet update per file).
 *
 * SSE event format:
 *   data: { fileIndex, filename, status, sheetStatus?, link?, message? }
 */
export const uploadAndSendStream = async (req, res) => {
    const files = req.files || [];

    // ── Set SSE headers ──────────────────────────────────────────
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // disable nginx buffering if behind proxy
    });

    /** Helper to send an SSE event */
    const emit = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
        const { subjectId } = req.body;

        if (!subjectId) {
            emit({ status: 'Error', message: 'Subject ID is required.' });
            files.forEach(f => fs.unlinkSync(f.path));
            return res.end();
        }

        if (files.length === 0) {
            emit({ status: 'Error', message: 'At least one PDF file is required.' });
            return res.end();
        }

        // 1. Look up the subject
        const subject = await Subject.findById(subjectId);
        if (!subject) {
            emit({ status: 'Error', message: 'Subject not found.' });
            files.forEach(f => fs.unlinkSync(f.path));
            return res.end();
        }

        const assistantRegistrarEmail = await getSetting('assistantRegistrarEmail');
        if (!assistantRegistrarEmail) {
            emit({ status: 'Error', message: 'Assistant Registrar email is not configured.' });
            files.forEach(f => fs.unlinkSync(f.path));
            return res.end();
        }

        // 2. Process each file: Drive upload → Sheet update
        const driveFiles = [];
        const uploadResults = [];

        const subjectFolderId = await getNestedSubjectFolder(subject.name);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const filename = file.originalname;

            try {
                // Step A: Upload to Drive
                emit({ fileIndex: i, filename, status: 'Uploading to Drive...' });

                const driveFile = await uploadFileToDrive(
                    file.path,
                    filename,
                    file.mimetype || 'application/pdf',
                    subjectFolderId
                );
                driveFiles.push(driveFile);

                // Step B: Update Google Sheet
                emit({ fileIndex: i, filename, status: 'Updating Sheet...' });

                let sheetResult;
                try {
                    sheetResult = await updateSurveyStatusInSheet(filename, driveFile.webViewLink);
                } catch (sheetErr) {
                    console.error(`Sheet update error for "${filename}":`, sheetErr.message);
                    sheetResult = { success: false, message: `Error: ${sheetErr.message}` };
                }

                // Step C: Completed
                emit({
                    fileIndex: i,
                    filename,
                    status: 'Completed',
                    sheetStatus: sheetResult.message,
                    link: driveFile.webViewLink
                });

                uploadResults.push({ filename, link: driveFile.webViewLink, sheetStatus: sheetResult.message });

            } catch (fileErr) {
                console.error(`Upload error for "${filename}":`, fileErr.message);
                emit({ fileIndex: i, filename, status: 'Error', message: fileErr.message });
                uploadResults.push({ filename, link: null, sheetStatus: `Error: ${fileErr.message}` });
            }
        }

        // 3. Send email (same logic as uploadAndSend)
        emit({ status: 'Sending Email...' });

        try {
            const attachments = files.map(file => ({
                filename: file.originalname,
                path: file.path
            }));

            const fileListHtml = files.map(f => `<li>${f.originalname}</li>`).join('');

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: assistantRegistrarEmail,
                cc: subject.clerkEmail,
                subject: `MSF reports - ${subject.name} - ${new Date().toISOString().slice(0, 10)}`,
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                            <h2 style="color: #2c3e50; margin-top: 0;">MSF reports - ${subject.name}</h2>
                            <p>Dear Miss,</p>
                            <p>Please find attached the analyzed MSF reports for the subject of <strong>${subject.name}</strong>. Kindly arrange to forward them to the relevant Boards of Study/Specialty Boards.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tr>
                                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; border-radius: 4px 0 0 0;">Subject</td>
                                    <td style="padding: 8px 12px; background: #f1f3f5;">${subject.name}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold;">Files</td>
                                    <td style="padding: 8px 12px; background: #f1f3f5;">
                                        <ul style="margin: 0; padding-left: 20px;">
                                            ${fileListHtml}
                                        </ul>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 12px; background: #e9ecef; font-weight: bold; border-radius: 0 0 0 4px;">Date</td>
                                    <td style="padding: 8px 12px; background: #f1f3f5;">${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</td>
                                </tr>
                            </table>
                            <p>The documents have been attached to this email and uploaded to Google Drive for your records.</p>
                            <p>Thank you.<br>Best regards,<br>K N Dushan</p>
                            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #868e96;">MERC - PGIM - MSF Reports</p>
                        </div>
                    </div>
                `,
                attachments,
            };

            await getTransporter().sendMail(mailOptions);
            console.log(`✅ Email sent successfully for subject "${subject.name}".`);
            emit({ status: 'Email Sent' });
        } catch (emailErr) {
            console.error('Email error:', emailErr.message);
            emit({ status: 'Email Error', message: emailErr.message });
        }

        // 4. Clean up temp files
        files.forEach(file => {
            fs.unlink(file.path, (err) => {
                if (err) console.error('Failed to delete temp file:', err);
                else console.log(`🗑️ Temp file deleted: ${file.path}`);
            });
        });

        // 5. Final event
        emit({ status: 'Done', results: uploadResults });
        res.end();

    } catch (error) {
        console.error('Upload-stream error:', error);
        emit({ status: 'Error', message: error.message });
        // Clean up temp files on error
        files.forEach(file => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
        res.end();
    }
};

// ─── CSV Import/Export ─────────────────────────────────────────

/**
 * GET /api/v1/subjects/export-csv
 * Exports all subjects to a CSV file.
 */
export const exportSubjectsCSV = async (req, res) => {
    try {
        const subjects = await Subject.find().sort({ name: 1 });
        
        // CSV Headers
        let csvContent = "Subject Name,BOS Email\n";
        
        // Add Rows
        subjects.forEach(s => {
            // Escape quotes and wrap in quotes to handle commas in names
            const name = `"${s.name.replace(/"/g, '""')}"`;
            const email = `"${s.clerkEmail.replace(/"/g, '""')}"`;
            csvContent += `${name},${email}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subjects_export.csv');
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ error: 'Failed to export subjects.' });
    }
};

/**
 * POST /api/v1/subjects/import-csv
 * Imports subjects from a CSV file.
 * Skips duplicates (by name) and returns status.
 */
export const importSubjectsCSV = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No CSV file provided.' });
    }

    const results = [];
    const stats = {
        total: 0,
        created: 0,
        skipped: 0,
        skippedNames: [],
        errors: []
    };

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                for (const row of results) {
                    stats.total++;
                    
                    // Handle potential variations in headers (Case insensitive/trimmed)
                    const rawName = row['Subject Name'] || row['subject name'] || row['Name'] || row['name'];
                    const rawEmail = row['BOS Email'] || row['bos email'] || row['Email'] || row['email'] || row['Clerk Email'] || row['clerk email'];

                    if (!rawName || !rawEmail) {
                        stats.errors.push(`Row ${stats.total}: Missing Name or Email`);
                        continue;
                    }

                    const name = rawName.trim();
                    const clerkEmail = rawEmail.trim().toLowerCase();

                    // Check if exists
                    const exists = await Subject.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
                    
                    if (exists) {
                        stats.skipped++;
                        stats.skippedNames.push(name);
                    } else {
                        await Subject.create({ name, clerkEmail });
                        stats.created++;
                    }
                }

                // Cleanup
                fs.unlinkSync(req.file.path);

                res.json({
                    success: true,
                    message: `Import completed: ${stats.created} created, ${stats.skipped} skipped.`,
                    stats
                });
            } catch (error) {
                console.error('Import processing error:', error);
                if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
                res.status(500).json({ error: 'Error processing CSV data.' });
            }
        })
        .on('error', (error) => {
            console.error('CSV Read error:', error);
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            res.status(500).json({ error: 'Failed to read CSV file.' });
        });
};

// ─── Global Settings ──────────────────────────────────────────

/**
 * GET /api/v1/subjects/settings
 * Returns all global settings (currently just assistantRegistrarEmail).
 */
export const getGlobalSettings = async (req, res) => {
    try {
        const assistantRegistrarEmail = await getSetting('assistantRegistrarEmail') || '';
        res.json({ success: true, data: { assistantRegistrarEmail } });
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings.' });
    }
};

/**
 * PUT /api/v1/subjects/settings
 * Updates global settings.
 */
export const updateGlobalSettings = async (req, res) => {
    try {
        const { assistantRegistrarEmail } = req.body;

        if (!assistantRegistrarEmail) {
            return res.status(400).json({ error: 'Assistant Registrar email is required.' });
        }

        await setSetting('assistantRegistrarEmail', assistantRegistrarEmail.trim().toLowerCase());
        res.json({ success: true, message: 'Settings updated successfully.' });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings.' });
    }
};

