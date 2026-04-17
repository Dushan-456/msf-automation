import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.mjs';
import { uploadAndStartAutomation, checkJobStatus, getAllSurveys, sendReminders, processManualEntry, getTrackingData, getSurveyCollectors, getTrackingByCollector, getReadySurveys, getToBeAnalyzedSurveys, getCompletedSurveys, getSurveyReportData, analyzeInSM, markSurveyComplete } from '../controllers/surveyController.mjs';

const router = express.Router();

// Setup Multer to save uploaded files to a temporary 'uploads' folder
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

// All routes require authentication
router.use(auth);

// Define Routes
router.post('/automate-surveys', upload.single('csvFile'), uploadAndStartAutomation);
router.get('/status/:jobId', checkJobStatus);
router.get('/surveys', getAllSurveys);
router.post('/surveys/:surveyId/reminders', sendReminders);
router.get('/surveys/:surveyId/tracking', getTrackingData);
router.get('/surveys/:surveyId/collectors', getSurveyCollectors);
router.get('/collectors/:collectorId/tracking', getTrackingByCollector);
router.post('/automate-manual', processManualEntry);
router.post('/surveys/:surveyId/analyze-in-sm', analyzeInSM);
router.get('/reports/ready', getReadySurveys);
router.get('/reports/to-be-analyzed', getToBeAnalyzedSurveys);
router.get('/reports/completed', getCompletedSurveys);
router.get('/reports/:surveyId/data', getSurveyReportData);
router.patch('/reports/:surveyId/complete', markSurveyComplete);

// Handle Multer validation errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only CSV files are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

export default router;
