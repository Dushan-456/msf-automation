import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates an authenticated Google Sheets client using OAuth2 Refresh Token.
 * Uses the same credentials as the Drive service.
 */
const getSheetsClient = () => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return google.sheets({ version: 'v4', auth: oauth2Client });
};

/**
 * Parses a PDF filename to extract doctor name, specialty, and level.
 * Handles optional SLMC number in the middle.
 *
 * Examples:
 *   "Dr. Y.A.I.P Wijerathna - Clinical Nutrition (Pre MD).pdf"
 *   "Dr. W.K.R.K.Ranaweera - SLMC - 29182  - Cardiothoracic surgery ( Post MD ).pdf"
 *
 * @param {string} filename - The original PDF filename.
 * @returns {{ name: string, specialty: string, level: string } | null}
 */
const parseFilename = (filename) => {
    try {
        // 1. Extract Level
        const levelMatch = filename.match(/\(\s*(.*?)\s*\)\.pdf/i);
        if (!levelMatch) return null;
        const level = levelMatch[1].trim();

        // 2. Remove 'Dr.' prefix and Level suffix to isolate the middle part
        let middle = filename.replace(/Dr\.?\s*/i, '').replace(/\(\s*.*?\s*\)\.pdf/i, '');

        // 3. Split by hyphen
        const parts = middle.split('-').map(p => p.trim()).filter(Boolean);

        if (parts.length < 2) return null;

        const name = parts[0];
        const specialty = parts[parts.length - 1]; // Specialty is always the last part before Level

        return { name, specialty, level };
    } catch (error) {
        return null;
    }
};

/**
 * Finds the matching row in the Google Sheet and updates Status (Col H)
 * to "Completed" and pastes the Drive link into Col I (Analyzed Report).
 *
 * Sheet columns:
 *   A (Res. ID) | B (Name) | C (Specialty) | D (Email) | E (SLMC No)
 *   F (Level) | G (Trainers name) | H (Status) | I (Analyzed Report)
 *
 * @param {string} filename  - The original PDF filename (used to extract name/specialty/level).
 * @param {string} driveLink - The Google Drive webViewLink to paste into Col I.
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const updateSurveyStatusInSheet = async (filename, driveLink) => {
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        if (!sheetId) {
            return { success: false, message: 'GOOGLE_SHEET_ID is not set in environment variables.' };
        }

        // 1. Parse the filename
        const parsed = parseFilename(filename);
        if (!parsed) {
            console.warn(`⚠️ Could not parse filename: "${filename}"`);
            return { success: false, message: `Could not parse filename: "${filename}"` };
        }

        console.log(`🔍 Parsed filename → Name: "${parsed.name}", Specialty: "${parsed.specialty}", Level: "${parsed.level}"`);

        const sheets = getSheetsClient();
        const sheetName = process.env.GOOGLE_SHEET_TAB_NAME || 'Sheet1';

        // 2. Fetch rows A:F
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `'${sheetName}'!A:F`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.warn('⚠️ Google Sheet is empty or has no data.');
            return { success: false, message: 'Sheet is empty or has no data.' };
        }

        // 4. Find ALL matching rows (skip header row at index 0)
        const matchedIndices = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const colB = (row[1] || '').trim().toLowerCase(); // Name
            const colC = (row[2] || '').trim().toLowerCase(); // Specialty
            const colF = (row[5] || '').trim().toLowerCase(); // Level

            const nameMatch = colB === parsed.name.trim().toLowerCase();
            const specialtyMatch = colC === parsed.specialty.trim().toLowerCase();
            const levelMatch = colF === parsed.level.trim().toLowerCase();

            if (nameMatch && specialtyMatch && levelMatch) {
                matchedIndices.push(i);
            }
        }

        if (matchedIndices.length === 0) {
            console.warn(`⚠️ No matching row found for: Name="${parsed.name}", Specialty="${parsed.specialty}", Level="${parsed.level}"`);
            return { success: false, message: 'Row not found' };
        }

        // 5. Update only the FIRST matched row
        const firstIndex = matchedIndices[0];
        const rowNumber = firstIndex + 1;

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `'${sheetName}'!H${rowNumber}:I${rowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Completed', driveLink]]
            }
        });

        // 6. Return status with duplicate warning if applicable
        if (matchedIndices.length > 1) {
            const dupCount = matchedIndices.length - 1;
            const dupRows = matchedIndices.slice(1).map(i => i + 1).join(', ');
            console.warn(`⚠️ Duplicate found! Updated Row ${rowNumber}, but ${dupCount} duplicate(s) skipped (Rows: ${dupRows})`);
            return { success: true, message: `Duplicate found - Updated Row ${rowNumber} (${dupCount} duplicate skipped)` };
        }

        console.log(`✅ Sheet updated → Row ${rowNumber}: Status="Completed", Link="${driveLink}"`);
        return { success: true, message: `Updated correctly (Row ${rowNumber})` };

    } catch (error) {
        console.error('❌ Google Sheets update error:', error.message);
        return { success: false, message: `Error: ${error.message}` };
    }
};
