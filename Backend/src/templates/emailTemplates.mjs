/**
 * Shared email HTML templates for SurveyMonkey invite and reminder messages.
 * Eliminates the duplicated 100-line template in surveyMonkeyService.mjs.
 */

/**
 * Returns the HTML body for survey invite/reminder emails.
 * @param {string} doctorName - The doctor's name to display in the email.
 * @returns {string} Full HTML email body string.
 */
export const getSurveyEmailHtml = (doctorName) => `
<!doctype html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 20px; background-color: #f4f5f7; font-family: Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <img
            src="https://pgim.cmb.ac.lk/wp-content/uploads/2016/07/msf-email-logo.png"
            alt="PGIM Logo"
            style="width: 100%; height: auto"
        />
        <h2 style="color: #2c3e50; text-align: center; margin-top: 0">
            PGIM - Multisource Feedback (MSF) - <strong>${doctorName}</strong>
        </h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6">
            Dear Sir/Madam,
        </p>
        <p style="color: #555555; font-size: 16px; line-height: 1.6">
            On the recommendation of the AAAEC, the Board of Management of the PGIM
            and the Senate of the University of Colombo have approved the
            implementation of an online MSF submission system in parallel to the
            manual process for all postgraduate trainees of the PGIM. As a result,
            the process of submitting and analysing the multi-source feedback
            (formerly known as the Peer Team Rating forms) has been changed.
            According to the guidelines, an MD trainee is expected to complete two
            rounds of MSF, once prior to the MD exam and once during the post MD
            training. The relevant trainee should nominate 15 rators for that.
            <br />
            PGIM trainee <strong>${doctorName}</strong> has nominated you as one
            rator for this purpose. Therefore, I kindly request you to fill the MSF
            form using the below link.
        </p>
        <div style="text-align: center; margin: 35px 0">
            <a
                href="[SurveyLink]"
                style="background-color: #00bf6f; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;"
            >Start Survey</a>
        </div>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; text-align: center">
            Thank you for your time and professionalism!
            <br />
            Please do not forward this email as its survey link is unique to you.
        </p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0" />
        <div style="text-align: center; font-size: 12px; color: #999999; line-height: 1.5;">
            <p>
                To unsubscribe from these emails,
                <a href="[OptOutLink]" style="color: #999999; text-decoration: underline">click here</a>.
            </p>
            <p>
                View our
                <a href="[PrivacyLink]" style="color: #999999; text-decoration: underline">Privacy Policy</a>.
            </p>
            [FooterLink]
        </div>
    </div>
</body>
</html>`;

/**
 * Plain text version of the survey email.
 * @param {string} doctorName - The doctor's name.
 * @returns {string} Plain text email body.
 */
export const getSurveyEmailText = (doctorName) =>
    `Dear Sir/Madam, On the recommendation of the AAAEC, the Board of Management of the PGIM and the Senate of the University of Colombo have approved the implementation of an online MSF submission system in parallel to the manual process for all postgraduate trainees of the PGIM. As a result, the process of submitting and analysing the multi-source feedback (formerly known as the Peer Team Rating forms) has been changed. According to the guidelines, an MD trainee is expected to complete two rounds of MSF, once prior to the MD exam and once during the post MD training. The relevant trainee should nominate 15 rators for that. PGIM trainee ${doctorName} has nominated you as one rator for this purpose. Therefore, I kindly request you to fill the MSF form using the below link.:\n\n[SurveyLink]\n\nThank you!\n\n---\nTo unsubscribe from these emails, click here: [OptOutLink]\nView our Privacy Policy: [PrivacyLink]\n[FooterLink]`;
