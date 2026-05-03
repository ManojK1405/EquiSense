import express from 'express';
import { connectZerodha, getHoldings, getQuotes, handleWebhook } from '../controllers/zerodha.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Protected user routes
router.post('/connect', auth, connectZerodha);
router.post('/holdings', auth, getHoldings);
router.post('/quotes', auth, getQuotes);

// Public Webhook route (No auth middleware - called by Zerodha's servers directly)
router.post('/webhook', handleWebhook);

export default router;
