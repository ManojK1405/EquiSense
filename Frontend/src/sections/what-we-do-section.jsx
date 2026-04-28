import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

export default function WhatWeDoSection() {
    return (
        <section className="flex flex-col lg:flex-row items-center justify-center gap-16 md:gap-24 px-6 md:px-16 lg:px-24 py-32 bg-slate-50/30">
            <div className="relative shadow-2xl shadow-orange-600/20 rounded-[64px] overflow-hidden shrink-0 lg:w-1/3">
                <img className="w-full aspect-square object-cover"
                    src="https://images.unsplash.com/photo-1642790106117-e829e14a795f?q=80&w=600&auto=format&fit=crop"
                    alt="Data Intelligence" />
                <div className="flex items-center gap-3 absolute bottom-10 left-10 bg-white/90 backdrop-blur-md p-6 rounded-[32px] border border-white/20 shadow-xl">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black">98%</div>
                    <div>
                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Signal Confidence</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">Institutional Grade</p>
                    </div>
                </div>
            </div>
            <div className="text-sm text-slate-500 max-w-xl">
                <h1 className="text-xs uppercase font-black text-orange-600 tracking-[0.2em] mb-2">Our Philosophy</h1>
                <h2 className="text-4xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">Clarity over Noise. Strategy over Emotion.</h2>
                <div className="w-20 h-1.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-200 mb-8" />
                
                <div className="space-y-6 text-lg leading-relaxed text-slate-600 pr-4">
                    <p>The stock market promises opportunity—but for most people, it feels like a maze. Every day, millions of investors make decisions based on fragmented information or delayed insights.</p>
                    <p>We’ve seen how fear and greed drive decisions more than logic. That’s why we’re building <span className="text-slate-900 font-bold italic">EquiSense</span>. Our goal is simple: to make intelligent investing accessible, systematic, and emotion-free.</p>
                    <p className="border-l-4 border-orange-600 pl-6 py-2 font-bold text-slate-900 italic text-xl bg-orange-50/50 rounded-r-2xl">
                        "Because investing shouldn’t feel like gambling. It should feel like understanding."
                    </p>
                    <p>Through AI and algorithmic analysis, we aim to cut through the noise—bringing real-time data and market sentiment into one clear, actionable view. Welcome to a smarter way to invest.</p>
                </div>
                
                <Link 
                    to="/about-us"
                    className="flex items-center gap-2 mt-10 hover:bg-slate-800 transition bg-slate-900 py-4 px-10 rounded-full text-white font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-slate-900/20 w-fit">
                    <span>Explore Our Story</span>
                    <ArrowRightIcon className='size-4' />
                </Link>
            </div>
        </section>
    );
};