import fs from 'fs';
import Subject from '../models/Subject.mjs';
import { getSetting, setSetting } from '../models/Settings.mjs';
import { getNestedSubjectFolder, uploadFileToDrive } from '../services/googleDriveService.mjs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Reuse the same Gmail transporter as the existing emailService
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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

        await transporter.sendMail(mailOptions);
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
