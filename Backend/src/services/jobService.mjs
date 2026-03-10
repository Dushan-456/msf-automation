import { randomUUID } from 'crypto';

// In-memory job store
const jobs = new Map();

/**
 * Creates a new job and returns its ID
 */
export const createJob = (totalItems) => {
    const jobId = randomUUID();
    jobs.set(jobId, {
        id: jobId,
        status: 'pending',
        progress: 0,
        total: totalItems,
        successCount: 0,
        failedCount: 0,
        errors: [],
        createdAt: new Date()
    });
    return jobId;
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
export const updateJobProgress = (jobId, { success, errorDetail }) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.progress += 1;
    
    if (success) {
        job.successCount += 1;
    } else {
        job.failedCount += 1;
        if (errorDetail) job.errors.push(errorDetail);
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
