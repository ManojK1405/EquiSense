import React from 'react';
import { motion } from 'framer-motion';
import { Target, Users, Shield, TrendingUp, Heart, Quote } from 'lucide-react';

export default function AboutUs() {
    return (
        <div className="bg-slate-50/30 min-h-screen pt-32 pb-20">
            {/* Hero Section */}
            <div className="max-w-6xl mx-auto px-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-32"
                >
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-8 uppercase italic pb-2 leading-tight">
                        About <span className="text-premium">EquiSense</span>
                    </h1>
                    <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-3xl mx-auto">
                        We are a team of quantitative analysts and engineers dedicated to democratizing institutional-grade investment intelligence.
                    </p>
                </motion.div>

                {/* The Genesis / Our Story */}
                <section className="mb-40">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-full text-xs font-black uppercase tracking-widest">
                                <Heart className="size-4" />
                                <span>The Genesis</span>
                            </div>
                            <h2 className="text-4xl font-bold text-slate-900 leading-tight">
                                Investing shouldn't feel like gambling.
                            </h2>
                            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                                <p>
                                    We started EquiSense because we saw a fundamental injustice in the financial markets. While institutional giants leveraged high-frequency data and AI-driven sentiment, the retail investor was left with fragmented news and "gut feelings."
                                </p>
                                <p>
                                    Our intention was never just to build another stock app. It was to build a bridge between intuition and institutional logic. We believe that clarity is the most valuable asset in any portfolio.
                                </p>
                                <p className="border-l-4 border-orange-600 pl-6 py-2 font-bold text-slate-900 italic text-xl bg-orange-50/50 rounded-r-2xl">
                                    "Clarity over Noise. Strategy over Emotion."
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <div className="bg-white p-10 rounded-[48px] shadow-2xl border border-slate-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-slate-50">
                                    <Quote className="size-24" />
                                </div>
                                <div className="space-y-8 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-2xl bg-orange-600 flex items-center justify-center text-white">
                                            <TrendingUp className="size-6" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">Our Motivation</h3>
                                    </div>
                                    <p className="text-slate-600 italic leading-relaxed text-lg">
                                        "We realized that the difference between a successful trade and a costly mistake often came down to one thing: Information Clarity. We decided to automate that for everyone."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Market Gap Section */}
                <section className="mb-40">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                                    <p className="text-4xl font-black text-orange-600 mb-2">95%</p>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Retail Failure Rate</p>
                                </div>
                                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm mt-8">
                                    <p className="text-4xl font-black text-blue-600 mb-2">$2T+</p>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Quant AUM Growth</p>
                                </div>
                                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                                    <p className="text-4xl font-black text-emerald-600 mb-2">10x</p>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Data Processing</p>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2 space-y-8">
                            <h2 className="text-4xl font-bold text-slate-900 leading-tight">Closing the Intelligence Gap.</h2>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                The gap between institutional capabilities and retail tools has never been wider. While the top 1% use AI to predict moves, the rest of the market reacts to stale headlines. 
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                EquiSense provides the same computational power, sentiment clarity, and systematic discipline once reserved only for hedge funds.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Values */}
                <div className="grid md:grid-cols-2 gap-12 mb-40">
                    <div className="p-10 bg-white rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-shadow">
                        <Users className="w-12 h-12 text-blue-500 mb-6" />
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Quantitative Expertise</h3>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            Our models are built on decades of historical data and refined with modern machine learning to identify high-probability momentum breakouts.
                        </p>
                    </div>
                    <div className="p-10 bg-white rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-shadow">
                        <Shield className="w-12 h-12 text-orange-500 mb-6" />
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Data Integrity</h3>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            We prioritize accuracy above all else. Our real-time data pipelines are rigorously validated to ensure you're making decisions on sound information.
                        </p>
                    </div>
                </div>

                <section className="text-center bg-white rounded-[64px] p-20 border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-[120px] rounded-full" />
                    <h2 className="text-4xl font-black mb-8 italic tracking-tight text-slate-900">Institutional Quality. Always.</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto leading-relaxed text-xl">
                        Since our inception, we've focused on one thing: building the most reliable research terminal for the modern systematic investor.
                    </p>
                </section>
            </div>
        </div>
    );
}
