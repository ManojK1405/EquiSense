import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Zap, BarChart3, Clock, ArrowUpRight, ArrowDownRight, Target, Cpu, RefreshCw, Layers, ArrowRight, RotateCw, AlignLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';
import PageHero from '../components/PageHero';

const PulseCard = ({ pick, idx }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="relative h-[480px] w-full" style={{ perspective: '1200px' }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotateY: isFlipped ? 180 : 0 }}
                transition={{ 
                    duration: 0.6, 
                    type: 'spring', 
                    stiffness: 260, 
                    damping: 20,
                    opacity: { delay: idx * 0.1 },
                    scale: { delay: idx * 0.1 },
                    y: { delay: idx * 0.1 }
                }}
                className="w-full h-full relative cursor-pointer group"
                onClick={() => setIsFlipped(!isFlipped)}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* FRONT FACE */}
                <div 
                    className={`absolute inset-0 bg-white p-8 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 transition-all flex flex-col h-full overflow-hidden ${isFlipped ? 'pointer-events-none' : 'pointer-events-auto'}`}
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-10 transition-colors duration-700 ${
                        pick.sentiment > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />

                    {/* Sentiment Badge */}
                    <div className={`absolute top-8 right-8 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border shadow-sm backdrop-blur-md transition-all duration-500 ${
                        (pick.sentiment || 0) > 0 
                        ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' 
                        : 'bg-rose-50/50 text-rose-600 border-rose-100'
                    }`}>
                        {pick.sentimentHeadline || 'Neutral Bias'}
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-5 mb-8 relative z-10">
                        <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-900 font-black text-2xl border border-slate-100 shadow-sm group-hover:bg-white group-hover:border-orange-100 group-hover:scale-105 transition-all duration-500">
                            {pick.symbol[0]}
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">{pick.symbol}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-2 truncate max-w-[120px]">{pick.name}</p>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
                        <div className="p-5 rounded-[24px] bg-slate-50/50 border border-slate-100/50 transition-all duration-500 group-hover:bg-white group-hover:border-orange-100/50 group-hover:shadow-lg group-hover:shadow-orange-900/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Live Price</p>
                            <p className="text-xl font-black text-slate-900 tracking-tighter">₹{pick.currentPrice?.toLocaleString() || '0.00'}</p>
                        </div>
                        <div className="p-5 rounded-[24px] bg-slate-50/50 border border-slate-100/50 transition-all duration-500 group-hover:bg-white group-hover:border-orange-100/50 group-hover:shadow-lg group-hover:shadow-orange-900/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Mtm (5m)</p>
                            <p className={`text-xl font-black tracking-tighter ${(pick.return5 || 0) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {(pick.return5 || 0) > 0 ? '+' : ''}{(pick.return5 || 0).toFixed(2)}%
                            </p>
                        </div>
                    </div>

                    {/* Signal Section */}
                    <div className="space-y-4 flex-1 relative z-10">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Status</span>
                            <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                                pick.signal.includes('BUY') || pick.signal.includes('LONG') ? 'text-emerald-600' : 
                                pick.signal.includes('SELL') || pick.signal.includes('SHORT') ? 'text-rose-600' : 'text-slate-400'
                            }`}>
                                {pick.signal}
                            </span>
                        </div>
                        
                        {/* Additional Metrics */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2">
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">RSI (14)</span>
                                <span className={`text-xs font-black ${(pick.currentRSI || 50) > 70 ? 'text-rose-500' : (pick.currentRSI || 50) < 30 ? 'text-emerald-500' : 'text-slate-700'}`}>{(pick.currentRSI || 50).toFixed(1)}</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Vol Spike</span>
                                <span className="text-xs font-black text-slate-700">{(pick.volumeSpike || 0 * 100).toFixed(0)}%</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Trend</span>
                                <span className="text-xs font-black text-slate-700 uppercase">{pick.trend || 'Neutral'}</span>
                            </div>
                            <div>
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Quant Score</span>
                                <span className="text-xs font-black text-orange-500">{pick.score || 0} / 100</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Footer */}
                    <div className="mt-auto pt-6 border-t border-slate-100/50 flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Zone</span>
                            <span className="text-[15px] font-black text-slate-900 tracking-tighter">
                                ₹{pick.target?.toLocaleString() || 'N/A'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-[0.2em] hover:gap-4 transition-all group/btn bg-orange-50/50 px-5 py-2.5 rounded-full border border-orange-100/50 hover:bg-orange-600 hover:text-white hover:border-orange-600">
                            Quant Logic
                            <RotateCw className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>

                {/* BACK FACE */}
                <div 
                    className={`absolute inset-0 bg-slate-900 p-8 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] ring-1 ring-white/10 flex flex-col h-full overflow-hidden text-white ${isFlipped ? 'pointer-events-auto' : 'pointer-events-none'}`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/20 blur-[80px] rounded-full -mr-20 -mt-20 opacity-30 pointer-events-none" />

                    <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="w-10 h-10 rounded-[16px] bg-slate-800 flex items-center justify-center text-white border border-slate-700 shadow-sm">
                            <AlignLeft className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tighter uppercase leading-none">{pick.symbol}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Algorithmic Thesis</p>
                        </div>
                    </div>

                    <div 
                        className="flex-1 overflow-y-auto pr-2 relative z-10 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {pick.notes?.map((note, i) => (
                            <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-[20px]">
                                <div className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                                        {note}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between relative z-10">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Quant Score</span>
                            <span className="text-[15px] font-black text-orange-400 tracking-tighter">
                                {pick.score} / 100
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors bg-slate-800 px-5 py-2.5 rounded-full border border-slate-700 hover:bg-slate-700">
                            Flip Back
                            <RotateCw className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const IntradayPulse = () => {
    const [pulseData, setPulseData] = useState(null);
    const [marketData, setMarketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSector, setActiveSector] = useState('any');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [resPulse, resMarket] = await Promise.all([
                api.post('/strategy/intraday', { sector: activeSector }),
                api.get('/market/summary')
            ]);
            setPulseData(resPulse.data);
            setMarketData(resMarket.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeSector]);

    return (
        <div className="bg-white min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 pb-20">
            <PageHero
                variant="gradient-bold"
                badge={{ icon: Activity, label: 'Live Momentum Core', live: true }}
                title="Intraday"
                titleAccent="Pulse"
                subtitle="High-frequency quantitative analysis of the Indian equity markets. Identifying institutional breakouts in real-time."
                accentColor="orange"
                stats={[
                    { label: 'Scan Frequency', value: '15min' },
                    { label: 'Markets', value: 'NSE / BSE' },
                    { label: 'Model', value: 'Quant AI' },
                ]}
            >
                <div className="flex flex-wrap gap-3 mt-2">
                    {['any', 'IT', 'Banking', 'Auto', 'Energy'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setActiveSector(s)}
                            className={`px-7 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeSector === s
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                                    : 'bg-white/80 text-slate-500 border border-slate-200 hover:border-orange-300 hover:text-orange-600'
                            }`}
                        >
                            {s === 'any' ? 'All Sectors' : s}
                        </button>
                    ))}
                </div>
            </PageHero>

            {/* Locked Content */}
            <FeatureLock featureName="Live Momentum" description="Unlock real-time institutional signals and deep quant logic analysis.">
                
                <section className="max-w-7xl mx-auto px-6 py-12">
                    {/* Top Sector Gainers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {marketData?.sectorGainers?.map((s) => (
                            <div key={s.name} className={`p-6 rounded-[32px] border ${s.changePercent >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${s.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.name} Sector</p>
                                <p className={`text-2xl font-black tracking-tighter ${s.changePercent >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                                </p>
                            </div>
                        ))}
                        {loading && !marketData && [1, 2, 3].map(i => (
                            <div key={i} className="h-[96px] bg-slate-50/50 rounded-[32px] animate-pulse border border-slate-100" />
                        ))}
                    </div>

                    {/* Grid of Picks */}
                    <div className="w-full">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div 
                                    key="skeleton-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="bg-slate-50/50 h-[480px] rounded-[40px] animate-pulse border border-slate-100" />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="pulse-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full"
                                >
                                    {pulseData?.picks?.map((pick, idx) => (
                                        <PulseCard key={pick.symbol} pick={pick} idx={idx} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>

            </FeatureLock>
        </div>
    );
};

export default IntradayPulse;
