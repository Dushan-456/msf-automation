import axios from "axios";

// SurveyMonkey API Config
const getHeaders = () => ({
  Authorization: `Bearer ${process.env.SM_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
});

export const fetchAllSurveys = async (page = 1, perPage = 20, searchQuery = '') => {
  const headers = getHeaders();
  
  let url = `https://api.surveymonkey.com/v3/surveys?page=${page}&per_page=${perPage}&sort_by=date_modified&sort_order=DESC&include=response_count`;
  
  if (searchQuery && searchQuery.trim() !== '') {
    url += `&title=${encodeURIComponent(searchQuery.trim())}`;
  }

  const res = await axios.get(url, { headers });
  return res.data;
};

export const processSurveyMonkeyWorkflow = async (data) => {
  const { doctorName, trainerName, specialty, level, emails } = data;

  if (!emails || emails.trim() === "") {
    throw new Error(
      `Data Validation Failed: No email address provided for ${doctorName}`,
    );
  }

  const baseTemplateId = process.env.BASE_TEMPLATE_ID;
  const headers = getHeaders();

  // Step 1: Copy Survey
  const title = `Multisource Feedback Form (MSF) ${doctorName} Trainer - ${trainerName} Specialty - ${specialty} ( ${level} )`;
  
  const payload = { from_survey_id: baseTemplateId, title: title };
  if (process.env.TARGET_FOLDER_ID) {
    payload.folder_id = process.env.TARGET_FOLDER_ID;
  }

  const copyRes = await axios.post(
    "https://api.surveymonkey.com/v3/surveys",
    payload,
    { headers },
  );
  const newSurveyId = copyRes.data.id;

  let pageId;
  let collectorId;

  try {
    // Step 2: Get Page ID
    const detailsRes = await axios.get(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/details`,
      { headers },
    );
    pageId = detailsRes.data.pages[0].id;

    // Step 3: Update Page Description
    const descriptionHtml = `<div>${doctorName}<br>Trainer - ${trainerName}<br>Specialty - ${specialty} ( ${level} )</div>`;
    await axios.patch(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/pages/${pageId}`,
      { description: descriptionHtml },
      { headers },
    );

    // Step 4: Create Collector
    const collectorRes = await axios.post(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/collectors`,
      { type: "email", name: `MSF Email Invitation 01 - ${doctorName}` },
      { headers },
    );
    collectorId = collectorRes.data.id;

    // Step 5: Create Message
    const emailBodyHtml = `
                                <!doctype html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                                </head>
                                <body
                                    style="
                                    margin: 0;
                                    padding: 20px;
                                    background-color: #f4f5f7;
                                    font-family: Arial, sans-serif;
                                    "
                                >
                                    <div
                                    style="
                                        max-width: 600px;
                                        margin: 0 auto;
                                        background: #ffffff;
                                        padding: 30px;
                                        border-radius: 8px;
                                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                    "
                                    >
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
                                        style="
                                            background-color: #00bf6f;
                                            color: #ffffff;
                                            padding: 14px 28px;
                                            text-decoration: none;
                                            border-radius: 4px;
                                            font-size: 16px;
                                            font-weight: bold;
                                            display: inline-block;
                                        "
                                        >Start Survey</a
                                        >
                                    </div>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6 ; text-align: center">
                                        Thank you for your time and professionalism!
                                        <br />
                                        Please do not forward this email as its survey link is unique to you.
                                    </p>
                                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0" />
                                    <div
                                        style="
                                        text-align: center;
                                        font-size: 12px;
                                        color: #999999;
                                        line-height: 1.5;
                                        "
                                    >
                                        <p>
                                        To unsubscribe from these emails,
                                        <a
                                            href="[OptOutLink]"
                                            style="color: #999999; text-decoration: underline"
                                            >click here</a
                                        >.
                                        </p>
                                        <p>
                                        View our
                                        <a
                                            href="[PrivacyLink]"
                                            style="color: #999999; text-decoration: underline"
                                            >Privacy Policy</a
                                        >.
                                        </p>
                                        [FooterLink]
                                    </div>
                                    </div>
                                </body>
                                </html>   
                                        `;

    const messageRes = await axios.post(
      `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
      {
        type: "invite",
        subject: title,
        body_text:
          "Hello, please provide your multisource feedback by clicking here:\n\n[SurveyLink]\n\nThank you!\n\n---\nTo unsubscribe from these emails, click here: [OptOutLink]\nView our Privacy Policy: [PrivacyLink]\n[FooterLink]",
        body_html: emailBodyHtml,
      },
      { headers },
    );
    const messageId = messageRes.data.id;

    // Step 6: Add Recipients in Bulk
    const cleanEmails = emails.replace(/"/g, "");
    const emailArray = cleanEmails
      .split(",")
      .map((e) => ({ email: e.trim() }))
      .filter((e) => e.email !== "");
    const bulkRes = await axios.post(
      `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/recipients/bulk`,
      { contacts: emailArray },
      { headers },
    );

    console.log(
      `[Bulk Recipients Response given for ${doctorName}]:`,
      JSON.stringify(bulkRes.data),
    );

    // If no recipients succeeded, throw a specific error instead of failing at Step 7
    if (bulkRes.data.succeeded && bulkRes.data.succeeded.length === 0) {
      throw new Error(
        `Zero recipients were successfully added. Payload response: ${JSON.stringify(bulkRes.data)}`,
      );
    }

    // Step 7: Send the Emails
    await axios.post(
      `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/send`,
      {},
      { headers },
    );
  } catch (error) {
    // Simple rollback/cleanup if things fail after survey creation
    console.error(
      `Error during setup for ${doctorName}, attempting to delete orphaned survey ${newSurveyId}`,
    );
    try {
      await axios.delete(
        `https://api.surveymonkey.com/v3/surveys/${newSurveyId}`,
        { headers },
      );
    } catch (deleteError) {
      console.error(
        `Failed to delete orphaned survey ${newSurveyId}`,
        deleteError.message,
      );
    }
    throw error;
  }
};

/**
 * Sends a reminder to non-respondents for a given survey.
 */
export const sendReminderToNonRespondents = async (surveyId) => {
  const headers = getHeaders();

  // Step 1: Fetch survey to get the doctorName from title
  const surveyRes = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}`,
    { headers }
  );
  const surveyTitle = surveyRes.data.title || "Trainee";
  let doctorName = "the trainee";
  const titlePrefix = "Multisource Feedback Form (MSF)";
  const trainerPrefix = "Trainer -";

  if (surveyTitle.includes(titlePrefix) && surveyTitle.includes(trainerPrefix)) {
    doctorName = surveyTitle.substring(
      surveyTitle.indexOf(titlePrefix) + titlePrefix.length,
      surveyTitle.indexOf(trainerPrefix)
    ).trim();
  } else {
    doctorName = surveyTitle; // Fallback
  }

  // Step 2: Fetch the collector for the given survey ID
  const collectorsRes = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors`,
    { headers }
  );

  if (!collectorsRes.data || collectorsRes.data.data.length === 0) {
    throw new Error(`No collectors found for Survey ID: ${surveyId}`);
  }

  // Grab the first collector's ID
  const collectorId = collectorsRes.data.data[0].id;

  // Step 3: Create a reminder message
  const emailBodyHtml = `
                                <!doctype html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                                </head>
                                <body
                                    style="
                                    margin: 0;
                                    padding: 20px;
                                    background-color: #f4f5f7;
                                    font-family: Arial, sans-serif;
                                    "
                                >
                                    <div
                                    style="
                                        max-width: 600px;
                                        margin: 0 auto;
                                        background: #ffffff;
                                        padding: 30px;
                                        border-radius: 8px;
                                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                    "
                                    >
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
                                        style="
                                            background-color: #00bf6f;
                                            color: #ffffff;
                                            padding: 14px 28px;
                                            text-decoration: none;
                                            border-radius: 4px;
                                            font-size: 16px;
                                            font-weight: bold;
                                            display: inline-block;
                                        "
                                        >Start Survey</a
                                        >
                                    </div>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6 ; text-align: center">
                                        Thank you for your time and professionalism!
                                        <br />
                                        Please do not forward this email as its survey link is unique to you.
                                    </p>
                                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0" />
                                    <div
                                        style="
                                        text-align: center;
                                        font-size: 12px;
                                        color: #999999;
                                        line-height: 1.5;
                                        "
                                    >
                                        <p>
                                        To unsubscribe from these emails,
                                        <a
                                            href="[OptOutLink]"
                                            style="color: #999999; text-decoration: underline"
                                            >click here</a
                                        >.
                                        </p>
                                        <p>
                                        View our
                                        <a
                                            href="[PrivacyLink]"
                                            style="color: #999999; text-decoration: underline"
                                            >Privacy Policy</a
                                        >.
                                        </p>
                                        [FooterLink]
                                    </div>
                                    </div>
                                </body>
                                </html>   
                                        `;

  const createMessageRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
    {
      type: "reminder",
      recipient_status: "has_not_responded",
      subject: `Gentle Reminder: - ${surveyTitle}`,
      body_text:
        "Hello, please provide your multisource feedback by clicking here:\n\n[SurveyLink]\n\nThank you!\n\n---\nTo unsubscribe from these emails, click here: [OptOutLink]\nView our Privacy Policy: [PrivacyLink]\n[FooterLink]",
      body_html: emailBodyHtml,
    },
    { headers },
  );

  const messageId = createMessageRes.data.id;

  // Step 4: Actually send the reminder
  const sendRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/send`,
    {},
    { headers }
  );

  return sendRes.data;
};
