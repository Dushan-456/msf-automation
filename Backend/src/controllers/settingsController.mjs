import asyncHandler from '../middleware/asyncHandler.mjs';
import Settings, { getSetting, setSetting } from '../models/Settings.mjs';
import { getSurveyEmailHtml, getSurveyEmailText } from '../templates/emailTemplates.mjs';

/**
 * GET /api/v1/settings/email
 * Returns current email format setting and both templates.
 */
export const getEmailSettings = asyncHandler(async (req, res) => {
    const format = await getSetting('email_format') || 'text';
    const bodyHtml = await getSetting('email_body_html') || null;
    const bodyText = await getSetting('email_body_text') || null;

    res.json({
        format,
        bodyHtml: bodyHtml || getSurveyEmailHtml('[DoctorName]'),
        bodyText: bodyText || getSurveyEmailText('[DoctorName]'),
        isDefaultHtml: !bodyHtml,
        isDefaultText: !bodyText,
    });
});

/**
 * PUT /api/v1/settings/email
 * Saves email format, body_html template, and body_text template.
 * Body: { format: 'html' | 'text', bodyHtml?: string, bodyText?: string }
 */
export const updateEmailSettings = asyncHandler(async (req, res) => {
    const { format, bodyHtml, bodyText } = req.body;

    if (!format || !['html', 'text'].includes(format)) {
        return res.status(400).json({ error: "Invalid format. Must be 'html' or 'text'." });
    }

    await setSetting('email_format', format);

    if (bodyHtml !== undefined && bodyHtml.trim() !== '') {
        await setSetting('email_body_html', bodyHtml);
    }
    if (bodyText !== undefined && bodyText.trim() !== '') {
        await setSetting('email_body_text', bodyText);
    }

    res.json({ success: true, message: 'Email settings saved successfully.' });
});

/**
 * DELETE /api/v1/settings/email/reset/:template
 * Resets email templates to built-in defaults by removing DB overrides.
 * :template = 'html' | 'text' | 'all'
 */
export const resetEmailTemplate = asyncHandler(async (req, res) => {
    const { template } = req.params;

    if (!['html', 'text', 'all'].includes(template)) {
        return res.status(400).json({ error: "Invalid template. Use 'html', 'text', or 'all'." });
    }

    if (template === 'html' || template === 'all') {
        await Settings.deleteOne({ key: 'email_body_html' });
    }
    if (template === 'text' || template === 'all') {
        await Settings.deleteOne({ key: 'email_body_text' });
    }

    res.json({ success: true, message: `${template} template reset to default.` });
});

/**
 * POST /api/v1/settings/email/test-html
 * Tests whether the current SurveyMonkey API token supports custom body_html.
 * Creates a draft message (no recipients → no email sent), checks result, deletes it.
 * Returns: { supported: boolean, message: string, detail?: string }
 */
export const testHtmlSupport = asyncHandler(async (req, res) => {
    // Dynamically import axios and the token helper to avoid circular deps
    const axios = (await import('axios')).default;
    const ApiToken = (await import('../models/ApiToken.mjs')).default;

    const activeTokenDoc = await ApiToken.findOne({ isActive: true });
    const token = activeTokenDoc ? activeTokenDoc.token : process.env.SM_ACCESS_TOKEN;

    if (!token) {
        return res.json({
            supported: false,
            message: 'No SurveyMonkey API token configured.',
            detail: 'Add a token in API Token Settings first.',
        });
    }

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // Step 1: Find the first available survey
    let surveyId, collectorId;
    try {
        const surveysRes = await axios.get(
            'https://api.surveymonkey.com/v3/surveys?per_page=5&sort_by=date_modified&sort_order=DESC',
            { headers }
        );
        const surveys = surveysRes.data?.data || [];
        if (surveys.length === 0) {
            return res.json({
                supported: false,
                message: 'No surveys found in your SurveyMonkey account.',
                detail: 'Create at least one survey to run this test.',
            });
        }
        surveyId = surveys[0].id;
    } catch (err) {
        return res.json({
            supported: false,
            message: 'Could not fetch surveys from SurveyMonkey.',
            detail: err.response?.data?.error?.message || err.message,
        });
    }

    // Step 2: Find an email-type collector for that survey
    try {
        const collectorsRes = await axios.get(
            `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors?per_page=20&include=type,status`,
            { headers }
        );
        const collectors = collectorsRes.data?.data || [];
        const emailCollector = collectors.find(c => c.type === 'email');
        if (!emailCollector) {
            return res.json({
                supported: false,
                message: 'No email collector found on the most recent survey.',
                detail: 'This test requires at least one email-type collector. Create one in SurveyMonkey.',
            });
        }
        collectorId = emailCollector.id;
    } catch (err) {
        return res.json({
            supported: false,
            message: 'Could not fetch collectors from SurveyMonkey.',
            detail: err.response?.data?.error?.message || err.message,
        });
    }

    // Step 3: Try to create a draft message with body_html
    const testHtml = `<html><body>
        <p>HTML Support Test [SurveyLink]</p>
        <p><a href="[OptOutLink]">Unsubscribe</a> | <a href="[PrivacyLink]">Privacy</a></p>
        [FooterLink]
    </body></html>`;

    let testMessageId = null;
    try {
        const msgRes = await axios.post(
            `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
            {
                type: 'reminder',
                recipient_status: 'has_not_responded',
                subject: '[HTML Support Test - Auto Delete]',
                body_html: testHtml,
                body_text: 'HTML Support Test [SurveyLink] [OptOutLink] [PrivacyLink] [FooterLink]',
            },
            { headers }
        );
        testMessageId = msgRes.data?.id;
    } catch (err) {
        const smError = err.response?.data?.error;
        return res.json({
            supported: false,
            message: 'HTML emails are NOT supported on your current SurveyMonkey plan.',
            detail: smError?.message || err.message,
            errorCode: smError?.id,
            httpStatus: err.response?.status,
        });
    }

    // Step 4: Cleanup — delete the test message immediately
    if (testMessageId) {
        try {
            await axios.delete(
                `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${testMessageId}`,
                { headers }
            );
        } catch (_) {
            // Cleanup failure is non-critical — ignore
        }
    }

    return res.json({
        supported: true,
        message: 'HTML emails are supported on your SurveyMonkey plan!',
        detail: `Test passed using collector ${collectorId} on survey ${surveyId}.`,
    });
});
