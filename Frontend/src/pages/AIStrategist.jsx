import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, Zap, TrendingUp, ShieldCheck, BarChart2, Layers, Share2, Download, RefreshCw, Save, History, PlayCircle, ShieldAlert, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import PageHero from '../components/PageHero';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const formatINR = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Math.round(val).toLocaleString()}`;
};

const AIStrategist = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [mandate, setMandate] = useState({
        amount: '500000',
        riskLevel: 'moderate',
        horizon: '5',
        sectors: ['any']
    });
    const [strategy, setStrategy] = useState(null);
    const [backtestData, setBacktestData] = useState(null);
    const [backtestLoading, setBacktestLoading] = useState(false);
    const [executionMode, setExecutionMode] = useState('mock'); // mock | live
    const [executing, setExecuting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [activeTab, setActiveTab] = useState('generate'); // generate | saved
    const [savedStrategies, setSavedStrategies] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    useEffect(() => {
        if (activeTab === 'saved') {
            fetchSavedStrategies();
        }
    }, [activeTab]);

    const fetchSavedStrategies = async () => {
        setLoadingSaved(true);
        try {
            const res = await api.get('/portfolio/saved-strategies');
            setSavedStrategies(res.data);
        } catch (e) {
            toast.error('Failed to fetch saved strategies');
        } finally {
            setLoadingSaved(false);
        }
    };

    const runBacktest = async () => {
        if (!strategy) return;
        setBacktestLoading(true);
        try {
            const res = await api.post('/strategy/backtest', {
                allocation: strategy.allocation,
                horizon: mandate.horizon,
                amount: mandate.amount
            });
            setBacktestData(res.data);
        } catch (e) {
            console.error(e);
            toast.error('Backtest Engine Error: Unable to complete historical simulation.');
        } finally {
            setBacktestLoading(false);
        }
    };

    const generateFullPlan = async () => {
        setLoading(true);
        setBacktestData(null);
        try {
            const payload = { ...mandate, sector: mandate.sectors.join(', ') };
            const res = await api.post('/strategy/generate', payload);
            setStrategy(res.data);
            toast.success('Strategy Blueprint Generated');
        } catch (e) {
            console.error(e);
            toast.error('Strategy Execution Error: Unable to resolve market liquidity.');
        } finally {
            setLoading(false);
        }
    };

    const saveStrategyToDB = async (strategyData, isAuto = false) => {
        try {
            await api.post('/portfolio/save-strategy', {
                name: strategyData.strategyTitle || `Strategy ${new Date().toLocaleDateString()}`,
                description: strategyData.summary,
                data: strategyData,
                isPublic: false
            });
            if (!isAuto) toast.success('Strategy saved to your vault.');
            if (activeTab === 'saved') fetchSavedStrategies();
        } catch (e) {
            console.error('Save error', e);
            if (!isAuto) toast.error('Failed to save strategy.');
        }
    };

    const deleteStrategy = async (id) => {
        try {
            await api.delete(`/portfolio/saved-strategies/${id}`);
            toast.success('Strategy deleted');
            fetchSavedStrategies();
        } catch (e) {
            toast.error('Failed to delete strategy');
        }
    };

    const handleDeployRequest = () => {
        if (!strategy) return;
        if (executionMode === 'live' && !user?.brokerApiKey) {
            toast.error('Broker Not Connected. Visit Settings to link your account.');
            return;
        }
        setShowConfirmModal(true);
    };

    const deployStrategy = async () => {
        setShowConfirmModal(false);
        setExecuting(true);
        try {
            const res = await api.post('/portfolio/execute-strategy', {
                mode: executionMode,
                trades: strategy.allocation,
                totalCapital: parseFloat(mandate.amount)
            });
            
            if (res.data.isQueued) {
                toast.success('Market Closed. Strategy queued for next session.', { icon: '⏳' });
            } else {
                toast.success(res.data.message || 'Strategy Deployed Successfully!', { icon: '🚀' });
            }
            refreshUser();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Deployment Failed. Verify funds and connection.');
        } finally {
            setExecuting(false);
        }
    };

    return (
        <div className="bg-white min-h-screen font-sans selection:bg-rose-100 selection:text-rose-900 relative">
            <PageHero
                variant="gradient-bold"
                badge={{ icon: Brain, label: 'Institutional Strategy Engine' }}
                title="AI"
                titleAccent="Strategist"
                subtitle="Configure your investment mandate in seconds. Our AI generates a personalized, institutional-grade portfolio blueprint with full backtest simulation."
                accentColor="fuchsia"
                stats={[
                    { label: 'Risk Profiles', value: '3 Tiers' },
                    { label: 'Horizon Range', value: '1–20Y' },
                    { label: 'Sectors', value: '6+' },
                    { label: 'Execution', value: 'Mock + Live' },
                ]}
            />

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowConfirmModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden"
                        >
                            <div className="p-10 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${executionMode === 'live' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-900/10 text-slate-900'}`}>
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Confirm Execution</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify {executionMode} mode deployment</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                    <RefreshCw className="w-5 h-5 rotate-45" />
                                </button>
                            </div>

                            <div className="p-10 max-h-[60vh] overflow-y-auto">
                                <div className="mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Commitment</span>
                                        <span className="font-black text-slate-900 text-lg">₹{Number(mandate.amount).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Mode</span>
                                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${executionMode === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                                            {executionMode}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Breakdown</h4>
                                    {strategy.allocation.map((asset, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                                                    {asset.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm leading-none mb-1">{asset.displayName}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{asset.name} • {asset.weight}% Weight</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-slate-900 text-sm">₹{asset.amount.toLocaleString()}</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Buy</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 flex gap-4 border-t border-slate-100">
                                <button 
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={deployStrategy}
                                    className={`flex-[2] py-4 rounded-2xl text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${executionMode === 'live' ? 'bg-emerald-600 shadow-emerald-900/20' : 'bg-slate-900 shadow-slate-900/20'}`}
                                >
                                    {executionMode === 'live' ? 'Confirm & Transmit to Broker' : 'Confirm Mock Deployment'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="max-w-7xl mx-auto px-6 pt-8 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* ── Left Column: Mandate (Sticky) ── */}
                    <div className="lg:col-span-5 sticky top-32 space-y-8">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }} className="space-y-6">

                            {/* Tab switcher */}
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
                                <button
                                    onClick={() => setActiveTab('generate')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'generate' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Mandate
                                </button>
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'saved' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Vault
                                </button>
                            </div>

                            {activeTab === 'generate' ? (
                                <div className="space-y-6">
                                    {/* Mandate Form Card */}
                                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                                        <div className="h-1.5 bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500" />
                                        <div className="p-10 space-y-8">

                                            {/* Capital */}
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investment Commitment</label>
                                                    <span className="text-[10px] font-black text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-md uppercase">Step 01</span>
                                                </div>
                                                <div className="relative group">
                                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl group-focus-within:text-fuchsia-600 transition-colors">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="5,00,000"
                                                        className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-black text-2xl text-slate-900 focus:outline-none focus:border-fuchsia-400 focus:ring-8 focus:ring-fuchsia-500/5 transition-all"
                                                        value={mandate.amount}
                                                        onChange={(e) => setMandate({ ...mandate, amount: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Risk & Horizon Grid */}
                                            <div className="grid grid-cols-1 gap-8">
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-end">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Appetite</label>
                                                        <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase">Step 02</span>
                                                    </div>
                                                    <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                                        {['conservative', 'moderate', 'aggressive'].map((r) => (
                                                            <button
                                                                key={r}
                                                                onClick={() => setMandate({ ...mandate, riskLevel: r })}
                                                                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mandate.riskLevel === r ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                                                            >
                                                                {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time Horizon</label>
                                                        <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-lg">{mandate.horizon} Years</span>
                                                    </div>
                                                    <div className="px-2">
                                                        <input
                                                            type="range" min="1" max="20" step="1"
                                                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                                                            value={mandate.horizon}
                                                            onChange={(e) => setMandate({ ...mandate, horizon: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-tighter">
                                                        <span>1 Year</span>
                                                        <span>10 Years</span>
                                                        <span>20 Years</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <button
                                                onClick={generateFullPlan}
                                                disabled={loading}
                                                className="w-full py-5 bg-slate-900 rounded-[24px] text-white font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-40"
                                            >
                                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-rose-500 text-rose-500" />}
                                                {loading ? 'Processing Mandate...' : 'Architect Portfolio'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Mandate Insights (New Section to balance height) */}
                                    {strategy && (
                                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 rounded-[40px] border border-slate-100 p-8 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                </div>
                                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mandate Compliance</h4>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Diversification</span>
                                                    <span className="text-[10px] font-black text-slate-900">Optimal (3-5 Tickers)</span>
                                                </div>
                                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Risk Alignment</span>
                                                    <span className="text-[10px] font-black text-slate-900 capitalize">{mandate.riskLevel} Profile</span>
                                                </div>
                                                <div className="flex justify-between items-center py-3">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Liquidity Profile</span>
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase">High (Blue Chip)</span>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-white rounded-3xl border border-slate-100">
                                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                                                    "The architect has optimized this portfolio for {mandate.riskLevel} risk, prioritizing capital preservation alongside the {strategy.projectedReturnRange} growth target."
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                                    {loadingSaved ? (
                                        <div className="py-40 flex flex-col items-center justify-center gap-4">
                                            <RefreshCw className="w-10 h-10 text-slate-200 animate-spin" />
                                        </div>
                                    ) : savedStrategies.length === 0 ? (
                                        <div className="py-40 text-center bg-white rounded-[40px] border border-slate-100">
                                            <History className="w-12 h-12 text-slate-100 mx-auto mb-6" />
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No saved blueprints</p>
                                        </div>
                                    ) : (
                                        savedStrategies.map((s, sidx) => (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                key={s.id || `saved-${sidx}`} 
                                                className="bg-white p-8 rounded-[32px] border border-slate-100 hover:border-fuchsia-200 transition-all cursor-pointer group relative shadow-sm hover:shadow-xl"
                                                onClick={() => {
                                                    setStrategy(s.data);
                                                    setMandate({ ...mandate, amount: s.data.totalCapital?.toString() || mandate.amount });
                                                    setActiveTab('generate');
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="font-black text-slate-900 text-sm tracking-tight uppercase mb-1">{s.name}</h4>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); deleteStrategy(s.id); }}
                                                        className="p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Commitment</p>
                                                        <p className="font-black text-slate-900 text-[11px]">₹{Number(s.data.totalCapital || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex-1 px-4 py-3 bg-fuchsia-50 rounded-2xl border border-fuchsia-100">
                                                        <p className="text-[8px] font-black text-fuchsia-400 uppercase tracking-widest mb-1">Target</p>
                                                        <p className="font-black text-fuchsia-600 text-[11px]">{s.data.projectedReturnRange}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* ── Right Column: Output Terminal (Modernized) ── */}
                    <div className="lg:col-span-7">
                        <FeatureLock featureName="AI Strategy Engine" description="Unlock institutional-grade investment blueprints and historical backtest simulations.">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.99, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[48px] flex flex-col overflow-hidden relative min-h-[850px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] border border-slate-100"
                            >
                                {/* Terminal Header */}
                                <div className="px-10 py-8 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-[18px] bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                            <Brain className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5 uppercase">Architect Workbench</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Protocol v2.4 Active</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-lg transition-all">
                                            <Share2 className="w-4.5 h-4.5" />
                                        </button>
                                        <button className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-lg transition-all">
                                            <Download className="w-4.5 h-4.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Modernized Output Area */}
                                <div className="flex-1 p-10">
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="h-full flex flex-col items-center justify-center space-y-8 py-60"
                                            >
                                                <div className="relative">
                                                    <div className="w-20 h-20 border-4 border-slate-100 rounded-full" />
                                                    <div className="w-20 h-20 border-4 border-t-fuchsia-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin absolute top-0 left-0" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-black text-slate-900 text-2xl tracking-tighter mb-2">Simulating Scenarios...</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Optimizing Sharpe & Liquidity Clusters</p>
                                                </div>
                                            </motion.div>
                                        ) : strategy ? (
                                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                                                
                                                {/* Header & Stats Card */}
                                                <div className="p-12 bg-slate-900 rounded-[40px] relative overflow-hidden shadow-2xl">
                                                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20 blur-[120px] rounded-full -mr-32 -mt-32" />
                                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                                        <div className="flex-1">
                                                            <div className="flex gap-2 mb-6">
                                                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-rose-400 uppercase tracking-widest">{strategy.riskScore} Risk</span>
                                                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-black text-orange-400 uppercase tracking-widest">{strategy.horizon}</span>
                                                            </div>
                                                            <h4 className="text-4xl font-black text-white tracking-tighter mb-6 leading-[0.95]">{strategy.strategyTitle}</h4>
                                                            <p className="text-slate-400 font-bold leading-relaxed text-sm max-w-xl">{strategy.summary}</p>
                                                        </div>
                                                        <div className="bg-white/5 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 text-center min-w-[180px] shadow-2xl">
                                                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-3">Projected Yield</p>
                                                            <p className="text-4xl font-black text-emerald-400 tracking-tighter">{strategy.projectedReturnRange}</p>
                                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mt-3">Est. Annualized</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Navigation Tabs */}
                                                <div className="space-y-8">
                                                    <div className="flex gap-8 border-b border-slate-100">
                                                        {['Allocation', 'Intelligence', 'Terminal'].map((t) => (
                                                            <button 
                                                                key={t}
                                                                onClick={() => setActiveTab(t.toLowerCase())}
                                                                className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === t.toLowerCase() ? 'text-slate-900' : 'text-slate-300 hover:text-slate-500'}`}
                                                            >
                                                                {t}
                                                                {activeTab === t.toLowerCase() && <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-full" />}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <AnimatePresence mode="wait">
                                                        {activeTab === 'allocation' && (
                                                            <motion.div key="alloc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    {strategy.allocation.map((asset, aidx) => (
                                                                        <div key={aidx} className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] hover:border-slate-300 transition-all group relative overflow-hidden">
                                                                            <div className="flex justify-between items-start mb-6">
                                                                                <div className="w-12 h-12 rounded-2xl bg-white text-slate-900 border border-slate-200 flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                                                    {asset.name[0]}
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-xl font-black text-slate-900">₹{asset.amount.toLocaleString()}</p>
                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{asset.weight}% Allocation</p>
                                                                                </div>
                                                                            </div>
                                                                            <h5 className="font-black text-slate-900 text-base mb-1.5 uppercase tracking-tight">{asset.displayName}</h5>
                                                                            <div className="flex items-center gap-3 mb-6">
                                                                                <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md uppercase tracking-widest">{asset.name}</span>
                                                                                <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                                                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{asset.risk} Risk Profile</span>
                                                                            </div>
                                                                            <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-3">{asset.reason}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                
                                                                {/* Deployment Actions */}
                                                                <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                                                                    <button onClick={runBacktest} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm">
                                                                        <History className="w-4 h-4" /> Simulation Replay
                                                                    </button>
                                                                    <button onClick={() => saveStrategyToDB(strategy)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10">
                                                                        <Save className="w-4 h-4" /> Save Strategy
                                                                    </button>
                                                                </div>

                                                                {backtestData && (
                                                                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-10 bg-emerald-50 border border-emerald-100 rounded-[40px] relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 p-8 text-emerald-200/50">
                                                                            <BarChart2 className="w-32 h-32" />
                                                                        </div>
                                                                        <div className="relative z-10">
                                                                            <div className="flex items-center gap-3 mb-8">
                                                                                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                                                                                    <History className="w-5 h-5" />
                                                                                </div>
                                                                                <div>
                                                                                    <h5 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Historical Performance Replay</h5>
                                                                                    <p className="text-[8px] font-black text-emerald-600/60 uppercase">Horizon: {mandate.horizon}Y Backwards</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="grid grid-cols-2 gap-6 mb-8">
                                                                                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Simulated CAGR</p>
                                                                                    <p className="text-3xl font-black text-emerald-600">{backtestData.historicalCAGR}</p>
                                                                                </div>
                                                                                <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-sm">
                                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Portfolio Valuation</p>
                                                                                    <p className="text-3xl font-black text-slate-900">₹{backtestData.historicalValue?.toLocaleString()}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="p-6 bg-emerald-600/5 rounded-3xl border border-emerald-600/10">
                                                                                <p className="text-[12px] text-emerald-900 font-bold leading-relaxed italic">"{backtestData.analysis}"</p>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </motion.div>
                                                        )}

                                                        {activeTab === 'intelligence' && (
                                                            <motion.div key="intel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                                                                <div className="grid grid-cols-1 gap-8">
                                                                    <div className="bg-slate-50 p-12 rounded-[40px] border border-slate-100 relative group overflow-hidden">
                                                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                            <Brain className="w-40 h-40" />
                                                                        </div>
                                                                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                                                                            Strategic Market Outlook
                                                                        </h5>
                                                                        <p className="text-base text-slate-700 font-bold leading-loose relative z-10">{strategy.marketOutlook}</p>
                                                                    </div>
                                                                    <div className="bg-white p-12 rounded-[40px] border border-slate-100 shadow-sm relative group overflow-hidden">
                                                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                            <Zap className="w-40 h-40" />
                                                                        </div>
                                                                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                                            Technical Execution Protocol
                                                                        </h5>
                                                                        <p className="text-base text-slate-700 font-bold leading-loose relative z-10">{strategy.executionGuidance}</p>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}

                                                        {activeTab === 'terminal' && (
                                                            <motion.div key="terminal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                                                <div className="p-12 rounded-[48px] bg-slate-900 text-white relative overflow-hidden shadow-2xl border border-white/5">
                                                                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-rose-500/20 via-orange-500/10 to-transparent blur-[120px] rounded-full -mr-48 -mt-48" />
                                                                    
                                                                    <div className="relative z-10">
                                                                        <div className="flex items-center justify-between mb-12">
                                                                            <div className="flex items-center gap-5">
                                                                                <div className="w-14 h-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                                                                                    <Zap className="w-8 h-8 text-orange-400 fill-current" />
                                                                                </div>
                                                                                <div>
                                                                                    <h6 className="text-2xl font-black uppercase tracking-tight italic">Deployment Engine</h6>
                                                                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Ready for multi-order transmission</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex bg-white/5 p-1.5 rounded-[22px] border border-white/10 backdrop-blur-md">
                                                                                <button 
                                                                                    onClick={() => setExecutionMode('mock')}
                                                                                    className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${executionMode === 'mock' ? 'bg-white text-slate-900 shadow-2xl' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Mock
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => setExecutionMode('live')}
                                                                                    className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${executionMode === 'live' ? 'bg-emerald-600 text-white shadow-2xl' : 'text-white/40 hover:text-white'}`}
                                                                                >
                                                                                    Live
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-8 mb-12">
                                                                            <div className="p-8 bg-white/5 backdrop-blur-sm rounded-[32px] border border-white/10 group hover:bg-white/10 transition-all">
                                                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Net Order Volume</p>
                                                                                <p className="text-4xl font-black tracking-tighter">₹{Number(mandate.amount).toLocaleString()}</p>
                                                                            </div>
                                                                            <div className="p-8 bg-white/5 backdrop-blur-sm rounded-[32px] border border-white/10 group hover:bg-white/10 transition-all">
                                                                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Transmission Channel</p>
                                                                                <p className={`text-2xl font-black tracking-tight ${executionMode === 'mock' ? 'text-emerald-400' : (user?.brokerAccess ? 'text-emerald-400' : 'text-rose-400')}`}>
                                                                                    {executionMode === 'mock' ? 'Paper Trading Secure' : (user?.brokerAccess ? 'Institutional API linked' : 'Auth Required')}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <button 
                                                                            onClick={handleDeployRequest}
                                                                            disabled={executing || (executionMode === 'live' && !user?.brokerAccess)}
                                                                            className={`w-full py-7 rounded-[28px] font-black text-[13px] uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-5 shadow-2xl active:scale-[0.98] ${executing ? 'bg-slate-800 text-white/30 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 via-rose-600 to-fuchsia-600 text-white hover:shadow-orange-600/20 hover:scale-[1.01]'}`}
                                                                        >
                                                                            {executing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <PlayCircle className="w-7 h-7" />}
                                                                            {executing ? 'Executing Order Batch...' : `Transmit ${executionMode} Strategy`}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="h-full flex flex-col items-center justify-center text-center px-12 py-60"
                                            >
                                                <div className="w-28 h-28 rounded-full bg-slate-50 flex items-center justify-center mb-10 border border-slate-100 group">
                                                    <Layers className="w-12 h-12 text-slate-200 group-hover:text-fuchsia-400 transition-colors" />
                                                </div>
                                                <h3 className="font-black text-slate-900 text-3xl tracking-tighter mb-4 uppercase">Waiting for Mandate</h3>
                                                <p className="text-slate-500 font-bold leading-relaxed max-w-sm text-sm">
                                                    Define your investment parameters on the left to architect a quantitative blueprint.
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                {strategy && <StrategistChat strategy={strategy} />}
                            </motion.div>
                        </FeatureLock>
                    </div>

                </div>
            </div>

        </div>
    );
};

const StrategistChat = ({ strategy }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `Hello! I am your AI Investment Architect. I've built this **${strategy.strategyTitle}** blueprint for you. How can I help you refine or understand it?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const newMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/strategy/chat', { 
                messages: [...messages, newMsg],
                context: `The user is discussing this specific strategy: ${JSON.stringify(strategy)}`
            });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            toast.error('Architect Connection Lost');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-slate-100 bg-slate-50/50 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                    <Brain className="w-4 h-4" />
                </div>
                <h6 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Discuss with Architect</h6>
            </div>

            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto px-2">
                {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-5 rounded-3xl text-sm font-medium leading-relaxed ${
                            m.role === 'user' 
                            ? 'bg-slate-900 text-white rounded-tr-none' 
                            : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                        }`}>
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-5 rounded-3xl rounded-tl-none shadow-sm flex gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <input 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-16 text-sm font-medium focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/5 transition-all shadow-sm"
                    placeholder="Ask about allocation, risks, or swap stocks..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-rose-600 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default AIStrategist;
