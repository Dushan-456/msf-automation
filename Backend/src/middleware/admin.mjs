/**
 * Middleware to restrict access to ADMIN users only.
 * Must be used AFTER the 'auth' middleware has populated req.user.
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
};

export default admin;
