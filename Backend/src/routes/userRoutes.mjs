import express from 'express';
import auth from '../middleware/auth.mjs';
import admin from '../middleware/admin.mjs';
import { listUsers, createUser, deleteUser } from '../controllers/userController.mjs';

const router = express.Router();

// All user management routes require both authentication AND admin privileges
router.use(auth);
router.use(admin);

router.get('/', listUsers);
router.post('/', createUser);
router.delete('/:id', deleteUser);

export default router;
