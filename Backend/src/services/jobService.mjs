import { randomUUID } from 'crypto';

// In-memory job store
const jobs = new Map();

/**
 * Creates a new job and returns its ID
 */
export const createJob = (doctorNames) => {
    const jobId = randomUUID();
    jobs.set(jobId, {
        id: jobId,
        status: 'pending',
        progress: 0,
        total: doctorNames.length,
        successCount: 0,
        failedCount: 0,
        rows: doctorNames.map((name, index) => ({
            id: index,
            doctorName: name,
            status: 'pending', // pending, processing, completed, failed
            detail: null,
            error: null
        })),
        errors: [],
        currentActivity: 'Initializing...',
        createdAt: new Date()
    });
    return jobId;
};

/**
 * Updates the live activity status string and marks a specific row as processing
 */
export const updateJobActivity = (jobId, activityText, rowIndex = null) => {
    const job = jobs.get(jobId);
    if (!job) return;
    job.currentActivity = activityText;

    if (rowIndex !== null) {
        const row = job.rows[rowIndex];
        if (row && row.status === 'pending') {
            row.status = 'processing';
        }
    }

    jobs.set(jobId, job);
};

/**
 * Updates a specific row status and detailed progress message
 */
export const updateRowStatus = (jobId, rowIndex, status, detail = null) => {
    const job = jobs.get(jobId);
    if (!job) return;

    const row = job.rows[rowIndex];
    if (row) {
        if (status) row.status = status;
        if (detail !== null) row.detail = detail;
    }

    jobs.set(jobId, job);
};

/**
 * Retrieves the current status of a job
 */
export const getJobStatus = (jobId) => {
    return jobs.get(jobId);
};

/**
 * Updates the job status during processing
 */
export const updateJobProgress = (jobId, { rowIndex, success, errorDetail }) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.progress += 1;
    
    const row = job.rows[rowIndex];

    if (success) {
        job.successCount += 1;
        if (row) row.status = 'completed';
    } else {
        job.failedCount += 1;
        if (errorDetail) job.errors.push(errorDetail);
        if (row) {
            row.status = 'failed';
            row.error = errorDetail;
        }
    }

    if (job.progress === job.total) {
        job.status = job.failedCount === job.total ? 'failed' : 'completed';
    } else {
        job.status = 'processing';
    }

    jobs.set(jobId, job);
};

/**
 * Marks a job as completely failed (e.g., parsing error)
 */
export const failJob = (jobId, errorMsg) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = 'failed';
    job.errors.push(errorMsg);
    jobs.set(jobId, job);
};

/**
 * Clears old jobs asynchronously (Optional garbage collection)
 */
setInterval(() => {
    const ONE_HOUR = 60 * 60 * 1000;
    const now = new Date();
    for (const [id, job] of jobs.entries()) {
        if (now - job.createdAt > ONE_HOUR) {
            jobs.delete(id);
        }
    }
}, 1000 * 60 * 60); // Run every hour
