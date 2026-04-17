import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import surveyRoutes from './src/routes/surveyRoutes.mjs';
import subjectRoutes from './src/routes/subjectRoutes.mjs';
import tokenRoutes from './src/routes/tokenRoutes.mjs';
import userRoutes from './src/routes/userRoutes.mjs';
import errorHandler from './src/middleware/errorHandler.mjs';
import { seedAdminUser } from './src/seed/autoSeed.mjs';
import User from './src/models/User.mjs';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'msf-automation-dev-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication Route
app.post('/api/v1/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        // Find user in database
        const user = await User.findOne({ username: username.trim().toLowerCase() });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('[Login Error]:', error.message);
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Main Routes
app.use('/api/v1', surveyRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/tokens', tokenRoutes);
app.use('/api/v1/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'MSF Automation API is running' });
});

// Global Error Handler (must be after all routes)
app.use(errorHandler);

// Connect to MongoDB, then start the server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/msf-automation';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        // Auto-seed admin user
        await seedAdminUser();
        
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('⚠️ Starting server without MongoDB — subject features will not work.');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (no DB)`));
    });
