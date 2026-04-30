# EquiSense: The Complete Institutional Knowledge Base

## 1. Core Identity & Leadership
- **Platform Name**: EquiSense (Institutional Research & Quantitative Strategy Terminal)
- **Founder**: **Manoj Kalasgonda**
- **Focus**: Indian Equity Markets (NSE & BSE).
- **Mission**: To democratize institutional-grade quantitative research using state-of-the-art Generative AI and real-time market telemetry.

## 2. How to Use EquiSense
- **Searching Stocks**: Use the search bar at the top of the Research page. Type symbols like "RELIANCE", "TCS", or "INFY". Note: For Indian stocks, the system automatically handles the .NS (NSE) suffix.
- **Generating a Strategy**: Go to the "AI Strategist" page, enter your investment amount, select a risk level (Low, Medium, High), and a sector preference. The AI will generate a "Quantitative Mandate" for you.
- **Using the Chat**: The chat widget on the home page and dashboard is your direct line to the AI Analyst. You can ask for price checks, sentiment updates, or general market explanations.
- **Live Trading**: Connect your broker (Zerodha/Groww) in the Settings page to enable live execution. If not connected, the system defaults to "Mock Mode" for paper trading.

## 3. Technical Architecture: How It Works
### Data Engine
EquiSense utilizes a high-frequency data pipeline powered by **Yahoo Finance APIs** for real-time price discovery, historical OHLCV data, and fundamental ratios.
### AI Intelligence Layer
- **Large Language Models**: Powered by **Google Gemini (3-Flash & 1.5 Pro)** for complex reasoning, strategy synthesis, and natural language understanding.
- **Sentiment Engine**: Uses **FinBERT** (Financial Bidirectional Encoder Representations from Transformers) models via Hugging Face to analyze news headlines and extract high-precision sentiment scores (-1 to 1).
### Quantitative Analysis
The system computes technical indicators on-the-fly, including:
- **Momentum**: RSI (Relative Strength Index), MACD (Moving Average Convergence Divergence).
- **Volatility**: Bollinger Bands and ATR (Average True Range).
- **Trend**: Exponential Moving Averages (EMA 5, 21, 50, 200) and SMA 50/100.

## 3. Platform Modules & Features
### Research Terminal
- **Dynamic Analysis**: Every search triggers a multi-stage research process: Metadata extraction -> Fundamental profiling -> Technical telemetry -> AI Reasoning.
- **AI Quant Score**: A proprietary 0-100 score. 
    - 0-30: Bearish/Avoid
    - 30-60: Neutral/Consolidating
    - 60-80: Bullish/Institutional Interest
    - 80-100: High-Conviction Breakout
### AI Strategist (The "Architect")
- Generates personalized investment "Mandates" (never called "Alpha").
- Factors in **Capital Commitment**, **Risk Appetite** (Conservative/Balanced/Aggressive), and **Time Horizon**.
### Reverse Strategy (Goal Planner)
- **Inflation Modeling**: Accounts for a 6% annual baseline inflation.
- **Manufacturer Price Hikes**: Specifically factors in a 2.5% annual premium for luxury acquisitions.
- **Output**: Calculates the exact Monthly SIP and asset allocation (Stocks/Debt/Gold) needed to reach a specific financial goal.
### Intraday Pulse
- Scans sectors for high-momentum "picks" during market hours.
- Provides real-time RSI regimes and volume spike detection.
### AI Pilot (Auto-Pilot)
- **Money Manager Mode**: Monitors user portfolios every 3 minutes.
- **Exit Logic**: Automatically triggers exits based on "Strong Sell" signals, 15% profit targets, or 4% strict stop-losses.
- **Asset Acquisition**: Scans a pool of blue-chip and high-growth stocks (like RELIANCE, TCS, KPITTECH) to find entry points.

## 4. Execution & Trading
### Mock vs. Live
- **Mock Mode**: Uses a simulated ₹10,00,000 starting balance. Includes T+1 settlement logic for realism.
- **Live Mode**: Connects to actual brokers via secure OAuth bridges. EquiSense never sees or stores your password.
### Settlement Logic
- Following Indian market norms, sell proceeds in Mock Mode are moved to a "Settlement Balance" and released after T+1 day at 9:15 AM (Market Open).

## 5. Security & Privacy
- **OAuth 2.0**: Used for all broker integrations.
- **Stateless Auth**: Uses JWT (JSON Web Tokens) for secure session management.
- **Data Integrity**: Financial data is encrypted at rest and in transit.

## 6. How the AI "Thinks": Technical Logic
### AI Prediction Logic
When the AI generates a verdict (e.g., **FAVORABLE**), it isn't guessing. It runs a 4-layer check:
1. **Structural Layer**: Is the price above the 200 EMA? (Long-term health)
2. **Momentum Layer**: Is RSI between 40-70? (Avoids overbought/oversold traps)
3. **Fundamental Layer**: Is the Debt-to-Equity ratio < 2? (Solvency check)
4. **Sentiment Layer**: Is the news cycle positive? (Narrative confirmation)

### Strategy Generation Logic
The "Institutional Blueprint" generator uses a **Portfolio Optimization Algorithm**:
- **Diversification**: Spreads capital across at least 3-5 assets to mitigate unsystematic risk.
- **Risk Weighting**: Aggressive profiles get more weight in high-beta stocks (like HAL or RVNL), while Conservative profiles get more weight in low-beta blue chips (like TCS or RELIANCE).

## 7. Automated Services
- **Intelligence Brief**: Every morning at 8:00 AM IST, the platform dispatches a market briefing to subscribers, summarizing the previous day's moves and today's outlook.
- **Trade Reconciliation**: The system runs a background job to settle funds and reconcile trade logs at market close and open.

## 8. Common Troubleshooting (How to Fix)
- **Chart Not Loading**: TradingView charts require a valid ticker. If a chart is blank, ensure the stock is an Indian equity and check your internet connection.
- **Search Filtering**: The platform strictly filters for Indian markets. International symbols are accessible only via specific global research modules.
- **AI Score Low**: A low score indicates poor fundamental health or bearish technical structures.

## 9. Frequently Asked Questions
- **Is my data secure?** Yes, EquiSense uses institutional-grade encryption. We do not store your broker credentials; we use secure OAuth sessions.
- **Which markets are supported?** Currently, EquiSense is optimized for the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) of India.
- **What is the AI Quant Score?** It is a proprietary 0-100 score derived from technical indicators, fundamental health, and news sentiment. Scores above 70 indicate high-conviction bullishness.
- **Can I use it for Intraday?** Yes, the "Intraday Pulse" section is specifically designed for high-frequency momentum tracking.

---
**Disclaimer**: EquiSense is an AI-assisted research tool. All investments in the stock market are subject to market risks. Manoj Kalasgonda and the EquiSense team recommend consulting a certified financial advisor before making live trades.
