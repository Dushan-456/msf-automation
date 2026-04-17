import express from 'express';
import auth from '../middleware/auth.mjs';
import admin from '../middleware/admin.mjs';
import { listTokens, createToken, deleteToken, activateToken, validateAllTokens } from '../controllers/tokenController.mjs';

const router = express.Router();

router.use(auth);
router.use(admin);

router.get('/', listTokens);
router.post('/', createToken);
router.delete('/:id', deleteToken);
router.patch('/:id/activate', activateToken);
router.get('/validate-all', validateAllTokens);

export default router;
