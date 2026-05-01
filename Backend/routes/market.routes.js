import express from 'express';
import { getMarketSummary, searchSymbols, getMarketNews } from '../controllers/market.controller.js';

const router = express.Router();

router.get('/summary', getMarketSummary);
router.get('/news', getMarketNews);
router.get('/search', searchSymbols);
router.get('/status', (req, res) => {
    const { isMarketOpen } = import('../utils/marketStatus.js');
    import('../utils/marketStatus.js').then(m => {
        res.json({ isOpen: m.isMarketOpen() });
    });
});

export default router;
