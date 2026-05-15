import * as TI from 'technicalindicators';
const { RSI, MACD, BollingerBands, SMA, EMA, PivotPoints } = TI;

/**
 * Helper: Classify a trend direction from two SMAs
 */
const classifyTrend = (smaShort, smaLong, closes) => {
  const lastPrice = closes[closes.length - 1];
  if (!smaShort || !smaLong) return { direction: 'sideways', strength: 'weak' };

  const shortVal = smaShort[smaShort.length - 1];
  const longVal = smaLong[smaLong.length - 1];
  const spread = ((shortVal - longVal) / longVal) * 100;

  if (lastPrice > shortVal && shortVal > longVal) {
    return { direction: 'uptrend', strength: Math.abs(spread) > 2 ? 'strong' : 'moderate' };
  } else if (lastPrice < shortVal && shortVal < longVal) {
    return { direction: 'downtrend', strength: Math.abs(spread) > 2 ? 'strong' : 'moderate' };
  }
  return { direction: 'sideways', strength: 'weak' };
};

/**
 * Helper: Analyze volume trend over recent sessions
 */
const analyzeVolume = (history) => {
  if (!history || history.length < 10) return { trend: 'neutral', description: 'Insufficient data for volume analysis.' };
  const recentVol = history.slice(-5).map(h => h.volume || 0);
  const priorVol = history.slice(-10, -5).map(h => h.volume || 0);
  const avgRecent = recentVol.reduce((a, b) => a + b, 0) / recentVol.length;
  const avgPrior = priorVol.reduce((a, b) => a + b, 0) / priorVol.length;

  if (avgPrior === 0) return { trend: 'neutral', description: 'Volume data unavailable.' };

  const change = ((avgRecent - avgPrior) / avgPrior) * 100;
  if (change > 20) return { trend: 'increasing', change: change.toFixed(1), description: `Volume surged ${change.toFixed(0)}% vs the prior 5 sessions — signals strong participation and conviction.` };
  if (change < -20) return { trend: 'decreasing', change: change.toFixed(1), description: `Volume dropped ${Math.abs(change).toFixed(0)}% vs the prior 5 sessions — declining interest may weaken the current move.` };
  return { trend: 'stable', change: change.toFixed(1), description: 'Volume is steady with no significant divergence from recent averages.' };
};

/**
 * Helper: Calculate price momentum (rate of change over N days)
 */
const calcMomentum = (closes, period = 10) => {
  if (closes.length < period + 1) return { value: 0, description: 'Not enough data for momentum.' };
  const current = closes[closes.length - 1];
  const past = closes[closes.length - 1 - period];
  const roc = ((current - past) / past) * 100;
  let desc;
  if (roc > 5) desc = `Price gained ${roc.toFixed(1)}% over the last ${period} sessions — strong bullish momentum.`;
  else if (roc > 0) desc = `Price is up ${roc.toFixed(1)}% over ${period} sessions — modest positive momentum.`;
  else if (roc > -5) desc = `Price dipped ${Math.abs(roc).toFixed(1)}% over ${period} sessions — mild bearish pressure.`;
  else desc = `Price fell ${Math.abs(roc).toFixed(1)}% over ${period} sessions — significant bearish momentum.`;
  return { value: parseFloat(roc.toFixed(2)), description: desc };
};

/**
 * Target Stocks for Scanning
 */
