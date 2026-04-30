import React, { useState } from 'react';
import { History, ShieldCheck, RefreshCw, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import FeatureLock from '../components/feature-lock';
import PageHero from '../components/PageHero';

const Backtester = () => {
    const [customStrategyInput, setCustomStrategyInput] = useState('');
    const [amount, setAmount] = useState('500000');
    const [horizon, setHorizon] = useState('5');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const runBacktest = async () => {
        if (!customStrategyInput.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/strategy/custom-backtest', {
                userInput: customStrategyInput,
                horizon,
                amount,
            });
            setResult(res.data);
        } catch (e) {
            console.error(e);
            setError('Backtest simulation failed. Please refine your strategy input.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen font-sans selection:bg-rose-100 selection:text-rose-900 relative">
            <PageHero
                variant="gradient-bold"
                badge={{ icon: BarChart2, label: 'Historical Simulation Engine' }}
                title="Strategy"
                titleAccent="Backtester"
                subtitle="Describe your portfolio in plain English and simulate how it would have performed historically. Powered by our institutional backtest engine."
                accentColor="indigo"
                stats={[
                    { label: 'Data History', value: '10Y+' },
                    { label: 'Simulation Speed', value: '<2s' },
                    { label: 'Risk Metrics', value: '12+' },
                    { label: 'Asset Classes', value: 'Equities' },
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">

                    {/* ── Left: Input Panel ── */}
                    <div className="lg:col-span-5 space-y-5">
                        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>

                            {/* Input Card */}
                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">
                                {/* Accent bar */}
                                <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                                <div className="p-8 space-y-6">

                                    {/* Strategy textarea */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-black">1</span>
                                            Strategy Composition
                                        </label>
                                        <textarea
                                            placeholder="e.g. 50% TCS, 25% HDFC Bank, 25% ITC"
                                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/8 transition-all min-h-[110px] resize-none text-sm"
                                            value={customStrategyInput}
                                            onChange={(e) => setCustomStrategyInput(e.target.value)}
                                        />
                                    </div>

                                    {/* Capital input */}
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-black">2</span>
                                            Capital Commitment
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</span>
                                            <input
                                                type="number"
                                                className="w-full pl-10 pr-16 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/8 transition-all"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">INR</span>
                                        </div>
                                    </div>

                                    {/* Horizon slider */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 justify-between">
                                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[9px] font-black">3</span>
                                                Historical Lookback
                                            </label>
                                            <span className="px-3 py-1 bg-indigo-600 text-white text-xs font-black rounded-lg">
                                                {horizon}Y
                                            </span>
                                        </div>
                                        <input
                                            type="range" min="1" max="20" step="1"
                                            className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                            value={horizon}
                                            onChange={(e) => setHorizon(e.target.value)}
                                        />
                                        <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                            <span>1Y</span><span>5Y</span><span>10Y</span><span>15Y</span><span>20Y</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <button
                                        onClick={runBacktest}
                                        disabled={loading || !customStrategyInput.trim()}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/20 hover:shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                                        {loading ? 'Simulating...' : 'Run Historical Simulation'}
                                    </button>
                                </div>
                            </div>

                            {/* Feature chips */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: TrendingUp,   label: 'Win Rate Analysis',     color: 'emerald' },
                                    { icon: ShieldCheck,  label: 'Drawdown Protection',   color: 'indigo' },
                                    { icon: BarChart2,    label: 'Sharpe & Sortino',       color: 'violet' },
                                    { icon: Activity,     label: 'Equity Curve',           color: 'rose' },
                                ].map(({ icon: Icon, label, color }) => (
                                    <div key={label} className={`flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm`}>
                                        <div className={`w-8 h-8 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-700 leading-tight">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* How it works — timeline */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">How it works</p>
                                {[
                                    'Describe your portfolio in plain English',
                                    'AI maps tickers and weights across the market',
                                    'Historical simulation runs across chosen period',
                                    'Metrics: Win Rate, Max Drawdown, Sharpe Ratio',
                                    'Optimization suggestions generated',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                                        <p className="text-[12px] text-slate-600 font-medium leading-snug">{step}</p>
                                    </div>
                                ))}
                            </div>

                        </motion.div>
                    </div>

                    {/* ── Right: Results Panel ── */}
                    <div className="lg:col-span-7">
                        <FeatureLock featureName="Strategy Backtester" description="Unlock advanced historical simulation results, drawdown analysis, and AI risk scoring.">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-white rounded-[60px] border border-slate-200 shadow-[0_40px_100px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden relative min-h-[500px]"
                            >
                                {/* Header */}
                                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between backdrop-blur-xl relative z-10 shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl ${result ? 'bg-rose-500 shadow-rose-900/20' : 'bg-slate-900 shadow-slate-900/20'}`}>
                                            <History className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1.5">Backtest Results</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Historical Simulation Engine</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Output */}
                                <div className="flex-1 p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] flex flex-col justify-center">
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
                                                    <p className="font-black text-slate-900 text-lg tracking-tight mb-1">Simulating History...</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Running {horizon}-Year Portfolio Replay</p>
                                                </div>
                                            </motion.div>
                                        ) : error ? (
                                            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                                                <p className="text-rose-500 font-black">{error}</p>
                                            </motion.div>
                                        ) : result ? (
                                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                                className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-2xl shadow-slate-900/5"
                                            >
                                                {/* Light Header */}
                                                <div className="p-10 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full" />
                                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/5 blur-[60px] rounded-full" />
                                                    <div className="relative z-10">
                                                        <div className="flex flex-wrap gap-3 mb-6">
                                                            <span className="px-4 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                                                                <History className="w-3 h-3 text-slate-400" />
                                                                {horizon}-Year Simulation
                                                            </span>
                                                            <span className={`px-4 py-1.5 ${result.historicalValue < amount ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'} border shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                                                                <TrendingUp className="w-3 h-3" />
                                                                CAGR {result.historicalCAGR}
                                                            </span>
                                                        </div>
                                                        <h4 className="font-black text-slate-900 text-3xl tracking-tighter leading-tight mb-2">Historical Performance Report</h4>
                                                        <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                                                            <Activity className="w-4 h-4 text-slate-400" />
                                                            Based on ₹{Number(amount).toLocaleString()} invested {horizon} years ago
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Value Comparison */}
                                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                                    <div className="p-8 text-center">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Initial Investment</p>
                                                        <p className="font-black text-slate-900 text-2xl">₹{Number(amount).toLocaleString()}</p>
                                                    </div>
                                                    <div className={`p-8 text-center ${result.historicalValue < amount ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                                                        <p className={`text-[10px] font-black ${result.historicalValue < amount ? 'text-rose-600' : 'text-emerald-600'} uppercase tracking-widest mb-2`}>Value Today (Simulated)</p>
                                                        <p className={`font-black ${result.historicalValue < amount ? 'text-rose-700' : 'text-emerald-700'} text-2xl`}>₹{result.historicalValue?.toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Parsed Allocation */}
                                                {result.parsedAllocation && (
                                                    <div className="p-8 border-b border-slate-100">
                                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Parsed Portfolio Weights</h5>
                                                        <div className="space-y-3">
                                                            {result.parsedAllocation.map((a, i) => (
                                                                <div key={i} className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center font-black text-rose-600 text-xs shrink-0">
                                                                        {a.name?.[0]}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="font-black text-slate-800 text-sm">{a.displayName}</span>
                                                                            <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{a.weight}%</span>
                                                                        </div>
                                                                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                                            <div className="bg-gradient-to-r from-rose-500 to-orange-400 h-1.5 rounded-full" style={{ width: `${a.weight}%` }} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* AI Risk Analysis */}
                                                <div className="p-8">
                                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-5">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                                                            <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">AI Risk & Safety Assessment</h5>
                                                        </div>
                                                        <p className="text-sm text-amber-900 font-medium leading-relaxed">{result.analysis}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setResult(null)}
                                                        className="w-full py-3 border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-rose-200 hover:text-rose-500 transition-all"
                                                    >
                                                        Reset Simulation
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="h-full flex flex-col items-center justify-center text-center px-10"
                                            >
                                                <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mb-8 border border-rose-100">
                                                    <History className="w-10 h-10 text-rose-300" />
                                                </div>
                                                <h3 className="font-black text-slate-900 text-2xl tracking-tight mb-4">Backtest Engine Ready</h3>
                                                <p className="text-slate-500 font-medium leading-relaxed max-w-sm">
                                                    Enter your custom strategy on the left (e.g. "50% TCS, 30% HDFC, 20% ITC") and click Simulate.
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

export default Backtester;
