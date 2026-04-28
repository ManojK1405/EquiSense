import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Zap, BarChart3, Clock, ArrowUpRight, ArrowDownRight, Target, Cpu, RefreshCw, Layers, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';

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
        <div className="bg-white min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900">
            {/* Premium Navigation/Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-slate-50/50">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-600/5 blur-[120px] rounded-full -mr-96 -mt-96" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-600/5 blur-[120px] rounded-full -ml-48 -mb-48" />
                
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="flex flex-col items-center text-center">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-orange-50 text-orange-600 font-black text-[10px] uppercase tracking-[0.3em] mb-8 border border-orange-100 shadow-sm"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
                            </span>
                            Live Momentum Core
                        </motion.div>
                        
                        <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter mb-8 pb-2 leading-tight">
                            Intraday <span className="text-premium">Pulse</span>
                        </h1>
                        
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium mb-12">
                            High-frequency quantitative analysis of the Indian equity markets. 
                            Identifying institutional breakouts in real-time.
                        </p>

                        <div className="flex flex-wrap justify-center gap-4">
                            {['any', 'IT', 'Banking', 'Auto', 'Energy'].map((s) => (
                                <button 
                                    key={s}
                                    onClick={() => setActiveSector(s)}
                                    className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeSector === s 
                                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20' 
                                        : 'bg-white text-slate-400 border border-slate-100 hover:border-orange-200 hover:text-orange-600'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Locked Content */}
            <FeatureLock featureName="Live Momentum" description="Unlock real-time institutional signals and deep quant logic analysis.">
                
                <section className="max-w-7xl mx-auto px-6 py-20">
                    {/* Top Sector Gainers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                        {marketData?.sectorGainers?.map((s) => (
                            <div key={s.name} className={`p-6 rounded-3xl border ${s.changePercent >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{s.name} Sector</p>
                                <p className={`text-2xl font-black tracking-tighter ${s.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                                </p>
                            </div>
                        ))}
                        {loading && !marketData && [1, 2, 3].map(i => (
                            <div key={i} className="h-[96px] bg-slate-50/50 rounded-3xl animate-pulse border border-slate-100" />
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
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="bg-slate-50/50 h-[450px] rounded-[48px] animate-pulse border border-slate-100" />
                                    ))}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="pulse-grid"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 w-full"
                                >
                                    {pulseData?.picks?.map((pick, idx) => (
                                        <motion.div 
                                            key={pick.symbol}
                                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            whileHover={{ y: -10 }}
                                            className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.06)] transition-all group relative flex flex-col h-full"
                                        >
                                            <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full -mr-16 -mt-16 opacity-10 transition-colors duration-700 ${
                                                pick.sentiment > 0 ? 'bg-emerald-500' : 'bg-rose-500'
                                            }`} />

                                            {/* Sentiment Badge */}
                                            <div className={`absolute top-8 right-8 px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest border shadow-sm backdrop-blur-md transition-all duration-500 ${
                                                pick.sentiment > 0 
                                                ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' 
                                                : 'bg-rose-50/50 text-rose-600 border-rose-100'
                                            }`}>
                                                {pick.sentimentHeadline}
                                            </div>

                                            {/* Header */}
                                            <div className="flex items-center gap-5 mb-10 relative z-10">
                                                <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center text-slate-900 font-black text-2xl border border-slate-100 shadow-sm group-hover:bg-white group-hover:border-orange-100 group-hover:scale-105 transition-all duration-500">
                                                    {pick.symbol[0]}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">{pick.symbol}</h3>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-2">{pick.name}</p>
                                                </div>
                                            </div>

                                            {/* Metrics Grid */}
                                            <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
                                                <div className="p-5 rounded-[28px] bg-slate-50/50 border border-slate-100/50 transition-all duration-500 group-hover:bg-white group-hover:border-orange-100/50 group-hover:shadow-lg group-hover:shadow-orange-900/5">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Live Price</p>
                                                    <p className="text-xl font-black text-slate-900 tracking-tighter">₹{pick.currentPrice.toLocaleString()}</p>
                                                </div>
                                                <div className="p-5 rounded-[28px] bg-slate-50/50 border border-slate-100/50 transition-all duration-500 group-hover:bg-white group-hover:border-orange-100/50 group-hover:shadow-lg group-hover:shadow-orange-900/5">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">Mtm (5m)</p>
                                                    <p className={`text-xl font-black tracking-tighter ${pick.return5 > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                        {pick.return5 > 0 ? '+' : ''}{pick.return5.toFixed(2)}%
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Signal Section */}
                                            <div className="space-y-8 flex-1 relative z-10">
                                                <div className="flex justify-between items-center pb-5 border-b border-slate-100/50">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Status</span>
                                                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${
                                                        pick.signal.includes('BUY') || pick.signal.includes('LONG') ? 'text-emerald-600' : 
                                                        pick.signal.includes('SELL') || pick.signal.includes('SHORT') ? 'text-rose-600' : 'text-slate-400'
                                                    }`}>
                                                        {pick.signal}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Footer */}
                                            <div className="mt-10 pt-8 border-t border-slate-100/50 flex items-center justify-between relative z-10">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Zone</span>
                                                    <span className="text-[15px] font-black text-slate-900 tracking-tighter">
                                                        ₹{pick.target?.toLocaleString() || 'N/A'}
                                                    </span>
                                                </div>
                                                <button className="flex items-center gap-2 text-orange-600 font-black text-[10px] uppercase tracking-[0.2em] hover:gap-4 transition-all group/btn bg-orange-50/50 px-5 py-2.5 rounded-full border border-orange-100/50 hover:bg-orange-600 hover:text-white hover:border-orange-600">
                                                    Quant Logic
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </motion.div>
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
