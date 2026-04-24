import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.mjs';
import { 
    addSubject, getSubjects, updateSubject, deleteSubject, uploadAndSend, uploadAndSendStream,
    getGlobalSettings, updateGlobalSettings, exportSubjectsCSV, importSubjectsCSV 
} from '../controllers/driveController.mjs';

const router = express.Router();

// Multer config for PDF uploads
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

// Multer config for CSV uploads
const csvUpload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    }
});

// All routes require authentication
router.use(auth);

// Global Settings (must be before /:id to avoid route conflict)
router.get('/settings', getGlobalSettings);
router.put('/settings', updateGlobalSettings);

// Subject CRUD
router.get('/', getSubjects);
router.post('/', addSubject);
router.put('/:id', updateSubject);
router.delete('/:id', deleteSubject);

// CSV Import/Export
router.get('/export-csv', exportSubjectsCSV);
router.post('/import-csv', csvUpload.single('file'), importSubjectsCSV);

// Upload PDF + Send Email
router.post('/upload', pdfUpload.array('pdfFiles', 20), uploadAndSend);

// Upload PDF + Send Email (SSE stream — used when Drive upload is enabled)
router.post('/upload-stream', pdfUpload.array('pdfFiles', 20), uploadAndSendStream);

// Handle Multer validation errors for PDF uploads
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only PDF files are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

export default router;
