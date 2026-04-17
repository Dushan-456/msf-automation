/**
 * Wraps an async route handler to catch errors and forward them to Express error handler.
 * Eliminates repetitive try/catch in every controller.
 * 
 * Usage: router.get('/path', asyncHandler(myController))
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
