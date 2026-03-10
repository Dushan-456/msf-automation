import axios from 'axios';

// SurveyMonkey API Config
const getHeaders = () => ({
    'Authorization': `Bearer ${process.env.SM_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
});

export const processSurveyMonkeyWorkflow = async (data) => {
    const { doctorName, trainerName, specialty, level, emails } = data;
    
    if (!emails || emails.trim() === "") {
        throw new Error(`Data Validation Failed: No email address provided for ${doctorName}`);
    }

    const baseTemplateId = process.env.BASE_TEMPLATE_ID;
    const headers = getHeaders();

    // Step 1: Copy Survey
    const title = `Multisource Feedback Form (MSF) ${doctorName} Trainer - ${trainerName} Specialty - ${specialty} ( ${level} )`;
    const copyRes = await axios.post('https://api.surveymonkey.com/v3/surveys', 
        { from_survey_id: baseTemplateId, title: title }, { headers });
    const newSurveyId = copyRes.data.id;

    let pageId;
    let collectorId;

    try {
        // Step 2: Get Page ID
        const detailsRes = await axios.get(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/details`, { headers });
        pageId = detailsRes.data.pages[0].id;

        // Step 3: Update Page Description
        const descriptionHtml = `<div>${doctorName}<br>Trainer - ${trainerName}<br>Specialty - ${specialty} ( ${level} )</div>`;
        await axios.patch(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/pages/${pageId}`, 
            { description: descriptionHtml }, { headers });

        // Step 4: Create Collector
        const collectorRes = await axios.post(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}/collectors`, 
            { type: "email", name: `MSF Email Invitation 01 - ${doctorName}` }, { headers });
        collectorId = collectorRes.data.id;

        // Step 5: Create Message
        const emailBodyHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:20px;background-color:#f4f5f7;font-family:Arial,sans-serif;"><div style="max-width:600px;margin:0 auto;background:#ffffff;padding:30px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);"><h2 style="color:#2c3e50;text-align:center;margin-top:0;">Multisource Feedback (MSF)</h2><p style="color:#555555;font-size:16px;line-height:1.6;">Hello,</p><p style="color:#555555;font-size:16px;line-height:1.6;">You have been requested to provide anonymous multisource feedback for <strong>${doctorName}</strong>. Your input is highly valued.</p><div style="text-align:center;margin:35px 0;"><a href="[SurveyLink]" style="background-color:#00bf6f;color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:4px;font-size:16px;font-weight:bold;display:inline-block;">Start Survey</a></div><p style="color:#555555;font-size:16px;line-height:1.6;">Thank you for your time and professionalism!</p><hr style="border:none;border-top:1px solid #eeeeee;margin:30px 0;"><div style="text-align:center;font-size:12px;color:#999999;line-height:1.5;"><p>To unsubscribe from these emails, <a href="[OptOutLink]" style="color:#999999;text-decoration:underline;">click here</a>.</p><p>View our <a href="[PrivacyLink]" style="color:#999999;text-decoration:underline;">Privacy Policy</a>.</p>[FooterLink]</div></div></body></html>`;

        const messageRes = await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`, {
            type: "invite",
            subject: title,
            body_text: "Hello, please provide your multisource feedback by clicking here:\n\n[SurveyLink]\n\nThank you!\n\n---\nTo unsubscribe from these emails, click here: [OptOutLink]\nView our Privacy Policy: [PrivacyLink]\n[FooterLink]",
            body_html: emailBodyHtml
        }, { headers });
        const messageId = messageRes.data.id;

        // Step 6: Add Recipients in Bulk
        const cleanEmails = emails.replace(/"/g, '');
        const emailArray = cleanEmails.split(',')
            .map(e => ({ email: e.trim() }))
            .filter(e => e.email !== '');
        const bulkRes = await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/recipients/bulk`, 
            { contacts: emailArray }, { headers });
            
        console.log(`[Bulk Recipients Response given for ${doctorName}]:`, JSON.stringify(bulkRes.data));
        
        // If no recipients succeeded, throw a specific error instead of failing at Step 7
        if (bulkRes.data.succeeded && bulkRes.data.succeeded.length === 0) {
            throw new Error(`Zero recipients were successfully added. Payload response: ${JSON.stringify(bulkRes.data)}`);
        }

        // Step 7: Send the Emails
        await axios.post(`https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/send`, 
            {}, { headers });

    } catch (error) {
        // Simple rollback/cleanup if things fail after survey creation
        console.error(`Error during setup for ${doctorName}, attempting to delete orphaned survey ${newSurveyId}`);
        try {
            await axios.delete(`https://api.surveymonkey.com/v3/surveys/${newSurveyId}`, { headers });
        } catch (deleteError) {
            console.error(`Failed to delete orphaned survey ${newSurveyId}`, deleteError.message);
        }
        throw error;
    }
};
