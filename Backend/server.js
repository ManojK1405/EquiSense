import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import prisma from './utils/prisma.js';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Import Routes
import predictionRoutes from './routes/prediction.routes.js';
import authRoutes from './routes/auth.routes.js';
import portfolioRoutes from './routes/portfolio.routes.js';
import marketRoutes from './routes/market.routes.js';
import backtestRoutes from './routes/backtest.routes.js';
import alertRoutes from './routes/alert.routes.js';
import strategyRoutes from './routes/strategy.routes.js';
import zerodhaRoutes from './routes/zerodha.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

// Import other deps after dotenv
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});
import cron from 'node-cron';

// Middlewares
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Stock Analyzer API is running...' });
});

app.use('/api/predictions', predictionRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/backtest', backtestRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/strategy', strategyRoutes);
app.use('/api/zerodha', zerodhaRoutes);
app.use('/api/newsletter', newsletterRoutes);

// --- Background Jobs ---
import { processPendingQueue } from './controllers/portfolio.controller.js';
import { setupSocketHandlers } from './utils/socket.js';
import { startAutoPilotService } from './services/autopilot.service.js';
import { startReportService } from './services/report.service.js';
import { startNewsletterService } from './services/newsletter.service.js';

setupSocketHandlers();
startAutoPilotService();
startReportService();
startNewsletterService();

// Market hours check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('--- Checking Pending Trade Queue ---');
  try {
    await processPendingQueue();
  } catch (error) {
    console.error('Error in Trade Queue job:', error);
  }
});

import { getMarketSummaryData } from './services/market.service.js';
import { refreshIntradayPulseCache } from './controllers/strategy.controller.js';

// cron.schedule('*/20 * * * *', async () => {
//   console.log('--- Running Background Stock & News Update ---');
//   try {
//     await getMarketSummaryData();
//     console.log('Successfully updated market insights.');
//   } catch (error) {
//     console.error('Error in background job:', error);
//   }
// });

cron.schedule('*/30 * * * *', async () => {
  console.log('--- Running Background Intraday Pulse Refresh ---');
  try {
    await refreshIntradayPulseCache();
  } catch (error) {
    console.error('Error in Intraday Pulse refresh job:', error);
  }
});

const startServer = () => {
  httpServer.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
};

startServer();

// Aggressive unbind handling to ensure reliable Nodemon restarts
process.once('SIGUSR2', () => {
  httpServer.close(() => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  httpServer.close(() => {
    process.exit(0);
  });
});


