import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, MapPin, Phone } from 'lucide-react';

export default function ContactUs() {
    return (
        <div className="bg-white min-h-screen pt-32 pb-20">
            <div className="max-w-5xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-6 uppercase italic">
                        Contact <span className="text-premium">Us</span>
                    </h1>
                    <p className="text-xl text-slate-500 leading-relaxed font-medium">
                        Need assistance with the terminal or have questions about our institutional strategies? We're here to help.
                    </p>
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 hover:border-orange-200 transition-colors group">
                            <Mail className="w-8 h-8 text-orange-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Email Support</h3>
                            <p className="text-slate-500 font-bold">manojequisense@gmail.com</p>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-[40px] border border-slate-100 hover:border-rose-200 transition-colors group">
                            <MessageSquare className="w-8 h-8 text-rose-500 mb-6 group-hover:scale-110 transition-transform" />
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">Institutional Inquiries</h3>
                            <p className="text-slate-500 font-bold">manojequisense@gmail.com</p>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <form className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 transition-all text-sm font-bold" placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                                    <input type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 transition-all text-sm font-bold" placeholder="john@company.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                                <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 transition-all text-sm font-bold" placeholder="Strategy Inquiry" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                                <textarea rows="4" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 transition-all text-sm font-bold resize-none" placeholder="How can we help you?"></textarea>
                            </div>
                            <button className="w-full py-5 rounded-2xl btn text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-500/20 active:scale-95 transition-all">
                                Send Transmission
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
