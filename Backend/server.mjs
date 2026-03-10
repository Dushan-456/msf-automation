import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import surveyRoutes from './src/routes/surveyRoutes.mjs';

dotenv.config();

const app = express();

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

// Main Routes
app.use('/api/v1', surveyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'MSF Automation API is running' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));