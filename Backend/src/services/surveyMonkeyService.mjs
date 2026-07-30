import axios from "axios";
import { getSurveyEmailHtml, getSurveyEmailText } from '../templates/emailTemplates.mjs';
import ApiToken from '../models/ApiToken.mjs';
import SurveyCache from '../models/SurveyCache.mjs';

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

let isSyncing = false;

export const syncSurveysToCache = async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
        const headers = await getHeaders();
        
        // Find most recent survey in cache
        const latestCache = await SurveyCache.findOne().sort({ date_modified: -1 });
        const lastSyncDate = latestCache ? new Date(latestCache.date_modified) : null;
        
        let currentSmPage = 1;
        let hasMore = true;

        while (hasMore) {
            const url = `https://api.surveymonkey.com/v3/surveys?page=${currentSmPage}&per_page=100&sort_by=date_modified&sort_order=DESC&include=response_count`;
            const res = await axios.get(url, { headers });
            const batch = res.data?.data || [];
            
            if (batch.length === 0) {
                hasMore = false;
                break;
            }

            const bulkOps = [];
            let reachedCachedData = false;

            for (const survey of batch) {
                const smDate = new Date(survey.date_modified);
                
                // If we hit surveys older than or equal to our last sync date (minus 1 hour buffer)
                if (lastSyncDate && smDate.getTime() < (lastSyncDate.getTime() - 3600000)) {
                    reachedCachedData = true;
                }

                bulkOps.push({
                    updateOne: {
                        filter: { smId: survey.id },
                        update: {
                            $set: {
                                smId: survey.id,
                                title: survey.title,
                                href: survey.href,
                                date_modified: smDate,
                                response_count: survey.response_count || 0,
                                folder_id: survey.folder_id,
                                survey_state: survey.survey_state
                            }
                        },
                        upsert: true
                    }
                });
            }

            if (bulkOps.length > 0) {
                await SurveyCache.bulkWrite(bulkOps);
            }

            if (batch.length < 100 || reachedCachedData) {
                hasMore = false;
            } else {
                currentSmPage++;
            }
        }
    } catch (error) {
        console.error("Error syncing surveys to cache:", error.message);
    } finally {
        isSyncing = false;
    }
};

export const fetchAllSurveys = async (page = 1, perPage = 20, searchQuery = '') => {
  const headers = await getHeaders();

  if (searchQuery && searchQuery.trim() !== '') {
    // 1. Sync new surveys locally
    await syncSurveysToCache();

    // 2. Perform robust MongoDB regex search
    const query = {
        title: { $regex: searchQuery.trim(), $options: 'i' }
    };

    const total = await SurveyCache.countDocuments(query);
    const surveys = await SurveyCache.find(query)
        .sort({ date_modified: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);

    const formattedData = surveys.map(s => ({
        id: s.smId,
        title: s.title,
        href: s.href,
        date_modified: s.date_modified.toISOString().split('.')[0], // strip millis for SM parity
        response_count: s.response_count,
        folder_id: s.folder_id,
        survey_state: s.survey_state
    }));

    return {
        data: formattedData,
        page,
        per_page: perPage,
        total
    };
  } else {
    // Normal behavior without search
    let url = `https://api.surveymonkey.com/v3/surveys?page=${page}&per_page=${perPage}&sort_by=date_modified&sort_order=DESC&include=response_count`;
    const res = await axios.get(url, { headers });
    return res.data;
  }
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
export const sendReminderToNonRespondents = async (surveyId, surveyTitleFromClient = null, providedCollectorId = null) => {
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

  let collectorId = providedCollectorId;

  if (!collectorId) {
    // Step 2: Fetch the collector for the given survey ID
    const collectorsRes = await axios.get(
      `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors?include=type,status`,
      { headers }
    );

    if (!collectorsRes.data || collectorsRes.data.data.length === 0) {
      throw new Error(`No collectors found for Survey ID: ${surveyId}`);
    }

    // Find the first email collector
    const emailCollector = collectorsRes.data.data.find(c => c.type === 'email');
    if (!emailCollector) {
      throw new Error(`No email collector found for Survey ID: ${surveyId}. Reminders can only be sent via email collectors.`);
    }

    collectorId = emailCollector.id;
  }

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
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors?per_page=50&include=type,status`,
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
 * Uses the message-level recipients endpoint with `include` parameter
 * to get mail_status and survey_response_status in a single bulk request
 * instead of fetching each recipient individually (N+1 problem).
 *
 * Fetches recipients from ALL messages (invite + reminders) and deduplicates
 * by email, keeping the most up-to-date status.
 *
 * Total: ~2-4 API calls (1 for messages + 1 per message for recipients)
 */
export const fetchRecipientTrackingByCollector = async (collectorId) => {
  const headers = await getHeaders();

  // Step 1: Get the messages for this collector (typically 1-2 messages: invite + reminders)
  const messagesRes = await axios.get(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages?per_page=50`,
    { headers }
  );

  const messageList = messagesRes.data?.data || [];

  if (messageList.length === 0) {
    return [];
  }

  // Step 2: Fetch recipients from ALL messages using the include parameter
  // to get mail_status and survey_response_status in a single request per message.
  const recipientsByEmail = new Map();

  for (const message of messageList) {
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const recipientsRes = await axios.get(
        `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${message.id}/recipients?per_page=100&page=${currentPage}&include=survey_response_status,mail_status`,
        { headers }
      );

      const batch = recipientsRes.data?.data || [];

      for (const item of batch) {
        const email = (item.email || '').toLowerCase();
        if (!email) continue;

        // Keep the entry with the most informative status
        // Later messages (reminders) may have updated response status
        const existing = recipientsByEmail.get(email);
        if (!existing || item.survey_response_status === 'completely_responded') {
          recipientsByEmail.set(email, {
            email: item.email,
            email_status: item.mail_status || existing?.email_status || 'unknown',
            response_status: item.survey_response_status || existing?.response_status || 'not_responded',
          });
        }
      }

      hasMore = batch.length >= 100;
      if (hasMore) currentPage++;
    }
  }

  return Array.from(recipientsByEmail.values());
};