export const TARGET_STOCKS = [
    // Blue Chips & Heavyweights
    'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'ASIANPAINT.NS', 'LT.NS', 
    'AXISBANK.NS', 'KOTAKBANK.NS', 'HINDUNILVR.NS', 'BAJFINANCE.NS', 'RELIANCE.NS', 'ADANIPORTS.NS', 'POWERGRID.NS', 'NTPC.NS', 'COALINDIA.NS',
    // High-Growth / Mid-Cap / Trending
    'ADANIENT.NS', 'TITAN.NS', 'M&M.NS', 'SUNPHARMA.NS', 'TATASTEEL.NS', 'KPITTECH.NS', 'DIXON.NS', 'ZOMATO.NS', 'HAL.NS', 'BEL.NS', 
    'RVNL.NS', 'IRFC.NS', 'BHEL.NS', 'JIOFIN.NS', 'TATAELXSI.NS', 'POLYCAB.NS', 'MAZDOCK.NS', 'COCHINSHIP.NS', 'IRCTC.NS', 'PFC.NS',
    'MAHABANK.NS', 'IOB.NS', 'TATACOMM.NS', 'CDSL.NS', 'BSE.NS', 'IREDA.NS', 'JWL.NS', 'TRIDENT.NS'
];

/**
 * Generates stock analysis and buy/sell signals
 */
