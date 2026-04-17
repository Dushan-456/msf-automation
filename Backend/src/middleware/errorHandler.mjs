/**
 * Global error handler middleware.
 * Catches all errors forwarded by asyncHandler or next(error).
 * Handles SurveyMonkey rate limits (429) consistently.
 */
const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message);

    // SurveyMonkey API rate limit
    if (err.response?.status === 429 || err.response?.data?.error === 'RateLimit') {
        return res.status(429).json({
            error: 'RateLimit',
            message: 'SurveyMonkey API daily limit reached. Please try again tomorrow.'
        });
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ error: messages.join(', ') });
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        return res.status(409).json({ error: 'A record with that value already exists.' });
    }

    // Default server error
    const statusCode = err.statusCode || err.response?.status || 500;
    const message = err.response?.data?.error?.message || err.message || 'Internal server error';

    res.status(statusCode).json({ error: message });
};

export default errorHandler;
