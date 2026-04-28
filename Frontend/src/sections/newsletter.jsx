import SectionTitle from '../components/section-title';
import React, { useState } from 'react';
import api from '../api';
import { Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Newsletter() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            await api.post('/newsletter/subscribe', { email });
            setSuccess(true);
            setEmail('');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className='flex flex-col items-center justify-center mt-40 relative px-6'>
            {/* Background Accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-orange-100/30 blur-[100px] rounded-full -z-10" />

            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm mb-6">
                <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className={`size-5 rounded-full border border-white bg-slate-${i + 1}00 overflow-hidden`}>
                            <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" />
                        </div>
                    ))}
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">+50,000 Investors</p>
            </div>

            <SectionTitle title='The Intelligence Brief' subtitle='Get institutional-grade market insights and AI-driven alerts delivered to your inbox.' />

            <motion.form 
                onSubmit={handleSubscribe} 
                className='flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-full w-full max-w-xl my-10 border border-slate-200 shadow-xl shadow-slate-200/40 focus-within:border-orange-200 focus-within:ring-4 focus-within:ring-orange-100/50 transition-all duration-300'
            >
                <div className="pl-4 text-slate-400">
                    {success ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Mail className="size-5" />}
                </div>
                <input 
                    className='flex-1 rounded-full px-4 py-3 outline-none bg-transparent text-slate-700 font-medium placeholder:text-slate-400' 
                    type='email' 
                    placeholder={success ? 'You are on the list!' : 'Enter your email address'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={success || loading}
                />
                <button 
                    type="submit"
                    disabled={loading || success}
                    className='font-bold btn text-white px-8 py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg shadow-orange-500/20 disabled:bg-slate-400 disabled:shadow-none'
                >
                    {loading ? 'Joining...' : success ? 'Joined' : 'Get Updates'}
                </button>
            </motion.form>

            <p className="text-[10px] text-slate-400 font-medium italic">We respect your privacy. No spam, ever.</p>
        </section>
    );
}
