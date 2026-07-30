import express from 'express';
import auth from '../middleware/auth.mjs';
import admin from '../middleware/admin.mjs';
import { getEmailSettings, updateEmailSettings, resetEmailTemplate, testHtmlSupport } from '../controllers/settingsController.mjs';

const router = express.Router();

// All settings routes require authentication + admin role
router.use(auth);
router.use(admin);

router.get('/email', getEmailSettings);
router.put('/email', updateEmailSettings);
router.post('/email/test-html', testHtmlSupport);
router.delete('/email/reset/:template', resetEmailTemplate);

export default router;
