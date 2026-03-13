import express from 'express';  
import cors from 'cors';
import dotenv from 'dotenv';
import surveyRoutes from './src/routes/surveyRoutes.mjs';

dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Allow all origins for the Docker container
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