/**
 * Fetches recipient tracking data (email + response status) for a given survey.
 * Always uses the first collector — kept for backwards-compat with reminders flow.
 */
export const fetchRecipientTracking = async (surveyId) => {
  const headers = await getHeaders();

  const collectorsRes = await axios.get(
    `https://api.surveymonkey.com/v3/surveys/${surveyId}/collectors?include=type`,
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

/**
 * Adds new emails to an existing collector's invite message and sends it.
 */
export const addNewEmailsToCollectorByCollectorId = async (collectorId, newEmailsString) => {
  const headers = await getHeaders();

  // 1. Fetch messages for the collector
  const messagesRes = await axios.get(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
    { headers }
  );

  // Find original invite message
  const inviteMessage = messagesRes.data.data.find(m => m.type === 'invite');
  if (!inviteMessage) {
    throw new Error(`No invite message found for Collector ID: ${collectorId}`);
  }

  // 2. Fetch original message details to get the exact subject
  const msgDetailRes = await axios.get(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${inviteMessage.id}`,
    { headers }
  );
  const { subject } = msgDetailRes.data;

  // Extract doctor name from subject to recreate the exact custom template
  let doctorName = "the trainee";
  const titlePrefix = "Multisource Feedback Form (MSF)";
  const trainerPrefix = "Trainer -";

  if (subject && subject.includes(titlePrefix) && subject.includes(trainerPrefix)) {
    let rawNameSegment = subject.substring(
      subject.indexOf(titlePrefix) + titlePrefix.length,
      subject.indexOf(trainerPrefix)
    ).trim();
    
    const slmcMarker = " - SLMC -";
    if (rawNameSegment.includes(slmcMarker)) {
      doctorName = rawNameSegment.split(slmcMarker)[0].trim();
    } else {
      doctorName = rawNameSegment;
    }
  } else if (subject) {
    doctorName = subject.replace(titlePrefix, "").split(trainerPrefix)[0].trim() || "the trainee";
  }

  const emailBodyHtml = getSurveyEmailHtml(doctorName);
  const emailBodyText = getSurveyEmailText(doctorName);

  // 3. Create a NEW message in the same collector (fixes 400 "Message has already been sent" error)
  const newMsgRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages`,
    {
      type: "invite",
      subject: subject || inviteMessage.subject || "Survey Invitation",
      body_text: emailBodyText,
      body_html: emailBodyHtml
    },
    { headers }
  );
  const newMsgId = newMsgRes.data.id;

  // 4. Format emails
  const cleanEmails = newEmailsString.replace(/"/g, "");
  const emailArray = cleanEmails
    .split(/[;,]/)
    .map((e) => ({ email: e.trim() }))
    .filter((e) => e.email !== "");

  if (emailArray.length === 0) {
    throw new Error("No valid emails provided.");
  }

  // 5. Add recipients to the newly created message
  const bulkRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${newMsgId}/recipients/bulk`,
    { contacts: emailArray },
    { headers }
  );

  if (bulkRes.data.succeeded && bulkRes.data.succeeded.length === 0) {
    throw new Error(
      `Zero recipients were successfully added. They might be duplicates or invalid.`
    );
  }

  // 6. Send the new message
  const sendRes = await axios.post(
    `https://api.surveymonkey.com/v3/collectors/${collectorId}/messages/${newMsgId}/send`,
    {},
    { headers }
  );

  return { added: bulkRes.data, sendResponse: sendRes.data };
};
