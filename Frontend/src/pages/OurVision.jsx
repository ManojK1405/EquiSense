import React from 'react';
import { motion } from 'framer-motion';
import { Target, Eye, ShieldCheck, Zap, Globe, Cpu, BrainCircuit, Bot, TrendingUp, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OurVision() {
    const pilotFeatures = [
        { icon: BrainCircuit, label: 'Adaptive Strategy Engine', desc: 'The agent continuously learns from market conditions and updates its strategy in real-time to align with momentum shifts.' },
        { icon: Lock, label: 'Capital-Protected Limits', desc: 'You define the capital limit. The agent never exceeds your boundary, ensuring you always stay in complete control.' },
        { icon: RefreshCw, label: '24/7 Trade Orchestration', desc: 'Market timings are handled automatically. The agent queues, executes, and settles trades across sessions without manual input.' },
        { icon: TrendingUp, label: 'Live & Mock Modes', desc: 'Paper trade first. Graduate to live execution with real broker integration (Zerodha) when you\'re confident in the performance.' },
    ];

    return (
        <div className="bg-slate-50/30 min-h-screen pt-32 pb-20">
            <div className="max-w-6xl mx-auto px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-32"
                >
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-8 uppercase italic pb-2 leading-tight">
                        Our <span className="text-premium">Vision</span>
                    </h1>
                    <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-3xl mx-auto">
                        Redefining wealth creation through the intersection of systematic logic and artificial intelligence.
                    </p>
                </motion.div>

                {/* The North Star Section */}
                <section className="mb-40 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-white rounded-[64px] shadow-2xl shadow-slate-200/50 border border-slate-100 -z-10" />
                    <div className="max-w-5xl mx-auto relative z-10 text-center py-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest mb-8">
                            <Eye className="size-4" />
                            <span>The North Star</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold mb-16 text-slate-900 tracking-tight">One Vision. Infinite Clarity.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                            <div className="bg-slate-50/50 p-10 rounded-[40px] border border-slate-100 transition-all duration-300 hover:shadow-xl hover:bg-white group">
                                <div className="size-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mb-8 border border-orange-200 group-hover:scale-110 transition-transform">
                                    <Target className="size-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">The Aim</h3>
                                <p className="text-slate-600 leading-relaxed">To democratize institutional-grade quant analysis, making sophisticated strategies accessible to every retail investor.</p>
                            </div>
                            <div className="bg-slate-50/50 p-10 rounded-[40px] border border-slate-100 transition-all duration-300 hover:shadow-xl hover:bg-white group">
                                <div className="size-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-8 border border-blue-200 group-hover:scale-110 transition-transform">
                                    <Eye className="size-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">The Vision</h3>
                                <p className="text-slate-600 leading-relaxed">A financial ecosystem where decisions are driven by data, not dopamine. Where trade is backed by systematic logic.</p>
                            </div>
                            <div className="bg-slate-50/50 p-10 rounded-[40px] border border-slate-100 transition-all duration-300 hover:shadow-xl hover:bg-white group">
                                <div className="size-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-8 border border-emerald-200 group-hover:scale-110 transition-transform">
                                    <ShieldCheck className="size-8" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">The Intention</h3>
                                <p className="text-slate-600 leading-relaxed">To build a legacy of transparency. EquiSense is a movement towards financial sovereignty through intelligence.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="space-y-40 mb-40">
                    <section className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <Globe className="w-12 h-12 text-orange-500 mb-8" />
                            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight italic">Global Intelligence, Local Focus</h2>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                We envision a future where every Indian investor can harness global-scale data to dominate local market opportunities. EquiSense aims to be the bridge between complex quantitative math and actionable investment blueprints.
                            </p>
                        </div>
                        <div className="aspect-video bg-white rounded-[48px] shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                            <div className="p-10 text-center">
                                <Zap className="w-20 h-20 text-orange-500 mx-auto mb-4" />
                                <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Real-Time Sync</p>
                            </div>
                        </div>
                    </section>

                    <section className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="order-2 md:order-1 aspect-video bg-white rounded-[48px] flex items-center justify-center shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-50" />
                            <Cpu className="w-20 h-20 text-orange-500 relative z-10" />
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight italic">The AI Advantage</h2>
                            <p className="text-slate-600 leading-relaxed text-lg">
                                Our vision is to evolve from a research terminal into a fully autonomous wealth orchestrator. We are building a future where AI doesn't just suggest trades, but dynamically adapts to market volatility to preserve and grow capital.
                            </p>
                        </div>
                    </section>

                    {/* EquiTrade AI Pilot Feature Section */}
                    <motion.section
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        className="relative overflow-hidden rounded-[64px] bg-slate-900 p-16 md:p-20"
                    >
                        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] -mr-32 -mt-32 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-600/10 rounded-full blur-[120px] -ml-32 -mb-32 pointer-events-none" />

                        <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600/20 text-orange-400 rounded-full text-xs font-black uppercase tracking-widest mb-8 border border-orange-600/20">
                                    <Bot className="size-4" />
                                    <span>EquiTrade AI Pilot</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 leading-tight">
                                    Your AI Agent. <br/>
                                    <span className="text-orange-500">Trading On Autopilot.</span>
                                </h2>
                                <p className="text-slate-400 leading-relaxed text-lg mb-6">
                                    EquiTrade is our most ambitious feature: a fully autonomous AI trading agent that monitors the market 24/7, executes trades on your behalf, and dynamically manages risk — all within the boundaries you define.
                                </p>
                                <p className="text-slate-500 leading-relaxed mb-10">
                                    No emotion. No hesitation. Just systematic, data-driven execution powered by our institutional-grade quant engine. You set the rules, the agent does the work.
                                </p>
                                <Link 
                                    to="/products/portfolio"
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-sm uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-105 transition-all"
                                >
                                    <Bot className="w-5 h-5" />
                                    Activate AI Pilot
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 gap-5">
                                {pilotFeatures.map((f, idx) => (
                                    <motion.div
                                        key={f.label}
                                        initial={{ opacity: 0, x: 20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1, duration: 0.5 }}
                                        className="flex items-start gap-5 p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-orange-600/20 flex items-center justify-center shrink-0 border border-orange-600/20 group-hover:scale-110 transition-transform">
                                            <f.icon className="w-6 h-6 text-orange-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white uppercase tracking-wider mb-1">{f.label}</p>
                                            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </motion.section>
                </div>

                <section className="text-center bg-white rounded-[64px] p-20 border border-slate-100 shadow-xl shadow-slate-200/50">
                    <div className="size-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-10">
                        <Zap className="size-10" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter italic">Join the Systematic Revolution.</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed text-xl font-medium">
                        We aren't just building a product; we're building a new standard for how wealth is managed in the digital age.
                    </p>
                </section>
            </div>
        </div>
    );
}
