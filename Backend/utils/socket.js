import { io } from '../server.js';
import { KiteTicker } from 'kiteconnect';
import prisma from './prisma.js';
import cron from 'node-cron';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ 
    suppressNotices: ['yahooSurvey'],
    validation: { logErrors: false }
});

// Keep track of active tickers to avoid duplicate connections
const activeTickers = new Map();
const activeMockTickers = new Map();

// Schedule cleanup at 5:55 AM IST daily (00:25 UTC)
cron.schedule('25 0 * * *', () => {
  console.log('[Ticker Cleanup] 5:55 AM IST reached. Terminating all active tickers.');
  activeTickers.forEach((ticker, userId) => {
      try {
        ticker.disconnect();
      } catch (e) {}
  });
  activeTickers.clear();

  activeMockTickers.forEach((interval, userId) => {
      clearInterval(interval);
  });
  activeMockTickers.clear();
}, {
  timezone: "UTC"
});

// Periodic cleanup of orphaned tickers (no listeners AND no AI Pilot)
setInterval(async () => {
    for (const [userId, ticker] of activeTickers.entries()) {
        const room = io.sockets.adapter.rooms.get(`user_${userId}`);
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { autoPilotLive: true } });
        if (!room && !user?.autoPilotLive) {
            console.log(`[Socket] Cleaning up orphaned LIVE ticker for user ${userId}`);
            ticker.disconnect();
            activeTickers.delete(userId);
        }
    }

    for (const [userId, interval] of activeMockTickers.entries()) {
        const room = io.sockets.adapter.rooms.get(`user_mock_${userId}`);
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { autoPilotMock: true } });
        if (!room && !user?.autoPilotMock) {
            console.log(`[Socket] Cleaning up orphaned MOCK ticker for user ${userId}`);
            clearInterval(interval);
            activeMockTickers.delete(userId);
        }
    }
}, 5 * 60 * 1000); // Every 5 minutes

export const setupSocketHandlers = () => {
  io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    socket.on('subscribe_live_data', async (data) => {
      const { userId, symbols } = data;
      if (!userId) return;

      socket.userId = userId;
      socket.join(`user_${userId}`);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && user.brokerType === 'zerodha' && user.zerodhaAccessToken) {
        startZerodhaTicker(userId, user.zerodhaApiKey, user.zerodhaAccessToken.split(':')[1], symbols);
      }
    });

    socket.on('subscribe_mock_data', (data) => {
      const { userId, symbols } = data;
      if (!userId || !symbols || !symbols.length) return;
      
      socket.userId = userId;
      socket.join(`user_mock_${userId}`);
      
      startMockTicker(userId, symbols);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected from socket:', socket.id);
      // We no longer kill tickers immediately on disconnect. 
      // The background cleanup job will handle it if the user doesn't return or doesn't have AI active.
    });
  });
};

const startMockTicker = (userId, symbols) => {
  if (activeMockTickers.has(userId)) return; // Already running
  
  const emitQuotes = async () => {
     try {
         // Optimization: Only fetch if there are listeners or AI is active
         const room = io.sockets.adapter.rooms.get(`user_mock_${userId}`);
         const user = await prisma.user.findUnique({ where: { id: userId }, select: { autoPilotMock: true } });
         
         if (!room && !user?.autoPilotMock) return; // Silent skip, cleanup job will kill later

         const quotes = await Promise.all(symbols.map(s => yahooFinance.quote(s).catch(() => null)));
         const ticks = quotes.filter(q => q).map(q => ({
             instrument_token: q.symbol, 
             last_price: q.regularMarketPrice,
             change_percent: q.regularMarketChangePercent
         }));
         io.to(`user_mock_${userId}`).emit('mock_ticks', ticks);
     } catch (e) {
         console.error('Mock Ticker error:', e.message);
     }
  };
  
  emitQuotes(); // initial fetch
  const interval = setInterval(emitQuotes, 15000); // Push updates every 15 seconds
  activeMockTickers.set(userId, interval);
};

const startZerodhaTicker = (userId, apiKey, accessToken, symbols) => {
  if (activeTickers.has(userId)) {
      const ticker = activeTickers.get(userId);
      if (symbols && symbols.length > 0) {
          ticker.subscribe(symbols);
          ticker.setMode(ticker.modeFull, symbols);
      }
      return;
  }

  const ticker = new KiteTicker({
    api_key: apiKey,
    access_token: accessToken
  });

  ticker.connect();

  ticker.on('ticks', (ticks) => {
    io.to(`user_${userId}`).emit('live_ticks', ticks);
  });

  ticker.on('connect', () => {
    console.log(`Kite Ticker connected for user ${userId}`);
    if (symbols && symbols.length > 0) {
        ticker.subscribe(symbols);
        ticker.setMode(ticker.modeFull, symbols);
    }
  });

  ticker.on('error', (err) => {
    console.error(`Kite Ticker Error for user ${userId}:`, err);
  });

  ticker.on('noreconnect', () => {
    console.error(`Kite Ticker failed to reconnect for user ${userId}`);
    activeTickers.delete(userId);
  });

  activeTickers.set(userId, ticker);
};
