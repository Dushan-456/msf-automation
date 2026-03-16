import express from 'express';
import multer from 'multer';
import { uploadAndStartAutomation, checkJobStatus, getAllSurveys, sendReminders, processManualEntry, getTrackingData } from '../controllers/surveyController.mjs';

const router = express.Router();

// Setup Multer to save uploaded files to a temporary 'uploads' folder
// Add basic file validation logic here
const upload = multer({ 
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Define Routes
router.post('/automate-surveys', upload.single('csvFile'), uploadAndStartAutomation);
router.get('/status/:jobId', checkJobStatus);
router.get('/surveys', getAllSurveys);
router.post('/surveys/:surveyId/reminders', sendReminders);
router.get('/surveys/:surveyId/tracking', getTrackingData);
router.post('/automate-manual', processManualEntry);

// Handle Multer validation errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only CSV files are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

export default router;
