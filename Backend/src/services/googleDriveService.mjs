import { google } from 'googleapis';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates an authenticated Google Drive client using OAuth2 Refresh Token.
 */
const getDriveClient = () => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return google.drive({ version: 'v3', auth: oauth2Client });
};

/**
 * Checks if a folder with the given name exists under the specified parent folder.
 * If it exists, returns its ID. Otherwise, creates it and returns the new folder ID.
 *
 * @param {string} parentId - The ID of the parent Google Drive folder.
 * @param {string} folderName - The name of the folder to find or create.
 * @returns {Promise<string>} The folder ID.
 */
export const getOrCreateFolder = async (parentId, folderName) => {
    const drive = getDriveClient();

    // Search for an existing folder with this name under the parent
    const searchRes = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
        console.log(`📁 Found existing folder: "${folderName}" (${searchRes.data.files[0].id})`);
        return searchRes.data.files[0].id;
    }

    // Folder doesn't exist — create it
    const createRes = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        },
        fields: 'id',
        supportsAllDrives: true
    });

    console.log(`📁 Created new folder: "${folderName}" (${createRes.data.id})`);
    return createRes.data.id;
};

/**
 * Orchestrates the nested folder structure:
 *   root → year → month+year → date → subject
 *
 * Example hierarchy:
 *   Root / 2026 / April 2026 / 2026-04-11 / Anatomy
 *
 * @param {string} subjectName - The name of the subject.
 * @returns {Promise<string>} The subject folder ID at the bottom of the tree.
 */
export const getNestedSubjectFolder = async (subjectName) => {
    const rootFolderId = process.env.GDRIVE_ROOT_FOLDER_ID;

    if (!rootFolderId) {
        throw new Error('GDRIVE_ROOT_FOLDER_ID is not set in environment variables.');
    }

    const now = new Date();

    // Level 1: Year folder — e.g. "2026"
    const year = now.getFullYear().toString(); // "2026"
    const yearFolderId = await getOrCreateFolder(rootFolderId, year);

    // Level 2: Month & Year folder — e.g. "April 2026"
    const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
    const monthFolderId = await getOrCreateFolder(yearFolderId, monthYear);

    // Level 3: Date folder — e.g. "2026-04-11"
    const dateStr = now.toISOString().slice(0, 10);
    const dateFolderId = await getOrCreateFolder(monthFolderId, dateStr);

    // Level 4: Subject folder — e.g. "Anatomy"
    const subjectFolderId = await getOrCreateFolder(dateFolderId, subjectName);

    return subjectFolderId;
};

/**
 * Uploads a file to a specific Google Drive folder.
 *
 * @param {string} filePath - Local path to the file to upload.
 * @param {string} fileName - Name to give the file in Google Drive.
 * @param {string} mimeType - The MIME type of the file (e.g., 'application/pdf').
 * @param {string} parentFolderId - The ID of the parent Drive folder.
 * @returns {Promise<Object>} The uploaded file metadata { id, name, webViewLink }.
 */
export const uploadFileToDrive = async (filePath, fileName, mimeType, parentFolderId) => {
    const drive = getDriveClient();

    const res = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [parentFolderId]
        },
        media: {
            mimeType: mimeType,
            body: fs.createReadStream(filePath)
        },
        fields: 'id, name, webViewLink',
        supportsAllDrives: true
    });

    console.log(`📄 Uploaded file: "${res.data.name}" (${res.data.id})`);
    return res.data;
};
