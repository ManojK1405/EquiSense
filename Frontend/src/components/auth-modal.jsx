import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Chrome, ArrowRight, Loader2, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const AuthModal = () => {
  const { showAuthModal, setShowAuthModal, login, signup, googleLogin } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showAuthModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(name, email, password);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
    } catch (err) {
      setError('Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAuthModal(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          className="relative w-full max-w-[500px] overflow-hidden rounded-[48px] bg-white shadow-[0_32px_120px_-20px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col md:flex-row"
        >
          {/* Left Decorative Side (Desktop only) */}
          <div className="hidden md:flex w-1/3 bg-slate-900 p-8 flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-3xl -mr-16 -mt-16" />
             <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-600/20 rounded-full blur-3xl -ml-16 -mb-16" />
             
             <div className="relative z-10">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg shadow-orange-600/30">
                   <Zap className="w-6 h-6 fill-current" />
                </div>
                <h2 className="text-xl font-black text-white italic tracking-tight leading-tight uppercase">
                   EquiTrade <br/>
                   <span className="text-orange-500">Terminal</span>
                </h2>
             </div>

             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Secure Core</span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed tracking-wider">
                   Institutional Grade Security & Compliance
                </p>
             </div>
          </div>

          {/* Right Content Side */}
          <div className="flex-1 p-8 md:p-12">
            <div className="flex items-center justify-between mb-10">
              <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">
                    {isLogin ? 'Sign In' : 'Sign Up'}
                 </h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Access Your Vault</p>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="p-3 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                   <div className="relative">
                     <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input
                       type="text"
                       placeholder="Manoj Kalasgonda"
                       required
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-orange-600/30 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                     />
                   </div>
                </div>
              )}
              
              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                 <div className="relative">
                   <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="email"
                     placeholder="manoj@equisense.ai"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-orange-600/30 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                   />
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                 <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="password"
                     placeholder="••••••••"
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-orange-600/30 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                   />
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 mt-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-orange-600 shadow-xl shadow-slate-900/10 hover:shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Enter Terminal' : 'Create Credentials'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Secure Passport</span>
              </div>
            </div>

            <div className="flex justify-center mb-10">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
                theme="outline"
                shape="pill"
                size="large"
                width="100%"
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-orange-600 transition-colors"
              >
                {isLogin ? "No Credentials? Register Here" : "Existing Member? Sign In"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
