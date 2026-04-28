import React, { useState } from 'react';
import { Target, Calculator, TrendingUp, ShieldCheck, Layers, RefreshCw, ArrowRight, Sparkles, Zap, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';
import PageHero from '../components/PageHero';

const formatINR = (val) => {
    if (!val) return '₹--';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${Math.round(val).toLocaleString()}`;
};

const allocationColors = {
    Stock: 'bg-orange-500',
    Debt: 'bg-orange-400',
    Gold: 'bg-amber-400',
    Cash: 'bg-emerald-400',
};

const allocationBadgeColors = {
    Stock: 'bg-orange-50 text-orange-600 border-orange-100',
    Debt: 'bg-orange-50 text-orange-600 border-orange-100',
    Gold: 'bg-amber-50 text-amber-600 border-amber-100',
    Cash: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

const ReverseStrategist = () => {
    const [goalQuery, setGoalQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const goalExamples = [
        'Buy a house worth ₹2 Crore in 8 years',
        'Retire with ₹5 Crore corpus in 20 years',
        'Fund my child\'s foreign education in 15 years',
        'Buy a Porsche Cayenne in 6 years',
        'Save ₹1 Crore emergency fund in 5 years',
    ];

    const handleGenerate = async (previousResult = null) => {
        if (!goalQuery.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const payload = { goalQuery };
            if (previousResult) payload.previousResult = previousResult;
            const res = await api.post('/strategy/reverse', payload);
            setResult(res.data);
        } catch (e) {
            console.error(e);
            setError('Blueprint generation failed. Please refine your goal.');
        } finally {
            setLoading(false);
        }
    };

    const feasibilityColor = (score) => {
        if (score >= 75) return 'text-emerald-400';
        if (score >= 50) return 'text-amber-400';
        return 'text-rose-400';
    };

    return (
        <div className="bg-white min-h-screen font-sans selection:bg-orange-100 selection:text-orange-900 relative">
            <PageHero
                variant="minimal-left"
                badge={{ icon: Target, label: 'Goal-Based Wealth Engine' }}
                title="Goal"
                titleAccent="Backcaster"
                subtitle="Tell us your dream in plain language. We'll reverse-engineer the exact monthly investment you need to get there, inflation-adjusted."
                accentColor="emerald"
                stats={[
                    { label: 'Inflation Adjusted', value: 'Yes ✓', color: 'emerald' },
                    { label: 'Horizon Support', value: '1–30Y' },
                    { label: 'Asset Classes', value: '4 Types' },
                    { label: 'AI-Powered', value: 'Gemini' },
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* ── Left Column: Goal Input ── */}
                    <div className="lg:col-span-5 space-y-5">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>

                            {/* Input Card */}
                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                                <div className="h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500" />
                                <div className="p-8 space-y-6">

                                    {/* Goal input */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[9px] font-black">1</span>
                                            Describe Your Financial Goal
                                        </label>
                                        <textarea
                                            placeholder="e.g. Buy a house worth ₹2 Crore in 8 years"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/8 transition-all min-h-[110px] resize-none text-sm"
                                            value={goalQuery}
                                            onChange={(e) => setGoalQuery(e.target.value)}
                                        />
                                    </div>

                                    {/* Quick examples */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-[9px] font-black">2</span>
                                            Quick Start Goals
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {goalExamples.map((ex, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setGoalQuery(ex)}
                                                    className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all"
                                                >
                                                    {ex.length > 32 ? ex.slice(0, 32) + '…' : ex}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button
                                        onClick={() => handleGenerate()}
                                        disabled={loading || !goalQuery.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                                        {loading ? 'Blueprinting...' : 'Generate Wealth Blueprint'}
                                    </button>
                                </div>
                            </div>

                            {/* Feature chips */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: Target,     label: 'Goal Modelling',          color: 'emerald' },
                                    { icon: Calculator, label: 'SIP Calculator',           color: 'teal' },
                                    { icon: ShieldCheck,label: 'Inflation Adjusted',       color: 'cyan' },
                                    { icon: PieChart,   label: 'Asset Allocation',         color: 'indigo' },
                                ].map(({ icon: Icon, label, color }) => (
                                    <div key={label} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                        <div className={`w-8 h-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-700 leading-tight">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* How it works */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How it works</p>
                                {[
                                    'Describe any financial goal in plain language',
                                    'AI estimates inflation-adjusted future cost',
                                    'Calculates required monthly SIP at 12.5% CAGR',
                                    'Blueprints a diversified asset allocation plan',
                                    'Scores feasibility with expert advisory notes',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                                        <p className="text-[12px] text-slate-600 font-medium leading-snug">{step}</p>
                                    </div>
                                ))}
                            </div>

                        </motion.div>
                    </div>

                    {/* ── Right Column: Blueprint Output ── */}
                    <div className="lg:col-span-7">
                        <FeatureLock featureName="Wealth Architect" description="Unlock inflation-adjusted goal modeling, custom SIP calculations, and expert advisory orangeprints.">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[60px] border border-slate-200 shadow-[0_40px_100px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative min-h-[500px]"
                            >
                                {/* Header */}
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between backdrop-blur-xl relative z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${result ? 'bg-rose-500 shadow-rose-900/20' : 'bg-slate-900 shadow-slate-900/20'}`}>
                                            {result ? <Calculator className="w-6 h-6" /> : <Target className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">
                                                {result ? result.goalTitle : 'Wealth Blueprint Engine'}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                                    {result ? `${result.timeframeYears}-Year Inflation-Adjusted Plan` : 'Awaiting Goal Mandate'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Output Area */}
                                <div className="flex-1 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-center p-6">
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modeling Inflation & Market Returns</p>
                                                </div>
                                            </motion.div>
                                        ) : error ? (
                                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                                                <p className="text-rose-500 font-black">{error}</p>
                                            </motion.div>
                                        ) : result ? (
                                            <motion.div
                                                key="result"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl shadow-orange-900/5"
                                            >
                                                {/* Dark Header */}
                                                <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 blur-[100px] rounded-full" />
                                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/20 blur-[80px] rounded-full" />
                                                    <div className="relative z-10">
                                                        <div className="flex justify-between items-start mb-6">
                                                            <div className="max-w-[55%]">
                                                                <div className="flex gap-3 mb-4">
                                                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black text-rose-300 uppercase tracking-widest">
                                                                        {result.timeframeYears}Y Horizon
                                                                    </span>
                                                                    <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-lg text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                                                                        {result.compoundedInflation}
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-black text-white text-2xl tracking-tight leading-tight">{result.goalTitle}</h4>
                                                            </div>
                                                            {/* Feasibility Score */}
                                                            <div className="bg-white/5 backdrop-blur-xl px-6 py-5 rounded-2xl border border-white/10 text-center shrink-0">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Feasibility</p>
                                                                <p className={`font-black text-3xl ${feasibilityColor(result.feasibilityScore)}`}>{result.feasibilityScore}</p>
                                                                <p className="text-[9px] text-slate-500 font-black">/100</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Key Metrics Row */}
                                                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                                                    <div className="p-6 text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Cost</p>
                                                        <p className="font-black text-slate-900 text-xl">{formatINR(result.currentValuation)}</p>
                                                    </div>
                                                    <div className="p-6 text-center bg-rose-50">
                                                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2">Future Value</p>
                                                        <p className="font-black text-rose-700 text-xl">{formatINR(result.futureValuation)}</p>
                                                    </div>
                                                    <div className="p-6 text-center bg-orange-50">
                                                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">Monthly SIP</p>
                                                        <p className="font-black text-orange-700 text-xl">{formatINR(result.monthlySIP)}</p>
                                                        <p className="text-[9px] text-slate-400 font-black mt-0.5">@ {result.assumedAnnualReturn}% CAGR</p>
                                                    </div>
                                                </div>

                                                {/* Allocation Plan */}
                                                <div className="p-8 border-b border-slate-100">
                                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Portfolio Allocation Blueprint</h5>
                                                    <div className="space-y-4">
                                                        {result.allocation?.map((alloc, i) => (
                                                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-orange-100 hover:bg-white transition-all group">
                                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm shrink-0 shadow-sm ${allocationColors[alloc.type] || 'bg-slate-700'}`}>
                                                                    {alloc.percentage}%
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="font-black text-slate-900 text-sm">{alloc.type}</p>
                                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${allocationBadgeColors[alloc.type] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                                            {alloc.percentage}% Weight
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-orange-600 font-black mb-1 truncate">{alloc.assets}</p>
                                                                    <p className="text-[11px] text-slate-500 font-medium leading-snug">{alloc.logic}</p>
                                                                </div>
                                                                {/* Weight bar */}
                                                                <div className="w-16 flex flex-col items-end justify-center gap-1 shrink-0">
                                                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                                        <div className={`h-1.5 rounded-full ${allocationColors[alloc.type] || 'bg-slate-400'}`} style={{ width: `${alloc.percentage}%` }} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Architect Advisory Note */}
                                                <div className="p-8">
                                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-6">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                                                            <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Wealth Architect Advisory</h5>
                                                        </div>
                                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">{result.architectAdvice}</p>
                                                    </div>

                                                    <button
                                                        onClick={() => handleGenerate(result)}
                                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 hover:shadow-xl hover:shadow-rose-900/20 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                        Regenerate Blueprint
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="empty"
                                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="h-full flex flex-col items-center justify-center text-center px-10"
                                            >
                                                <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mb-8 border border-rose-100">
                                                    <Target className="w-10 h-10 text-rose-300" />
                                                </div>
                                                <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-4">Define Your Destination</h3>
                                                <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                                                    Describe any financial goal in plain language — buying a home, funding education, or building a retirement corpus — and we'll orangeprint the path.
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

export default ReverseStrategist;
