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
 * Handles optional SLMC number in the middle and edge cases like spaces before .pdf.
 *
 * Examples:
 *   "Dr. Y.A.I.P Wijerathna - Clinical Nutrition (Pre MD).pdf"
 *   "Dr. W.K.R.K.Ranaweera - SLMC - 29182  - Cardiothoracic surgery ( Post MD ).pdf"
 *   "Dr. Dushan Kasun Sampatha - Family Medicine (Pre MD) .pdf"
 *   "Dr Prasangi Madubhashini Peiris  - SLMC - 25682   - Oral _ Maxillofacial Surgery (Post MD).pdf"
 *
 * @param {string} filename - The original PDF filename.
 * @returns {{ name: string, specialty: string, level: string } | null}
 */
const parseFilename = (filename) => {
    try {
        console.log(`\n--- Parsing Filename: "${filename}" ---`);
        // 1. Extract Level (the last content inside parentheses before optional .pdf)
        const levelMatch = filename.match(/\(\s*(.*?)\s*\)(?:\s*\.pdf)?\s*$/i);
        if (!levelMatch) {
            console.log('❌ Failed to extract Level. Filename must end with (Level).pdf or (Level)');
            return null;
        }
        const level = levelMatch[1].trim();
        console.log(`✅ Extracted Level: "${level}"`);

        // 2. Remove 'Dr.' or 'Dr ' prefix
        let middle = filename.replace(/^Dr[\.\s]\s*/i, '');
        
        // 3. Remove the Level suffix (including the parentheses and .pdf)
        middle = middle.replace(/\(\s*.*?\s*\)(?:\s*\.pdf)?\s*$/i, '');
        console.log(`✅ Middle segment after stripping prefix/suffix: "${middle}"`);

        // 4. Split by hyphen
        const parts = middle.split('-').map(p => p.trim()).filter(Boolean);
        console.log(`✅ Parts separated by hyphen:`, parts);

        if (parts.length < 2) {
            console.log('❌ Failed to extract Name and Specialty. Expected at least one hyphen (-) in the middle segment.');
            return null;
        }

        const name = parts[0];
        const specialty = parts[parts.length - 1]; // Specialty is always the last part before Level

        console.log(`✅ Final Parsed -> Name: "${name}", Specialty: "${specialty}", Level: "${level}"`);
        return { name, specialty, level };
    } catch (error) {
        console.error('❌ Error parsing filename:', error);
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

        // Helper function to remove all spaces, dots, hyphens, underscores, and ampersands for a robust comparison
        const normalizeForCompare = (str) => (str || '').toLowerCase().replace(/[\s\._\-&]/g, '');

        const normParsedName = normalizeForCompare(parsed.name);
        const normParsedSpecialty = normalizeForCompare(parsed.specialty);
        const normParsedLevel = normalizeForCompare(parsed.level);

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Clean the sheet name by removing the 'Dr.' prefix (just like we did for the filename)
            const sheetNameRaw = (row[1] || '').replace(/^Dr[\.\s]\s*/i, '');
            const colB = sheetNameRaw; // Name
            const colC = row[2]; // Specialty
            const colF = row[5]; // Level

            const nameMatch = normalizeForCompare(colB) === normParsedName;
            const specialtyMatch = normalizeForCompare(colC) === normParsedSpecialty;
            const levelMatch = normalizeForCompare(colF) === normParsedLevel;

            if (nameMatch && specialtyMatch && levelMatch) {
                matchedIndices.push(i);
            }
        }

        if (matchedIndices.length === 0) {
            console.warn(`⚠️ No matching row found for: Name="${parsed.name}", Specialty="${parsed.specialty}", Level="${parsed.level}"`);
            
            // DIAGNOSTIC LOGGING: Try to find "close" matches to help debug
            console.log('--- DIAGNOSTIC: Looking for close matches in the sheet ---');
            let closeMatchFound = false;
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                const sheetNameRaw = row[1] || '';
                const sheetSpecialtyRaw = row[2] || '';
                const sheetLevelRaw = row[5] || '';
                
                const normSheetName = normalizeForCompare(sheetNameRaw);
                const normSheetSpecialty = normalizeForCompare(sheetSpecialtyRaw);
                const normSheetLevel = normalizeForCompare(sheetLevelRaw);
                
                // If the names match exactly OR if one contains the other (partial name match)
                if (normSheetName === normParsedName || (normSheetName.length > 5 && (normParsedName.includes(normSheetName) || normSheetName.includes(normParsedName)))) {
                    console.log(`\n🔍 CLOSE MATCH FOUND AT ROW ${i + 1}:`);
                    console.log(`  File Data  -> Name: "${parsed.name}", Specialty: "${parsed.specialty}", Level: "${parsed.level}"`);
                    console.log(`  Sheet Data -> Name: "${sheetNameRaw}", Specialty: "${sheetSpecialtyRaw}", Level: "${sheetLevelRaw}"`);
                    console.log(`  Mismatches:`);
                    if (normSheetName !== normParsedName) console.log(`    - Name mismatch (Normalized: "${normParsedName}" vs "${normSheetName}")`);
                    if (normSheetSpecialty !== normParsedSpecialty) console.log(`    - Specialty mismatch (Normalized: "${normParsedSpecialty}" vs "${normSheetSpecialty}")`);
                    if (normSheetLevel !== normParsedLevel) console.log(`    - Level mismatch (Normalized: "${normParsedLevel}" vs "${normSheetLevel}")`);
                    closeMatchFound = true;
                }
            }
            if (!closeMatchFound) {
                console.log(`❌ No close matches found for Name "${parsed.name}" in the entire sheet.`);
            }
            console.log('----------------------------------------------------------');

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
