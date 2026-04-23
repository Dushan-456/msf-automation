import jwt from 'jsonwebtoken';

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches decoded payload (userId, role) to req.user on success.
 */
const auth = (req, res, next) => {
    const JWT_SECRET = process.env.JWT_SECRET || 'msf-automation-dev-secret-key-2026';
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please log in again.' });
        }
        return res.status(401).json({ error: 'Invalid token.' });
    }
};

export default auth;