export const analyzeStock = (history, sentiment = 0) => {
  if (!history || history.length < 5) {
     return {
        symbol: '', signal: 'NEUTRAL', score: 0, currentPrice: 0, rsi: 50,
        buyLevel: 0, sellLevel: 0, stopLoss: 0, reasoning: ['Insufficient historical data for deep analysis.'],
        indicators: { rsi: 50, macd: null, bb: null },
        trendAnalysis: null
     };
  }

  const closes = history.map(h => h.close);
  const highs = history.map(h => h.high);
  const lows = history.map(h => h.low);
  const lastPrice = closes[closes.length - 1];

  // ----- RSI -----
  let currentRSI = 50;
  let rsiDescription = '';
  try {
    const rsiValues = RSI.calculate({ values: closes, period: Math.min(closes.length - 1, 14) }) || [];
    currentRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;
  } catch (e) { console.error("RSI Calc Error:", e.message); }

  if (currentRSI < 25) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — deeply oversold. Historically this zone sees mean-reversion bounces, suggesting the selling is overextended.`;
  else if (currentRSI < 35) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — oversold territory. Buyers typically step in at these levels as the stock becomes undervalued on a momentum basis.`;
  else if (currentRSI < 45) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — approaching neutral from the lower side. The downward pressure is easing, but no clear reversal signal yet.`;
  else if (currentRSI < 55) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — neutral zone. The stock is balanced between buyers and sellers with no directional bias from RSI.`;
  else if (currentRSI < 65) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — positive momentum building. Buyers are in control but haven't pushed into overbought territory yet.`;
  else if (currentRSI < 75) rsiDescription = `RSI at ${currentRSI.toFixed(1)} — overbought zone approaching. Consider booking partial profits as momentum may be peaking.`;
  else rsiDescription = `RSI at ${currentRSI.toFixed(1)} — strongly overbought. The stock is stretched and vulnerable to a pullback or consolidation phase.`;

  // ----- MACD -----
  let currentMACD = null;
  let macdDescription = '';
  try {
    const macdValues = MACD.calculate({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    }) || [];
    currentMACD = macdValues.length > 0 ? macdValues[macdValues.length - 1] : null;
  } catch (e) { console.error("MACD Calc Error:", e.message); }

  if (currentMACD) {
    const macdLine = currentMACD.MACD || 0;
    const signalLine = currentMACD.signal || 0;
    const histogram = currentMACD.histogram || 0;
    if (macdLine > signalLine && histogram > 0) {
      macdDescription = `MACD line (${macdLine.toFixed(2)}) is above the signal line (${signalLine.toFixed(2)}) with a positive histogram — confirms bullish crossover. Upward momentum is accelerating.`;
    } else if (macdLine > signalLine && histogram < 0) {
      macdDescription = `MACD is above the signal but histogram is narrowing — bullish momentum is fading. Watch for a potential crossover to the downside.`;
    } else if (macdLine < signalLine && histogram < 0) {
      macdDescription = `MACD line (${macdLine.toFixed(2)}) is below the signal line (${signalLine.toFixed(2)}) with a negative histogram — bearish momentum dominates. Selling pressure is increasing.`;
    } else {
      macdDescription = `MACD is below the signal but histogram is improving — bearish pressure may be easing. A bullish crossover could be forming.`;
    }
  } else {
    macdDescription = 'MACD calculation requires more data points for reliable signals.';
  }

  // ----- Bollinger Bands -----
  let currentBB = null;
  let bbDescription = '';
  try {
    const bbValues = BollingerBands.calculate({ period: Math.min(closes.length - 1, 20), values: closes, stdDev: 2 }) || [];
    currentBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : null;
  } catch (e) { console.error("BB Calc Error:", e.message); }

  if (currentBB) {
    const bandwidthPercent = ((currentBB.upper - currentBB.lower) / currentBB.middle * 100).toFixed(1);
    if (lastPrice <= currentBB.lower) {
      bbDescription = `Price is at the lower Bollinger Band (₹${currentBB.lower.toFixed(1)}) — indicates the stock is trading at the low end of its volatility range. This often precedes a rebound.`;
    } else if (lastPrice >= currentBB.upper) {
      bbDescription = `Price is at the upper Bollinger Band (₹${currentBB.upper.toFixed(1)}) — the stock is stretched to the high end of its range. Expect consolidation or pullback.`;
    } else {
      const position = ((lastPrice - currentBB.lower) / (currentBB.upper - currentBB.lower) * 100).toFixed(0);
      bbDescription = `Price is at ${position}% of the Bollinger Band range (Band width: ${bandwidthPercent}%). The stock is within normal volatility bounds.`;
    }
  } else {
    bbDescription = 'Bollinger Bands require more data for calculation.';
  }

  // ----- SMAs for Trend -----
  let sma20 = null, sma50 = null;
  let sma20Values = [], sma50Values = [];
  try {
    sma20Values = SMA.calculate({ period: Math.min(closes.length - 1, 20), values: closes }) || [];
    sma50Values = SMA.calculate({ period: Math.min(closes.length - 1, 50), values: closes }) || [];
    sma20 = sma20Values.length > 0 ? sma20Values : null;
    sma50 = sma50Values.length > 0 ? sma50Values : null;
  } catch (e) { console.error("SMA Calc Error:", e.message); }

  const trend = classifyTrend(sma20, sma50, closes);
  let trendDescription;
  if (trend.direction === 'uptrend') {
    trendDescription = `The stock is in a ${trend.strength} uptrend — the 20-day SMA is above the 50-day SMA, and the price is above both. This is a classic bullish alignment indicating sustained buying interest.`;
  } else if (trend.direction === 'downtrend') {
    trendDescription = `The stock is in a ${trend.strength} downtrend — the 20-day SMA has crossed below the 50-day SMA, and the price trails both. This pattern suggests continued selling pressure.`;
  } else {
    trendDescription = `The stock is moving sideways with no clear directional bias. The moving averages are intertwined, suggesting a period of consolidation before the next move.`;
  }

  // ----- Volume & Momentum -----
  const volumeAnalysis = analyzeVolume(history);
  const momentum = calcMomentum(closes, Math.min(10, closes.length - 1));

  // ----- Pivot Points -----
  let pivotData = { s1: lastPrice * 0.95, r1: lastPrice * 1.05, s2: lastPrice * 0.90 };
  if (history.length >= 2) {
    try {
        const lastDay = history[history.length - 2];
        const ppInput = {
            high: lastDay.high,
            low: lastDay.low,
            close: lastDay.close
        };
        
        // Defensive check for PivotPoints existence in the library
        if (typeof PivotPoints !== 'undefined' && PivotPoints.calculate) {
            const calculatedPivots = PivotPoints.calculate(ppInput) || [];
            if (calculatedPivots.length > 0) {
                const p = calculatedPivots[calculatedPivots.length - 1];
                pivotData = { s1: p.s1, r1: p.r1, s2: p.s2 };
            }
        }
    } catch (e) { console.error("Pivot Calc Error:", e.message); }
  }

  // ----- Scoring -----
  let signal = 'NEUTRAL';
  let reasoning = [];
  let score = 0; 

  if (currentRSI < 30) score += 35; 
  if (currentRSI < 40) score += 15; 
  if (currentRSI > 75) score -= 10; // Reduced penalty
  if (currentRSI > 85) score -= 20; // Reduced penalty
  
  if (currentMACD && currentMACD.MACD > currentMACD.signal) score += 25; 
  if (currentMACD && currentMACD.histogram > 0) score += 10; 
  
  if (currentBB && lastPrice <= currentBB.lower) score += 20;
  if (currentBB && lastPrice >= currentBB.upper) score -= 5; // Reduced penalty

  if (trend.direction === 'uptrend') {
    score += trend.strength === 'strong' ? 35 : 25; // Increased weight
  }
  if (trend.direction === 'downtrend') score -= 20;

  if (volumeAnalysis.trend === 'increasing') {
     score += 25; // Increased weight
  }

  score += (sentiment * 30);

  // INSTITUTIONAL QUALITY FILTER: High Score + Volume/Trend Confirmation
  const isInstitutionalGrade = score >= 50; // Lowered from 60
  const hasMomentum = trend.direction === 'uptrend' || volumeAnalysis.trend === 'increasing';

  if (score > 40) signal = 'STRONG BUY';
  else if (score > 15) signal = 'BUY';
  else if (score < -40) signal = 'STRONG SELL';
  else if (score < -15) signal = 'SELL';

  if (currentRSI < 35) reasoning.push('Technical indicators show stock is oversold.');
  if (currentMACD?.MACD > currentMACD?.signal) reasoning.push('MACD trend crossover confirms bullish momentum.');
  if (sentiment > 0.4) reasoning.push('News sentiment is exceptionally positive.');

  // ----- Technical Indicator Suite (Extended for Institutional Reporting) -----
  const getEMA = (period) => {
    const vals = EMA.calculate({ period: Math.min(closes.length - 1, period), values: closes }) || [];
    return vals.length > 0 ? parseFloat(vals[vals.length - 1].toFixed(2)) : 0;
  };
  const getSMA = (period) => {
    const vals = SMA.calculate({ period: Math.min(closes.length - 1, period), values: closes }) || [];
    return vals.length > 0 ? parseFloat(vals[vals.length - 1].toFixed(2)) : 0;
  };
  const getRSI = (period) => {
    const vals = RSI.calculate({ period: Math.min(closes.length - 1, period), values: closes }) || [];
    return vals.length > 0 ? parseFloat(vals[vals.length - 1].toFixed(2)) : 0;
  };

  const emaSuite = {
    ema5: getEMA(5), ema8: getEMA(8), ema9: getEMA(9), ema13: getEMA(13), 
    ema21: getEMA(21), ema50: getEMA(50), ema100: getEMA(100), ema200: getEMA(200)
  };
  const smaSuite = { sma9: getSMA(9), sma50: getSMA(50), sma100: getSMA(100) };
  const rsiSuite = { rsi14: getRSI(14), rsi9: getRSI(9), rsi7: getRSI(7) };

  let currentATR = 0;
  try {
    const atrValues = TI.ATR.calculate({ high: highs, low: lows, close: closes, period: 14 }) || [];
    currentATR = atrValues.length > 0 ? parseFloat(atrValues[atrValues.length - 1].toFixed(2)) : 0;
  } catch (e) { console.error("ATR Error:", e.message); }

  // ----- Build the rich trendAnalysis object -----
  const trendAnalysis = {
    ohlcv: {
      open: history[history.length - 1].open,
      high: history[history.length - 1].high,
      low: history[history.length - 1].low,
      close: history[history.length - 1].close,
      volume: history[history.length - 1].volume
    },
    overall: {
      direction: trend.direction,
      strength: trend.strength,
      description: trendDescription
    },
    averages: { ...emaSuite, ...smaSuite },
    oscillators: { ...rsiSuite, atr: currentATR },
    indicators: {
      rsi: {
        value: parseFloat(currentRSI.toFixed(2)),
        zone: currentRSI < 30 ? 'oversold' : currentRSI > 70 ? 'overbought' : 'neutral',
        description: rsiDescription
      },
      macd: {
        macdLine: currentMACD?.MACD ? parseFloat(currentMACD.MACD.toFixed(2)) : null,
        signalLine: currentMACD?.signal ? parseFloat(currentMACD.signal.toFixed(2)) : null,
        histogram: currentMACD?.histogram ? parseFloat(currentMACD.histogram.toFixed(2)) : null,
        crossover: currentMACD ? (currentMACD.MACD > currentMACD.signal ? 'bullish' : 'bearish') : 'none',
        description: macdDescription
      },
      bollingerBands: {
        upper: currentBB?.upper ? parseFloat(currentBB.upper.toFixed(2)) : null,
        middle: currentBB?.middle ? parseFloat(currentBB.middle.toFixed(2)) : null,
        lower: currentBB?.lower ? parseFloat(currentBB.lower.toFixed(2)) : null,
        position: currentBB ? parseFloat(((lastPrice - currentBB.lower) / (currentBB.upper - currentBB.lower) * 100).toFixed(1)) : 50,
        description: bbDescription
      }
    },
    volume: volumeAnalysis,
    momentum: momentum,
    supportResistance: {
      support1: parseFloat((pivotData.s1 || lastPrice * 0.98).toFixed(2)),
      resistance1: parseFloat((pivotData.r1 || lastPrice * 1.02).toFixed(2)),
      support2: parseFloat((pivotData.s2 || lastPrice * 0.95).toFixed(2)),
      description: `Key support at ₹${(pivotData.s1 || lastPrice * 0.98).toFixed(1)} (pivot S1) — a break below could accelerate selling to ₹${(pivotData.s2 || lastPrice * 0.95).toFixed(1)} (S2). Resistance at ₹${(pivotData.r1 || lastPrice * 1.02).toFixed(1)} (R1) — a close above this opens upside targets.`
    }
  };

  const isBearish = signal.includes('SELL');
  const entry = lastPrice;
  
  // High-fidelity level calculation (Institutional Grade)
  let target, sl;
  const volBuffer = currentATR > 0 ? currentATR * 1.5 : entry * 0.03;

  if (isBearish) {
    // For Sell/Short: Target below, SL above
    target = pivotData.s1 < entry * 0.99 ? pivotData.s1 : entry - volBuffer;
    sl = pivotData.r1 > entry * 1.01 ? pivotData.r1 : entry + volBuffer;
  } else {
    // For Buy/Long: Target above, SL below
    target = pivotData.r1 > entry * 1.01 ? pivotData.r1 : entry + volBuffer;
    sl = pivotData.s1 < entry * 0.99 ? pivotData.s1 : entry - volBuffer;
  }

  // Final safety checks to ensure no zeros or nulls
  const finalTarget = parseFloat((target || (isBearish ? entry * 0.95 : entry * 1.05)).toFixed(2));
  const finalSl = parseFloat((sl || (isBearish ? entry * 1.03 : entry * 0.97)).toFixed(2));

  // Calculate Reward Ratio: (Target - Entry) / (Entry - StopLoss)
  const risk = Math.abs(entry - finalSl);
  const reward = Math.abs(finalTarget - entry);
  const rewardRatio = risk > 0 ? parseFloat((reward / risk).toFixed(1)) : 2.0;

  return {
    symbol: '', 
    signal,
    score,
    sentiment,
    currentPrice: lastPrice,
    rsi: currentRSI,
    buyLevel: entry, 
    sellLevel: finalTarget, 
    stopLoss: finalSl,
    rewardRatio,
    duration: '2 - 6 Weeks (Swing)',
    reasoning,
    indicators: {
        rsi: currentRSI,
        macd: currentMACD,
        bb: currentBB
    },
    trendAnalysis
  };
};
