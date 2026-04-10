import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import surveyRoutes from './src/routes/surveyRoutes.mjs';
import subjectRoutes from './src/routes/subjectRoutes.mjs';

dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Allow all origins for the Docker container
app.use(express.json());

// Main Routes
app.use('/api/v1', surveyRoutes);
app.use('/api/v1/subjects', subjectRoutes);

// Authentication Route
app.post('/api/v1/login', (req, res) => {
    const { username, password } = req.body;
    
    // DEBUG LOG
    console.log(`[Login] Attempt with username: '${username}'`);
    
    const validUsername = process.env.ADMIN_USERNAME?.trim();
    const validPassword = process.env.ADMIN_PASSWORD?.trim();
    
    console.log(`[Login] Comparing with loaded config - Username: '${validUsername}', Password: '${validPassword}'`);
    
    if (username === validUsername && password === validPassword) {
        return res.status(200).json({ success: true, message: 'Login successful' });
    }
    
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'MSF Automation API is running' });
});

// Connect to MongoDB, then start the server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/msf-automation';

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        // Start server anyway so existing non-DB features still work
        console.log('⚠️ Starting server without MongoDB — subject features will not work.');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (no DB)`));
    });