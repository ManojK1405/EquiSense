import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, Shield, Briefcase, Zap, AlertCircle, 
    CheckCircle2, X, ChevronRight, ArrowRight,
    ShieldAlert, Trash2, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../api';

const Settings = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('brokers'); // profile | security | brokers
    const [showBrokerModal, setShowBrokerModal] = useState(false);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [credentials, setCredentials] = useState({ apiKey: '', apiSecret: '', requestToken: '' });
    const [showBrokerSecret, setShowBrokerSecret] = useState(false);

    // Auto-capture request_token from URL after Zerodha redirect
    React.useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('request_token');
        if (token) {
            setCredentials(prev => ({ 
                ...prev, 
                requestToken: token,
                apiKey: user?.zerodhaApiKey || '' 
            }));
            setSelectedBroker({ id: 'zerodha', name: 'Zerodha Kite' });
            // Auto-trigger handshake if we have the token and the broker is Zerodha
            const triggerHandshake = async () => {
                try {
                    toast.loading('Finalizing Institutional Handshake...', { id: 'handshake' });
                    const res = await api.post('/portfolio/sync-broker', {
                        brokerType: 'zerodha',
                        apiKey: 'PERSISTED_IN_DB', // Use what we saved before redirecting
                        requestToken: token
                    });
                    if (res.data.synced >= 0) {
                        toast.success('Handshake Completed Successfully', { id: 'handshake' });
                        setTimeout(() => {
                            window.location.href = '/settings'; // Clean URL and refresh state
                        }, 1000);
                    }
                } catch (e) {
                    console.error('Auto-handshake failed', e);
                    toast.error('Auto-handshake failed. Please enter credentials manually.', { id: 'handshake' });
                    setShowBrokerModal(true); // Only show modal as a fallback
                }
            };

            triggerHandshake();

            // Clear URL params without refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [user]);

    // Proactive Institutional Health Check
    React.useEffect(() => {
        const checkAccess = user?.brokerType ? user[`has${user.brokerType.charAt(0).toUpperCase() + user.brokerType.slice(1)}AccessToken`] : false;
        if (activeTab === 'brokers' && user?.brokerType && checkAccess) {
            const verifySession = async () => {
                try {
                    // Try to sync without a request token to trigger session validation
                    const res = await api.post('/portfolio/sync-broker', {
                        brokerType: user.brokerType,
                        apiKey: 'PERSISTED_IN_DB'
                    });
                    
                    // Force a refresh of the local user state to reflect the verified connection
                    refreshUser();
                } catch (err) {
                    console.error('[Settings] Session validation failed', err);
                }
            };
            verifySession();
        }
    }, [activeTab, user]);

    const isSessionValid = (brokerId) => {
        if (user?.brokerType !== brokerId) return false;
        const hasAccess = user?.[`has${brokerId.charAt(0).toUpperCase() + brokerId.slice(1)}AccessToken`];
        if (!hasAccess) return false;
        
        // If we have an expiry date, check it. 
        // We add a small 30-minute buffer to account for clock skew
        const expiryDate = user?.[`${brokerId}AccessExpiry`];
        if (expiryDate) {
            const expiry = new Date(expiryDate);
            const now = new Date();
            now.setMinutes(now.getMinutes() - 30); 
            return expiry > now;
        }
        
        return true; // Fallback to true if we have the token but date is missing
    };

    const brokers = [
        { 
            id: 'zerodha', 
            name: 'Zerodha Kite', 
            icon: 'https://kite.zerodha.com/static/images/kite-logo.svg',
            status: isSessionValid('zerodha') ? 'Connected' : (user?.brokerType === 'zerodha' ? 'Expired' : 'Not Connected'),
            enabled: true,
            description: 'Indias leading discount broker with powerful API access.'
        },
        { 
            id: 'groww', 
            name: 'Groww', 
            icon: 'https://groww.in/logo-groww.png',
            status: 'Coming Soon',
            enabled: false,
            description: 'Simplified investing for the modern generation.'
        },
        { 
            id: 'dhan', 
            name: 'Dhan', 
            icon: 'https://dhan.co/static/images/dhan-logo.svg',
            status: 'Coming Soon',
            enabled: false,
            description: 'Built for super traders and long-term investors.'
        }
    ];

    const handleDisconnect = async () => {
        try {
            toast.loading('Purging credentials...', { id: 'disconnect' });
            await api.post('/portfolio/disconnect-broker');
            toast.success('Broker Disconnected Successfully', { id: 'disconnect' });
            setShowDisconnectConfirm(false);
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (error) {
            toast.error('Failed to disconnect broker', { id: 'disconnect' });
        }
    };

    const handleConnect = async (e) => {
        if (e) e.preventDefault();
        try {
            const res = await api.post('/portfolio/sync-broker', {
                brokerType: selectedBroker.id,
                ...credentials
            });

            if (res.data.loginUrl) {
                toast.success('Redirecting to Broker...');
                window.location.href = res.data.loginUrl;
                return;
            }

            if (res.data.synced >= 0) {
                toast.success(`${selectedBroker.name} connected successfully`);
                setCredentials(prev => ({ ...prev, requestToken: '' })); // Clear temporary token
                setShowBrokerModal(false);
                window.location.reload(); 
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Connection failed');
        }
    };

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
            return toast.error('New passwords do not match');
        }

        try {
            toast.loading('Updating Identity...', { id: 'profile' });
            const res = await api.put('/auth/profile', {
                name: profileData.name,
                email: profileData.email,
                currentPassword: profileData.currentPassword,
                newPassword: profileData.newPassword
            });
            toast.success('Identity Updated Successfully', { id: 'profile' });
            setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed', { id: 'profile' });
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfdfe] pt-32 pb-20 px-6 md:px-16 lg:px-24">
            <div className="max-w-6xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">Account Settings</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Manage your profile and institutional connections</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Navigation Sidebar */}
                    <div className="lg:col-span-3 space-y-2">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <User className="w-4 h-4" />
                            Identity
                        </button>
                        <button 
                            onClick={() => setActiveTab('brokers')}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest ${activeTab === 'brokers' ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Brokerage Hub
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="lg:col-span-9">
                        <AnimatePresence mode="wait">
                            {activeTab === 'profile' && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8">
                                            <User className="w-12 h-12 text-rose-500 opacity-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">Identity Matrix</h2>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">Manage your institutional credentials and access levels</p>

                                        <form onSubmit={handleUpdateProfile} className="space-y-8 max-w-2xl">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                                    <input 
                                                        type="text" 
                                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:border-rose-600/30 transition-all" 
                                                        value={profileData.name}
                                                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Identifier</label>
                                                    <input 
                                                        type="email" 
                                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:border-rose-600/30 transition-all" 
                                                        value={profileData.email}
                                                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-8 border-t border-slate-50 space-y-8">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <Shield className="w-4 h-4 text-rose-500" />
                                                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Security Clearance</h3>
                                                    </div>
                                                    {user?.googleId && (
                                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black uppercase tracking-widest">
                                                            Managed by Google
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Passcode</label>
                                                        <div className="relative">
                                                            <input 
                                                                type={showPasswords.current ? "text" : "password"} 
                                                                autoComplete="current-password"
                                                                disabled={!!user?.googleId}
                                                                className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:border-rose-600/30 transition-all ${user?.googleId ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                                                value={profileData.currentPassword}
                                                                onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
                                                                placeholder={user?.googleId ? "N/A" : "••••••••"}
                                                            />
                                                            {!user?.googleId && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Passcode</label>
                                                        <div className="relative">
                                                            <input 
                                                                type={showPasswords.new ? "text" : "password"} 
                                                                autoComplete="new-password"
                                                                disabled={!!user?.googleId}
                                                                className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:border-rose-600/30 transition-all ${user?.googleId ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                                                value={profileData.newPassword}
                                                                onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
                                                                placeholder={user?.googleId ? "N/A" : "••••••••"}
                                                            />
                                                            {!user?.googleId && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="md:w-1/2 space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Passcode</label>
                                                    <div className="relative">
                                                        <input 
                                                            type={showPasswords.confirm ? "text" : "password"} 
                                                            disabled={!!user?.googleId}
                                                            className={`w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:border-rose-600/30 transition-all ${user?.googleId ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                                            value={profileData.confirmPassword}
                                                            onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
                                                            placeholder={user?.googleId ? "N/A" : "••••••••"}
                                                        />
                                                        {!user?.googleId && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                                                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                            >
                                                                {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button 
                                                type="submit"
                                                className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                                            >
                                                Commit Changes
                                            </button>
                                        </form>
                                    </div>

                                    <div className="bg-slate-900 p-8 rounded-[32px] flex items-center justify-between group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 blur-[80px] rounded-full -mr-32 -mt-32 transition-all group-hover:bg-rose-600/20" />
                                        <div className="relative z-10">
                                            <h4 className="text-white font-black text-lg tracking-tight mb-1 italic">Delete Institutional Identity</h4>
                                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">This action is irreversible and will purge all data.</p>
                                        </div>
                                        <button className="px-6 py-3 bg-rose-600/10 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all relative z-10">
                                            Terminate Account
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'brokers' && (
                                <motion.div 
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-8"
                                >
                                    <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8">
                                            <Zap className="w-12 h-12 text-orange-500 opacity-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">Live Execution Bridge</h2>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-10">Connect your demat account to enable autonomous AI trading</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {brokers.map((broker) => (
                                                <div 
                                                    key={broker.id}
                                                    className={`p-8 rounded-[32px] border transition-all ${broker.enabled ? 'bg-slate-50 border-slate-100 hover:border-orange-200 group' : 'bg-slate-50/50 border-slate-50 opacity-60'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="w-12 h-12 bg-white rounded-2xl p-2 shadow-sm flex items-center justify-center">
                                                            {broker.id === 'zerodha' ? (
                                                                <span className="font-black text-xs text-orange-600">KITE</span>
                                                            ) : (
                                                                <span className="font-black text-xs text-slate-300">{broker.name[0]}</span>
                                                            )}
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${broker.status === 'Connected' ? 'bg-emerald-100 text-emerald-600' : (broker.status === 'Expired' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500')}`}>
                                                            {broker.status === 'Expired' ? 'Session Expired' : broker.status}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 uppercase">{broker.name}</h3>
                                                    <p className="text-xs text-slate-400 font-medium leading-relaxed mb-8">{broker.description}</p>
                                                    
                                                    {broker.enabled ? (
                                                        <div className="flex gap-3">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedBroker(broker);
                                                                    setCredentials(prev => ({ 
                                                                        ...prev, 
                                                                        apiKey: user?.[`${broker.id}ApiKey`] || '',
                                                                        apiSecret: user?.[`${broker.id}ApiSecret`] || '' 
                                                                    }));
                                                                    setShowBrokerModal(true);
                                                                }}
                                                                className="flex-[3] py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-orange-600/20"
                                                            >
                                                                {broker.status === 'Connected' ? 'Session Active' : (broker.status === 'Expired' ? 'Re-establish Handshake' : 'Establish Link')}
                                                                <ArrowRight className="w-3.5 h-3.5" />
                                                            </button>
                                                            {broker.status !== 'Not Connected' && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setSelectedBroker(broker);
                                                                        setShowDisconnectConfirm(true);
                                                                    }}
                                                                    className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center"
                                                                    title="Purge Credentials"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center italic">
                                                            Coming Soon
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-orange-50/50 border border-orange-100 p-8 rounded-[32px] flex items-start gap-5">
                                        <div className="p-3 bg-white rounded-2xl text-orange-600 shadow-sm">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-1 italic">Institutional Security Protocol</h4>
                                            <p className="text-xs text-slate-500 leading-relaxed font-medium">EquiSense utilizes AES-256 bank-grade encryption to secure your API tokens. We never store your password or secondary authentication factors. All trade transmissions are routed through official broker-vetted SDKs.</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Broker Connection Modal */}
            <AnimatePresence>
                {showBrokerModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowBrokerModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-xl rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden"
                        >
                            <div className="p-12">
                                <div className="flex justify-between items-center mb-10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-900 rounded-[24px] flex items-center justify-center text-white">
                                            <ShieldAlert className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">Connect {selectedBroker.name}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handshake Initialization</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowBrokerModal(false)} className="p-4 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleConnect} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broker API Key</label>
                                        <input 
                                            type="text" 
                                            name="broker_api_key_field"
                                            autoComplete="off"
                                            className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:outline-none focus:border-orange-600/30 transition-all" 
                                            value={credentials.apiKey}
                                            onChange={(e) => setCredentials({...credentials, apiKey: e.target.value})}
                                            placeholder="Enter your broker API key"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broker API Secret</label>
                                        <div className="relative">
                                            <input 
                                                type={showBrokerSecret ? "text" : "password"} 
                                                name="broker_api_secret_field"
                                                autoComplete="new-password"
                                                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-black focus:outline-none focus:border-orange-600/30 transition-all pr-12" 
                                                value={credentials.apiSecret}
                                                onChange={(e) => setCredentials({...credentials, apiSecret: e.target.value})}
                                                placeholder="••••••••••••"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowBrokerSecret(!showBrokerSecret)}
                                                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showBrokerSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit"
                                        disabled={isSessionValid(selectedBroker.id)}
                                        className={`w-full py-6 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all mt-4 ${isSessionValid(selectedBroker.id) ? 'bg-emerald-500 text-white opacity-90 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-orange-600 active:scale-95'}`}
                                    >
                                        {isSessionValid(selectedBroker.id) ? 'Live Link Active' : 'Establish Live Link'}
                                    </button>
                                    
                                    <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                        By connecting, you authorize EquiSense to execute trades on your behalf. <br/> This can be revoked at any time from your broker terminal.
                                    </p>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Disconnect Confirmation Modal */}
            <AnimatePresence>
                {showDisconnectConfirm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDisconnectConfirm(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-md rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden"
                        >
                            <div className="p-12 text-center">
                                <div className="w-20 h-20 bg-rose-50 rounded-[28px] flex items-center justify-center mx-auto mb-8 text-rose-600 shadow-inner">
                                    <Trash2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Purge Connection?</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10 text-sm">
                                    You are about to permanently delete all API keys and session data for <span className="text-slate-900 font-bold uppercase tracking-widest text-[10px]">{selectedBroker?.name}</span>. This action cannot be undone.
                                </p>
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={handleDisconnect}
                                        className="w-full py-6 bg-rose-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 hover:bg-rose-700 transition-all active:scale-95"
                                    >
                                        Delete Credentials
                                    </button>
                                    <button 
                                        onClick={() => setShowDisconnectConfirm(false)}
                                        className="w-full py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Settings;
