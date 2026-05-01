import SectionTitle from '../components/section-title';
import React, { useState, useEffect } from 'react';
import api from '../api';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Newsletter() {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (user?.email) {
            setEmail(user.email);
            checkSubscription(user.email);
        }
    }, [user]);

    const checkSubscription = async (userEmail) => {
        try {
            const res = await api.get(`/newsletter/status?email=${userEmail}`);
            setIsSubscribed(res.data.subscribed);
        } catch (err) {
            console.error('Failed to check subscription status', err);
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        try {
            if (isSubscribed) {
                await api.post('/newsletter/unsubscribe', { email });
                setIsSubscribed(false);
                toast.success('Successfully unsubscribed from market updates.');
            } else {
                await api.post('/newsletter/subscribe', { email });
                setIsSubscribed(true);
                toast.success('Successfully joined the Intelligence Brief.');
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Action failed. Please try again later.');
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

            {isSubscribed && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full mb-2"
                >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Active Subscription</span>
                </motion.div>
            )}

            <motion.form 
                onSubmit={handleAction} 
                className={`flex items-center bg-white/80 backdrop-blur-md p-1.5 rounded-full w-full max-w-xl my-10 border transition-all duration-300 ${isSubscribed ? 'border-emerald-200 shadow-emerald-200/20' : 'border-slate-200 shadow-slate-200/40 focus-within:border-orange-200 focus-within:ring-4 focus-within:ring-orange-100/50'}`}
            >
                <div className="pl-4 text-slate-400">
                    {isSubscribed ? <CheckCircle2 className="size-5 text-emerald-500" /> : <Mail className="size-5" />}
                </div>
                <input 
                    className='flex-1 rounded-full px-4 py-3 outline-none bg-transparent text-slate-700 font-medium placeholder:text-slate-400' 
                    type='email' 
                    placeholder={isSubscribed ? 'You are already on the list!' : (user ? 'Your registered email' : 'Enter your email address')}
                    value={email}
                    readOnly={!!user}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                />
                <button 
                    type="submit"
                    disabled={loading || !email}
                    className={`font-bold btn text-white px-8 py-3.5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-lg disabled:bg-slate-400 disabled:shadow-none ${isSubscribed ? 'bg-slate-900 shadow-slate-900/20' : 'bg-orange-600 shadow-orange-500/20'}`}
                >
                    {loading ? 'Processing...' : isSubscribed ? 'Unsubscribe' : 'Get Updates'}
                </button>
            </motion.form>

            <p className="text-[10px] text-slate-400 font-medium italic">We respect your privacy. No spam, ever.</p>
        </section>
    );
}
