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
        rows: doctorNames.map(name => ({
            doctorName: name,
            status: 'pending', // pending, processing, completed, failed
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
export const updateJobActivity = (jobId, activityText, doctorName = null) => {
    const job = jobs.get(jobId);
    if (!job) return;
    job.currentActivity = activityText;

    if (doctorName) {
        const row = job.rows.find(r => r.doctorName === doctorName);
        if (row && row.status === 'pending') {
            row.status = 'processing';
        }
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
export const updateJobProgress = (jobId, { doctorName, success, errorDetail }) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.progress += 1;
    
    const row = job.rows.find(r => r.doctorName === doctorName);

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
