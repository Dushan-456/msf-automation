import express from 'express';  
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Setup Multer to save uploaded files to a temporary 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// SurveyMonkey API Config
const headers = {
    'Authorization': `Bearer ${process.env.SM_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};

// --- ENDPOINT: Upload CSV and trigger automation ---
app.post('/api/v1/automate-surveys', upload.single('csvFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });

    const results = [];

    // Parse the CSV
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`Successfully parsed ${results.length} rows. Starting automation...`);
            
            // Loop through each doctor in the CSV
            for (const row of results) {
                try {
                    await processSurveyMonkeyWorkflow(row);
                    console.log(`✅ Success: ${row.doctorName}`);
                } catch (error) {
                    console.error(`❌ Failed: ${row.doctorName}`, error.response ? error.response.data : error.message);
                }
            }

            // Cleanup: Delete the temp CSV file
            fs.unlinkSync(req.file.path);
            
            res.json({ message: "Automation complete! Check terminal for details." });
        });
});

// --- CORE LOGIC: The 7-Step API Workflow ---
async function processSurveyMonkeyWorkflow(data) {
    const { doctorName, trainerName, specialty, level, emails } = data;
    const baseTemplateId = process.env.BASE_TEMPLATE_ID;

    // Step 1: Copy Survey
    const title = `Multisource Feedback Form (MSF) ${doctorName} Trainer - ${trainerName} Specialty - ${specialty} ( ${level} )`;
    const copyRes = await axios.post('https://api.surveymonkey.com/v3/surveys', 
        { from_survey_id: baseTemplateId, title: title }, { headers });
    const newSurveyId = copyRes.data.id;

    // Step 2: Get Page ID
    const detailsRes = await axios.get(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/details`, { headers });
    const pageId = detailsRes.data.pages[0].id;

    // Step 3: Update Page Description
    const descriptionHtml = `<div>${doctorName}<br>Trainer - ${trainerName}<br>Specialty - ${specialty} ( ${level} )</div>`;
    await axios.patch(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/pages/${pageId}`, 
        { description: descriptionHtml }, { headers });

    // Step 4: Create Collector
    const collectorRes = await axios.post(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/collectors`, 
        { type: "email", name: `MSF Email Invitation 01 - ${doctorName}` }, { headers });
    const collectorId = collectorRes.data.id;

    // Step 5: Create Message (with HTML formatting)
    const emailBodyHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:20px;background-color:#f4f5f7;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"><h2 style="color:#2c3e50;text-align:center;margin-top:0;">Multisource Feedback (MSF)</h2><p style="color:#555555;font-size:16px;line-height:1.6;">Hello,</p><p style="color:#555555;font-size:16px;line-height:1.6;">You have been requested to provide anonymous multisource feedback for <strong>${doctorName}</strong>. Your input is highly valued.</p><div style="text-align:center;margin:35px 0;"><a href="[SurveyLink]" style="background-color:#00bf6f;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:4px;font-size:16px;font-weight:bold;display:inline-block;">Start Survey</a></div><p style="color:#555555;font-size:16px;line-height:1.6;">Thank you for your time and professionalism!</p><hr style="border:none;border-top:1px solid #eeeeee;margin:30px 0;"><div style="text-align:center;font-size:12px;color:#999999;line-height:1.5;"><p>To unsubscribe from these emails, <a href="[OptOutLink]" style="color:#999999;text-decoration:underline;">click here</a>.</p><p>View our <a href="[PrivacyLink]" style="color:#999999;text-decoration:underline;">Privacy Policy</a>.</p>[FooterLink]</div></div></body></html>`;

    const messageRes = await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`, {
        type: "invite",
        subject: title,
        body_text: "Hello, please provide your multisource feedback by clicking here:\n\n[SurveyLink]\n\nThank you!\n\n---\nTo unsubscribe from these emails, click here: [OptOutLink]\nView our Privacy Policy: [PrivacyLink]\n[FooterLink]",
        body_html: emailBodyHtml
    }, { headers });
    const messageId = messageRes.data.id;

    // Step 6: Add Recipients in Bulk
    // Splits the comma-separated string from the CSV into an array of objects
    const emailArray = emails.split(',').map(e => ({ email: e.trim() }));
    await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/recipients/bulk`, 
        { contacts: emailArray }, { headers });

    // Step 7: Send the Emails
    await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/send`, 
        {}, { headers });
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));