# EquiSense 🚀

**EquiSense** is an institutional-grade algorithmic trading and AI-driven portfolio management platform. It bridges the gap between deep market analysis and autonomous live execution, combining real-time data feeds, AI-powered strategy generation, and direct broker integration to create a complete algorithmic trading ecosystem.

---

## 🌟 Key Features

### 1. **Multi-Broker Live Execution Bridge**
Connect directly to institutional brokers (like **Zerodha Kite Connect**) to execute trades autonomously or manually. 
- **Bank-Grade Security:** API credentials are AES-256 encrypted and stored securely.
- **Dynamic Handshakes:** Fully supports automated OAuth flows and session management.
- **Real-Time Webhooks:** Listens for instant order postbacks for real-time status updates and execution logging.

### 2. **AI Autopilot & Strategist**
Powered by Gemini AI, EquiSense functions as a fully autonomous money manager.
- **Live / Mock Modes:** Deploy capital using either live broker connections or a high-fidelity paper trading simulation.
- **Dynamic Allocation:** Generate intelligent portfolios across various risk tolerances and sector constraints.

### 3. **Real-Time Market Terminal**
- **Zero-Latency Market Data:** Mimics browser requests and forces IPv4 connections to securely fetch institutional-grade charts and pricing without being blocked by data-center firewalls.
- **Interactive Holdings UI:** Seamlessly view long-term investments, day-trade positions, P&L metrics, and historical performance.
- **Institutional News Stream:** Contextual financial news paired with real-time sentiment analysis.

### 4. **Professional UI / UX**
- **Glassmorphism & Micro-animations:** Built with Framer Motion and Tailwind CSS for a premium, responsive experience.
- **Dynamic Settings Matrix:** A beautifully designed interface for managing user identity and institutional broker credentials.

---

## 🛠 Tech Stack

**Frontend:**
- React (Vite)
- Tailwind CSS
- Framer Motion
- Lucide Icons
- React Router & Context API

**Backend:**
- Node.js & Express
- Prisma (PostgreSQL Database)
- Socket.io (Real-Time Bidirectional Data)
- Node-Cron (Background Market Monitoring)
- Axios & Yahoo Finance APIs

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js v18+
- PostgreSQL
- API Keys for Gemini and Zerodha (if using Live execution)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/EquiSense.git
cd EquiSense
```

### 2. Backend Setup
```bash
cd Backend
npm install

# Set up your environment variables
cp .env.example .env

# Push Prisma Schema to PostgreSQL
npx prisma db push

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../Frontend
npm install

# Start the Vite development server
npm run dev
```

### 4. Zerodha Webhook Setup (Optional)
If you wish to test live order postbacks locally:
1. Run `ngrok http 5001`.
2. Use the generated ngrok URL as the **Postback URL** in your Kite Developer App (e.g., `https://<your-ngrok-url>.ngrok.app/api/zerodha/webhook`).

---

## 🔐 Security Disclaimer

**EquiSense** is an advanced platform capable of executing real financial transactions. Ensure you fully understand the automated strategies before deploying them with real capital in `Live` mode. The creators assume no liability for financial losses incurred. Always use `Mock` mode for backtesting and strategy validation.