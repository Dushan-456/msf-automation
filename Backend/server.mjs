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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));