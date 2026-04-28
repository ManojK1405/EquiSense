import express from 'express';
import { signup, login, getMe, googleLogin, logout, updateProfile } from '../controllers/auth.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/google', googleLogin);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);

export default router;
