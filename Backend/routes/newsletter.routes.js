import express from 'express';
const router = express.Router();
import * as newsletterController from '../controllers/newsletter.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

router.post('/subscribe', newsletterController.subscribe);
router.post('/unsubscribe', newsletterController.unsubscribe);
router.get('/status', newsletterController.checkStatus);

// Admin only: Trigger newsletter blast
router.post('/send', auth, newsletterController.sendNewsletter);

export default router;
