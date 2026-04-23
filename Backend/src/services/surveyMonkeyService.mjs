import axios from "axios";
import { getSurveyEmailHtml, getSurveyEmailText } from '../templates/emailTemplates.mjs';
import ApiToken from '../models/ApiToken.mjs';

// SurveyMonkey API Config
const getHeaders = async () => {
  // Try to find the active token in the database
  const activeTokenDoc = await ApiToken.findOne({ isActive: true });
  const token = activeTokenDoc ? activeTokenDoc.token : process.env.SM_ACCESS_TOKEN;

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const fetchAllSurveys = async (page = 1, perPage = 20, searchQuery = '') => {
  const headers = await getHeaders();
  
  let url = `https://api.surveymonkey.com/v3/surveys?page=${page}&per_page=${perPage}&sort_by=date_modified&sort_order=DESC&include=response_count`;
  
  if (searchQuery && searchQuery.trim() !== '') {
    url += `&title=${encodeURIComponent(searchQuery.trim())}`;
  }

  const res = await axios.get(url, { headers });
  return res.data;
};

export const processSurveyMonkeyWorkflow = async (data, onProgress = null) => {
  const { doctorName, trainerName, specialty, level, emails, slmc } = data;

  if (!emails || emails.trim() === "") {
    throw new Error(
      `Data Validation Failed: No email address provided for ${doctorName}`,
    );
  }

  const baseTemplateId = process.env.BASE_TEMPLATE_ID;
  const headers = await getHeaders();

  // Step 1: Copy Survey
  if (onProgress) onProgress("Copying Survey...");
  const title = `Multisource Feedback Form (MSF) ${doctorName} - SLMC - ${slmc || ''} Trainer - ${trainerName} Specialty - ${specialty} ( ${level} )`;
  
  const payload = { from_survey_id: baseTemplateId, title: title };
  if (process.env.TO_BE_ANALYZE_FOLDER_ID) {
    payload.folder_id = process.env.TO_BE_ANALYZE_FOLDER_ID;
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
    if (onProgress) onProgress("Configuring Survey Details...");
    const detailsRes = await axios.get(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/details`,
      { headers },
    );
    pageId = detailsRes.data.pages[0].id;

    // Step 3: Update Page Description
    const descriptionHtml = `<div>${doctorName}<br>SLMC - ${slmc || ''}<br>Trainer - ${trainerName}<br>Specialty - ${specialty} ( ${level} )</div>`;
    await axios.patch(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/pages/${pageId}`,
      { description: descriptionHtml },
      { headers },
    );

    // Step 4: Create Collector
    if (onProgress) onProgress("Creating Invitation Collector...");
    const collectorRes = await axios.post(
      `https://api.surveymonkey.com/v3/surveys/${newSurveyId}/collectors`,
      { type: "email", name: `MSF Email Invitation 01 - ${doctorName}` },
      { headers },
    );
    collectorId = collectorRes.data.id;

    // Step 5: Create Message
    const emailBodyHtml = getSurveyEmailHtml(doctorName);

    const messageRes = await axios.post(
      `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
      {
        type: "invite",
        subject: title,
        body_text: getSurveyEmailText(doctorName),
        body_html: emailBodyHtml,
      },
      { headers },
    );
    const messageId = messageRes.data.id;

    // Step 6: Add Recipients in Bulk
    if (onProgress) onProgress("Adding Recipients...");
    const cleanEmails = emails.replace(/"/g, "");
    const emailArray = cleanEmails
      .split(/[;,]/)
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
    if (onProgress) onProgress("Sending Invitations...");
    await axios.post(
      `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${messageId}/send`,
      {},
      { headers },
    );
    if (onProgress) onProgress("Almost Done...");
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
export const sendReminderToNonRespondents = async (surveyId, surveyTitleFromClient = null) => {
  const headers = await getHeaders();

  // Use the title from the client if provided, otherwise fetch from SM API (1 API call)
  let surveyTitle;
  if (surveyTitleFromClient) {
    surveyTitle = surveyTitleFromClient;
  } else {
    const surveyRes = await axios.get(
      `https://api.surveymonkey.com/v3/surveys/${surveyId}`,
      { headers }
    );
    surveyTitle = surveyRes.data.title || "Trainee";
  }

  let doctorName = "the trainee";
  const titlePrefix = "Multisource Feedback Form (MSF)";
  const trainerPrefix = "Trainer -";

  if (surveyTitle.includes(titlePrefix) && surveyTitle.includes(trainerPrefix)) {
    let rawNameSegment = surveyTitle.substring(
      surveyTitle.indexOf(titlePrefix) + titlePrefix.length,
      surveyTitle.indexOf(trainerPrefix)
    ).trim();
    
    // Further cleanup: Strip off the "- SLMC - ..." part if it exists in the extracted segment
    const slmcMarker = " - SLMC -";
    if (rawNameSegment.includes(slmcMarker)) {
      doctorName = rawNameSegment.split(slmcMarker)[0].trim();
    } else {
      doctorName = rawNameSegment;
    }
  } else {
    // If it's a legacy title or doesn't match the new pattern exactly, try to be smart
    doctorName = surveyTitle.replace(titlePrefix, "").split(trainerPrefix)[0].trim() || "the trainee";
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
  const emailBodyHtml = getSurveyEmailHtml(doctorName);

  const createMessageRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
    {
      type: "reminder",
      recipient_status: "has_not_responded",
      subject: `Gentle Reminder: - ${surveyTitle}`,
      body_text: getSurveyEmailText(doctorName),
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

/**
 * Fetches all email collectors for a given survey.
 * Returns an array of { id, name, type, status } objects.
 */
export const fetchSurveyCollectors = async (surveyId) => {
  const headers = await getHeaders();
  const res = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors?per_page=50`,
    { headers }
  );
  const raw = res.data?.data || [];
  return raw.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
  }));
};

/**
 * Fetches recipient tracking data for a specific collector ID.
 * SM list endpoints omit status fields; we fetch each recipient individually
 * (in parallel) from /collectors/{id}/recipients/{recipientId} which includes
 * `status` and `survey_response_status`.
 */
export const fetchRecipientTrackingByCollector = async (collectorId) => {
  const headers = await getHeaders();

  // Step 1: Get the recipient ID list from the collector (up to 100)
  const listRes = await axios.get(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/recipients?per_page=100`,
    { headers }
  );

  const recipientList = listRes.data?.data || [];

  if (recipientList.length === 0) {
    return [];
  }

  // Step 2: Fetch each recipient's full detail record in parallel.
  // The individual endpoint includes `status` and `survey_response_status`.
  const detailRequests = recipientList.slice(0, 50).map((r) =>
    axios
      .get(`https://api.surveymonkey.com/v3/collectors/${collectorId}/recipients/${r.id}`, { headers })
      .then((res) => res.data)
      .catch(() => ({ id: r.id, email: r.email, status: null, survey_response_status: null }))
  );

  const details = await Promise.all(detailRequests);

  return details.map((item) => ({
    email: item.email,
    email_status: item.mail_status,
    response_status: item.survey_response_status,
  }));
};

/**
 * Fetches recipient tracking data (email + response status) for a given survey.
 * Always uses the first collector — kept for backwards-compat with reminders flow.
 */
export const fetchRecipientTracking = async (surveyId) => {
  const headers = await getHeaders();

  const collectorsRes = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors`,
    { headers }
  );

  if (!collectorsRes.data || collectorsRes.data.data.length === 0) {
    throw new Error(`No collectors found for Survey ID: ${surveyId}`);
  }

  const collectorId = collectorsRes.data.data[0].id;
  return fetchRecipientTrackingByCollector(collectorId);
};

/**
 * Fetches surveys from the 'Ready for Analysis' folder (ID 2452482)
 * and filters for response_count >= 12.
 */
export const fetchReadySurveys = async (page = 1, perPage = 50) => {
  const headers = await getHeaders();
  const folderId = process.env.TO_BE_ANALYZE_FOLDER_ID || "2452482";
  
  let allSurveys = [];
  let currentSmPage = 1;
  let hasMore = true;
  
  const targetEligibleCount = page * perPage;

  // Fetch using native num_responses sorting so highest responses come first
  while (hasMore) {
    const url = `https://api.surveymonkey.com/v3/surveys?page=${currentSmPage}&per_page=100&folder_id=${folderId}&sort_by=num_responses&sort_order=DESC&include=response_count`;
    const res = await axios.get(url, { headers });
    
    const batch = res.data?.data || [];
    
    for (const survey of batch) {
      if (survey.response_count >= 12) {
        allSurveys.push(survey);
      } else {
        // Since the API returns surveys sorted by num_responses DESC,
        // if we encounter one with < 12 responses, all subsequent ones will also have < 12.
        // We can safely stop fetching more pages to save API requests.
        hasMore = false;
        break;
      }
    }
    
    // Stop early if we already have enough eligible surveys for the requested page
    if (hasMore && allSurveys.length >= targetEligibleCount) {
      hasMore = false;
    } else if (hasMore && batch.length < 100) {
      // Stop if we hit the end of the folder
      hasMore = false;
    } else if (hasMore) {
      currentSmPage++;
    }
  }
  
  // They should already be natively sorted, but we keep this to be absolutely certain
  allSurveys.sort((a, b) => b.response_count - a.response_count);
  
  const startIndex = (page - 1) * perPage;
  const paginatedSurveys = allSurveys.slice(startIndex, startIndex + perPage);
  
  return paginatedSurveys;
};

/**
 * Fetches all surveys from the 'To Be Analyzed' folder (TO_BE_ANALYZE_FOLDER_ID).
 * Returns all surveys sorted by response_count DESC with pagination.
 */
export const fetchToBeAnalyzedSurveys = async (page = 1, perPage = 20) => {
  const headers = await getHeaders();
  const folderId = process.env.TO_BE_ANALYZE_FOLDER_ID || "2452482";

  const url = `https://api.surveymonkey.com/v3/surveys?page=${page}&per_page=${perPage}&folder_id=${folderId}&sort_by=num_responses&sort_order=DESC&include=response_count`;
  const res = await axios.get(url, { headers });

  return res.data;
};

/**
 * Fetches surveys from the 'Analyzed / Completed' folder (ANALYZED_FOLDER_ID).
 * Returns all surveys sorted by response_count DESC with pagination.
 */
export const fetchCompletedSurveys = async (page = 1, perPage = 20) => {
  const headers = await getHeaders();
  const folderId = process.env.ANALYZED_FOLDER_ID || "2451474";

  const url = `https://api.surveymonkey.com/v3/surveys?page=${page}&per_page=${perPage}&folder_id=${folderId}&sort_by=num_responses&sort_order=DESC&include=response_count`;
  const res = await axios.get(url, { headers });

  return res.data;
};

/**
 * Fetches data needed for the PDF report: details, rollups, and bulk responses.
 */
export const fetchSurveyReportData = async (surveyId) => {
  const headers = await getHeaders();
  
  const [detailsRes, rollupsRes, bulkRes] = await Promise.all([
    axios.get(`https://api.surveymonkey.com/v3/surveys/${surveyId}/details`, { headers }),
    axios.get(`https://api.surveymonkey.com/v3/surveys/${surveyId}/rollups`, { headers }),
    axios.get(`https://api.surveymonkey.com/v3/surveys/${surveyId}/responses/bulk`, { headers })
  ]);

  return {
    details: detailsRes.data,
    rollups: rollupsRes.data,
    bulk: bulkRes.data
  };
};

/**
 * Fetches the SurveyMonkey analyze page URL for a given survey.
 */
export const getSurveyAnalyzeUrl = async (surveyId) => {
  const headers = await getHeaders();
  const res = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/details`,
    { headers }
  );
  return {
    analyze_url: res.data.analyze_url,
    preview_url: res.data.preview,
  };
};

/**
 * Marks a survey as complete by moving it to the 'Completed' folder (ID 2451474).
 */
export const markSurveyComplete = async (surveyId) => {
  const headers = await getHeaders();
  const completedFolderId = process.env.ANALYZED_FOLDER_ID || "2451474";
  
  const res = await axios.patch(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}`,
    { folder_id: completedFolderId },
    { headers }
  );
  
  return res.data;
};
