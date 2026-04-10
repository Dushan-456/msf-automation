import express from 'express';
import multer from 'multer';
import { addSubject, getSubjects, updateSubject, deleteSubject, uploadAndSend, getGlobalSettings, updateGlobalSettings } from '../controllers/driveController.mjs';

const router = express.Router();

// Multer config for PDF uploads — separate from the CSV multer in surveyRoutes
const pdfUpload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

// Global Settings (must be before /:id to avoid route conflict)
router.get('/settings', getGlobalSettings);
router.put('/settings', updateGlobalSettings);

// Subject CRUD
router.get('/', getSubjects);
router.post('/', addSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

// Upload PDF + Send Email
router.post('/upload', pdfUpload.array('pdfFiles', 20), uploadAndSend);

// Handle Multer validation errors for PDF uploads
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only PDF files are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

export default router;
