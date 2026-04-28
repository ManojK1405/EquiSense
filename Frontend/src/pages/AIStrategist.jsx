import React, { useState, useEffect } from 'react';
import { Brain, Sparkles, Zap, TrendingUp, ShieldCheck, BarChart2, Layers, Share2, Download, RefreshCw, Save, History, PlayCircle, ShieldAlert, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import PageHero from '../components/PageHero';

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
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200"
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

                    {/* ── Left Column: Mandate ── */}
                    <div className="lg:col-span-5 space-y-5">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>

                            {/* Tab switcher */}
                            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 mb-5">
                                <button
                                    onClick={() => setActiveTab('generate')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'generate' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Generate New
                                </button>
                                <button
                                    onClick={() => setActiveTab('saved')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'saved' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Saved Vault
                                </button>
                            </div>

                            {activeTab === 'generate' ? (
                                <>
                                    {/* Mandate Form Card */}
                                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                                        <div className="h-1 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-purple-600" />
                                        <div className="p-8 space-y-6">

                                            {/* Capital */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span className="w-5 h-5 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center text-[9px] font-black">1</span>
                                                    Capital Commitment
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                                    <input
                                                        type="number"
                                                        placeholder="e.g. 500000"
                                                        className="w-full pl-10 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-900 focus:outline-none focus:border-fuchsia-400 focus:ring-4 focus:ring-fuchsia-500/8 transition-all"
                                                        value={mandate.amount}
                                                        onChange={(e) => setMandate({ ...mandate, amount: e.target.value })}
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">INR</span>
                                                </div>
                                            </div>

                                            {/* Risk */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span className="w-5 h-5 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center text-[9px] font-black">2</span>
                                                    Risk Appetite
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => setMandate({ ...mandate, riskLevel: 'conservative' })}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${mandate.riskLevel === 'conservative' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-fuchsia-200'}`}
                                                    >
                                                        Conservative
                                                    </button>
                                                    <button
                                                        onClick={() => setMandate({ ...mandate, riskLevel: 'moderate' })}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${mandate.riskLevel === 'moderate' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-fuchsia-200'}`}
                                                    >
                                                        Moderate
                                                    </button>
                                                    <button
                                                        onClick={() => setMandate({ ...mandate, riskLevel: 'aggressive' })}
                                                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${mandate.riskLevel === 'aggressive' ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-fuchsia-200'}`}
                                                    >
                                                        Aggressive
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Horizon */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 justify-between">
                                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span className="w-5 h-5 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center text-[9px] font-black">3</span>
                                                        Time Horizon
                                                    </label>
                                                    <span className="px-3 py-1 bg-fuchsia-600 text-white text-xs font-black rounded-lg">{mandate.horizon}Y</span>
                                                </div>
                                                <input
                                                    type="range" min="1" max="20" step="1"
                                                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-fuchsia-600"
                                                    value={mandate.horizon}
                                                    onChange={(e) => setMandate({ ...mandate, horizon: e.target.value })}
                                                />
                                                <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    <span>1Y</span><span>5Y</span><span>10Y</span><span>15Y</span><span>20Y</span>
                                                </div>
                                            </div>

                                            {/* Sectors */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span className="w-5 h-5 rounded-lg bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center text-[9px] font-black">4</span>
                                                    Sector Bias
                                                </label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { id: 'any',     label: 'Diversified' },
                                                        { id: 'IT',      label: 'Tech & SaaS' },
                                                        { id: 'Banking', label: 'Banking'     },
                                                        { id: 'Auto',    label: 'Automotive'  },
                                                        { id: 'Energy',  label: 'Energy'      },
                                                        { id: 'Pharma',  label: 'Pharma'      },
                                                    ].map((s) => (
                                                        <button
                                                            key={s.id}
                                                            onClick={() => {
                                                                if (s.id === 'any') {
                                                                    setMandate({ ...mandate, sectors: ['any'] });
                                                                } else {
                                                                    const current = mandate.sectors.filter(x => x !== 'any');
                                                                    const next = current.includes(s.id) ? current.filter(x => x !== s.id) : [...current, s.id];
                                                                    setMandate({ ...mandate, sectors: next.length ? next : ['any'] });
                                                                }
                                                            }}
                                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${mandate.sectors.includes(s.id)
                                                                ? 'bg-fuchsia-600 text-white border-fuchsia-600 shadow-md shadow-fuchsia-900/10'
                                                                : 'bg-white text-slate-400 border-slate-200 hover:border-fuchsia-300 hover:text-fuchsia-600'}`}
                                                        >
                                                            {s.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <button
                                                onClick={generateFullPlan}
                                                disabled={loading}
                                                className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-fuchsia-900/20 hover:shadow-fuchsia-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                                                {loading ? 'Architecting Blueprint...' : 'Generate Investment Plan'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Capability chips */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {[
                                            { icon: Brain,      label: 'AI Portfolio Design',  color: 'fuchsia' },
                                            { icon: ShieldCheck,label: 'Risk-Adjusted Returns', color: 'violet'  },
                                            { icon: BarChart2,  label: 'Backtest Simulation',   color: 'indigo'  },
                                            { icon: Zap,        label: 'One-Click Execution',   color: 'rose'    },
                                        ].map(({ icon: Icon, label, color }) => (
                                            <div key={label} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                <div className={`w-8 h-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-[11px] font-black text-slate-700 leading-tight">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-6">
                                    {loadingSaved ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                                            <RefreshCw className="w-10 h-10 text-slate-200 animate-spin" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Vault...</p>
                                        </div>
                                    ) : savedStrategies.length === 0 ? (
                                        <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100 shadow-sm">
                                            <History className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Saved Blueprints Found</p>
                                        </div>
                                    ) : (
                                        savedStrategies.map((s, sidx) => (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                key={s.id || `saved-${sidx}`} 
                                                className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:border-rose-200 hover:shadow-xl transition-all group relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[40px] -mr-12 -mt-12 group-hover:bg-rose-50 transition-colors" />
                                                
                                                <div className="flex justify-between items-start mb-6 relative z-10">
                                                    <div className="max-w-[70%]">
                                                        <h4 className="font-black text-slate-900 text-lg tracking-tight uppercase italic mb-1">{s.name}</h4>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => deleteStrategy(s.id)}
                                                        className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                <div className="flex gap-4 mb-6 relative z-10">
                                                    <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Assets</p>
                                                        <p className="font-black text-slate-900 text-sm">{s.data.allocation?.length || s.data.trades?.length || 0}</p>
                                                    </div>
                                                    <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Commitment</p>
                                                        <p className="font-black text-emerald-600 text-sm">₹{Number(s.data.totalCapital || 0).toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => {
                                                        setStrategy(s.data);
                                                        setMandate({
                                                            ...mandate,
                                                            amount: s.data.totalCapital?.toString() || mandate.amount
                                                        });
                                                        setActiveTab('generate');
                                                        toast.success('Strategy Loaded into Terminal');
                                                    }}
                                                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3"
                                                >
                                                    Load into Terminal
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* ── Right Column: Output Terminal ── */}
                    <div className="lg:col-span-7">
                        <FeatureLock featureName="AI Strategy Engine" description="Unlock institutional-grade investment blueprints and historical backtest simulations.">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[60px] border border-slate-200 shadow-[0_40px_100px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative min-h-[500px]"
                            >
                                {/* Header */}
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between backdrop-blur-xl relative z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                                            <Brain className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">Architect Output</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Awaiting Execution</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                        <button className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Output */}
                                <div className="flex-1 p-10 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-center">
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                className="flex flex-col items-center justify-center space-y-6 py-20"
                                            >
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-rose-500 rounded-full blur-xl opacity-20 animate-pulse" />
                                                    <div className="w-16 h-16 bg-white rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center relative z-10">
                                                        <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-black text-slate-900 text-lg tracking-tight mb-1">Architecting Blueprint...</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analyzing Market Liquidity & Technicals</p>
                                                </div>
                                            </motion.div>
                                        ) : strategy ? (
                                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                                className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/5 flex flex-col"
                                            >
                                                {/* Light header */}
                                                <div className="p-10 bg-slate-50 text-slate-900 relative overflow-hidden shrink-0 border-b border-slate-100">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full" />
                                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 blur-[80px] rounded-full" />

                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-8">
                                                            <div className="max-w-[55%]">
                                                                <div className="flex gap-3 mb-4">
                                                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-rose-600 uppercase tracking-widest shadow-sm">
                                                                        {strategy.riskScore} Risk
                                                                    </span>
                                                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-orange-600 uppercase tracking-widest shadow-sm">
                                                                        {strategy.horizon}
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-black text-slate-900 text-3xl tracking-tight leading-tight uppercase italic underline decoration-rose-500 decoration-4 underline-offset-8 mb-4">{strategy.strategyTitle}</h4>
                                                            </div>
                                                            <div className="flex gap-4 text-right shrink-0">
                                                                <div className="bg-white px-6 py-5 rounded-[24px] border border-slate-100 shadow-xl min-w-[140px] flex flex-col justify-center">
                                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Target CAGR</p>
                                                                    <p className="font-black text-emerald-600 text-2xl">{strategy.projectedReturnRange}</p>
                                                                </div>
                                                                {(() => {
                                                                    if (!strategy?.projectedReturnRange) return null;
                                                                    const matches = strategy.projectedReturnRange.match(/\d+(\.\d+)?/g);
                                                                    if (!matches || matches.length === 0) return null;
                                                                    const avgRate = (matches.reduce((a, b) => a + parseFloat(b), 0) / matches.length) / 100;
                                                                    const fv = parseFloat(mandate.amount) * Math.pow(1 + avgRate, parseFloat(mandate.horizon));
                                                                    return (
                                                                        <div className="bg-white px-6 py-5 rounded-[24px] border border-slate-100 shadow-xl min-w-[140px] flex flex-col justify-center">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Est. {mandate.horizon}Y Value</p>
                                                                            <p className="font-black text-emerald-600 text-2xl">{formatINR(fv)}</p>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-600 font-bold leading-relaxed text-sm max-w-2xl">{strategy.summary}</p>
                                                    </div>
                                                </div>

                                                {/* Allocation */}
                                                <div className="p-10 bg-white">
                                                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                                        <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Asset Allocation</h5>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">₹{Number(mandate.amount).toLocaleString()}</span>
                                                    </div>

                                                    <div className="space-y-4 mb-10">
                                                        {strategy.allocation.map((asset, aidx) => (
                                                            <div key={aidx} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-rose-200 hover:bg-white transition-all group">
                                                                <div className="flex items-center gap-5">
                                                                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center font-black text-slate-900 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                                                        {asset.name[0]}
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-black text-slate-900 text-base tracking-tight mb-0.5">{asset.displayName}</p>
                                                                        <div className="flex gap-2 items-center text-[10px] font-black uppercase tracking-widest">
                                                                            <span className="text-rose-500">{asset.name}</span>
                                                                            <span className="text-slate-300">•</span>
                                                                            <span className={asset.risk === 'Low' ? 'text-emerald-500' : asset.risk === 'High' ? 'text-rose-500' : 'text-amber-500'}>
                                                                                {asset.risk} Risk
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-black text-slate-900 text-lg mb-0.5">₹{asset.amount.toLocaleString()}</p>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{asset.weight}% Weight</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Market Outlook */}
                                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Market Outlook & Rationale</h5>
                                                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{strategy.marketOutlook}</p>
                                                    </div>

                                                    {/* Backtest result */}
                                                    {backtestData && (
                                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-8">
                                                            <div className="p-6 bg-gradient-to-br from-rose-50 to-orange-50 rounded-2xl border border-rose-100">
                                                                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-100/50">
                                                                    <History className="w-5 h-5 text-rose-500" />
                                                                    <h5 className="text-[11px] font-black text-rose-900 uppercase tracking-[0.2em]">Historical Backtest Simulation</h5>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                                    <div className="bg-white rounded-xl p-4 border border-rose-50 shadow-sm">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Simulated T0 Value</p>
                                                                        <p className="font-black text-slate-900 text-xl">₹{backtestData.historicalValue?.toLocaleString()}</p>
                                                                    </div>
                                                                    <div className="bg-white rounded-xl p-4 border border-rose-50 shadow-sm">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Historical CAGR</p>
                                                                        <p className="font-black text-emerald-600 text-xl">{backtestData.historicalCAGR}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-white/50 rounded-xl p-4 border border-rose-50">
                                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">AI Risk & Safety Analysis</p>
                                                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{backtestData.analysis}</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}

                                                    {/* Execution Terminal */}
                                                    <div className="mb-10 p-8 rounded-[40px] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                                                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                                                        
                                                        <div className="relative z-10">
                                                            <div className="flex items-center justify-between mb-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                                                        <Zap className="w-6 h-6 text-orange-400 fill-current" />
                                                                    </div>
                                                                    <div>
                                                                        <h6 className="text-lg font-black uppercase italic tracking-tight">Execution Terminal</h6>
                                                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Deploy Blueprint to Portfolio</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                                                    <button 
                                                                        onClick={() => setExecutionMode('mock')}
                                                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${executionMode === 'mock' ? 'bg-white text-slate-900 shadow-xl' : 'text-white/40 hover:text-white'}`}
                                                                    >
                                                                        Mock Deck
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setExecutionMode('live')}
                                                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${executionMode === 'live' ? 'bg-emerald-600 text-white shadow-xl' : 'text-white/40 hover:text-white'}`}
                                                                    >
                                                                        Live Sync
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Requirement</p>
                                                                    <p className="text-2xl font-black">₹{Number(mandate.amount).toLocaleString()}</p>
                                                                </div>
                                                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                                                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-2">Availability ({executionMode.toUpperCase()})</p>
                                                                    <p className={`text-2xl font-black ${executionMode === 'mock' ? (user?.mockBalance >= Number(mandate.amount) ? 'text-emerald-400' : 'text-rose-400') : (user?.brokerAccess ? 'text-emerald-400' : 'text-rose-400')}`}>
                                                                        {executionMode === 'mock' ? `₹${user?.mockBalance?.toLocaleString() || '0'}` : (user?.brokerAccess ? 'Broker Linked' : 'No Connection')}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {executionMode === 'live' && !user?.brokerAccess && (
                                                                <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-8">
                                                                    <ShieldAlert className="w-5 h-5 text-rose-500" />
                                                                    <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest leading-relaxed">
                                                                        Broker authentication required. Please visit the <span className="text-rose-500 underline">Settings</span> page to establish a secure handshake.
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <button 
                                                                onClick={handleDeployRequest}
                                                                disabled={executing || (executionMode === 'live' && !user?.brokerAccess)}
                                                                className={`w-full py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95 ${executing ? 'bg-slate-800 text-white/50 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-rose-600 text-white hover:shadow-orange-600/20'}`}
                                                            >
                                                                {executing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-6 h-6" />}
                                                                {executing ? 'Transmitting...' : `Deploy strategy in ${executionMode} Mode`}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex justify-end gap-4 border-t border-slate-100 pt-8">
                                                        <button
                                                            onClick={runBacktest}
                                                            disabled={backtestLoading}
                                                            className="px-8 py-4 bg-white text-rose-500 border border-rose-100 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-50 hover:border-rose-200 transition-all flex items-center gap-3 disabled:opacity-50"
                                                        >
                                                            {backtestLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                                                            {backtestLoading ? 'Simulating...' : 'Quick Backtest'}
                                                        </button>
                                                        <button
                                                            onClick={() => saveStrategyToDB(strategy)}
                                                            className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center gap-3"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                            Save to Vault
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="h-full flex flex-col items-center justify-center text-center px-10"
                                            >
                                                <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mb-8 border border-rose-100">
                                                    <Layers className="w-10 h-10 text-rose-300" />
                                                </div>
                                                <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-4">Awaiting Mandate</h3>
                                                <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                                                    Configure your investment parameters on the left and click 'Generate Plan' to architect a custom quantitative portfolio.
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        </FeatureLock>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AIStrategist;
