import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, ArrowRight, Loader2, Zap } from 'lucide-react';
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
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowAuthModal(false)}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-[440px] overflow-hidden rounded-[40px] bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.15)] border border-slate-100 flex flex-col"
        >
          {/* Top Decorative Gradients */}
          <div className="absolute top-0 left-0 right-0 h-32 overflow-hidden pointer-events-none">
            <div className="absolute -top-16 -left-16 w-48 h-48 bg-orange-500/10 rounded-full blur-[40px]" />
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-rose-500/10 rounded-full blur-[40px]" />
          </div>

          <div className="p-8 sm:p-10 relative z-10 flex flex-col items-center">
            {/* Close Button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Logo/Icon */}
            <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-orange-500 rounded-[20px] flex items-center justify-center text-white mb-6 shadow-xl shadow-rose-500/20">
               <Zap className="w-7 h-7 fill-current" />
            </div>

            {/* Header */}
            <div className="text-center mb-10 w-full">
               <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
               </h3>
               <p className="text-sm font-medium text-slate-500">
                  {isLogin ? 'Enter your credentials to access your terminal.' : 'Join the institutional trading platform.'}
               </p>
            </div>

            {/* Google Login */}
            <div className="w-full flex justify-center mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
                theme="outline"
                shape="pill"
                size="large"
                text={isLogin ? 'signin_with' : 'signup_with'}
              />
            </div>

            <div className="w-full flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-slate-100"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Or continue with email</span>
              <div className="flex-1 h-px bg-slate-100"></div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-bold text-center"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 w-full">
              {!isLogin && (
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                   <div className="relative">
                     <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input
                       type="text"
                       placeholder="John Doe"
                       required
                       value={name}
                       onChange={(e) => setName(e.target.value)}
                       className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/5 focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                     />
                   </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                 <div className="relative">
                   <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="email"
                     placeholder="name@company.com"
                     required
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                     className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/5 focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                   />
                 </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                 <div className="relative">
                   <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <input
                     type="password"
                     placeholder="••••••••"
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="w-full pl-12 pr-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 font-bold focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-500/5 focus:outline-none transition-all placeholder:text-slate-300 placeholder:font-medium"
                   />
                 </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Access Terminal' : 'Create Credentials'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AuthModal;
