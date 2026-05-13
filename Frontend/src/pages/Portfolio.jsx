import React, { useState, useEffect, useMemo } from 'react';
import { 
    LayoutDashboard, Plus, Trash2, ArrowUpRight, ArrowDownRight, 
    Briefcase, Activity, Target, ShieldAlert, Zap, Clock, CheckCircle2, 
    AlertCircle, Wallet, Brain, Sparkles, X, Filter, History as HistoryIcon,
    ChevronRight, SkipForward, Play, Pause, Search, Info, TrendingUp, PieChart as PieIcon, ShieldCheck, Bot, FileText, Eye, PowerOff, Loader2, Shield
} from 'lucide-react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import FeatureLock from '../components/feature-lock';
import { toast } from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PortfolioSkeleton } from '../components/skeleton';

const COLORS = ['#0f172a', '#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#fb923c', '#94a3b8'];

const Portfolio = () => {
    const { user, refreshUser } = useAuth();
    // Local Cache Key
    const CACHE_KEY = `equisense_portfolio_cache_${user?.id || 'guest'}`;

    // Helper to get initial state from cache
    const getCached = (key, fallback) => {
        if (!user) return fallback;
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed[key] !== undefined ? parsed[key] : fallback;
            }
        } catch (e) { console.error('Cache read error', e); }
        return fallback;
    };

    const [watchlist, setWatchlist] = useState(() => getCached('watchlist', []));
    const [watchlistSymbol, setWatchlistSymbol] = useState('');
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [portfolio, setPortfolio] = useState(() => getCached('portfolio', []));
    const [tradeQueue, setTradeQueue] = useState(() => getCached('tradeQueue', []));
    const [tradeLogs, setTradeLogs] = useState(() => getCached('tradeLogs', []));
    const [mockBalance, setMockBalance] = useState(() => getCached('mockBalance', 0));
    const [settlementBalance, setSettlementBalance] = useState(() => getCached('settlementBalance', 0));
    const [autoPilot, setAutoPilot] = useState(() => getCached('autoPilot', false));
    const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY)); // Only load if no cache
    const [showAddModal, setShowAddModal] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(null);
    const [showModeConfirm, setShowModeConfirm] = useState(false);
    const [mode, setMode] = useState(localStorage.getItem('tradingMode') || 'mock'); 
    const [newItem, setNewItem] = useState({ symbol: '', quantity: '', type: 'BUY' });
    const [topUpAmount, setTopUpAmount] = useState('');
    const socket = useSocket();
    const [queueTab, setQueueTab] = useState('upcoming'); // upcoming | history
    const [showExecuteConfirm, setShowExecuteConfirm] = useState(false);
    const [pendingExecution, setPendingExecution] = useState(null);

    const [brokerOrders, setBrokerOrders] = useState(() => getCached('brokerOrders', []));
    const [activeTab, setActiveTab] = useState('portfolio'); // portfolio | analysis | orders
    const [selectedBroker, setSelectedBroker] = useState('zerodha');
    const [showBrokerModal, setShowBrokerModal] = useState(false);
    const [marketOpen, setMarketOpen] = useState(() => getCached('marketOpen', false));
    const [showPilotModal, setShowPilotModal] = useState(false);
    const [showDisengageModal, setShowDisengageModal] = useState(false);
    const [pilotConfig, setPilotConfig] = useState({ mode: 'full', limit: '5000' });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingPortfolio, setIsAnalyzingPortfolio] = useState(false);
    const [portfolioReport, setPortfolioReport] = useState(null);
    const [dailyReports, setDailyReports] = useState(() => getCached('dailyReports', []));

    const fetchData = async (overrideMode = null) => {
        const activeMode = overrideMode || mode;
        try {
            // Only show full loader if we have zero data
            if (portfolio.length === 0) setLoading(true);
            
            const [watchlistRes, portfolioRes, queueRes, logsRes, marketStatusRes, ordersRes, reportsRes] = await Promise.all([
                api.get('/portfolio/watchlist'),
                api.get(`/portfolio/portfolio?mode=${activeMode}`),
                api.get('/portfolio/queue'),
                api.get('/portfolio/logs'),
                api.get('/market/status'),
                api.get('/portfolio/orders'),
                api.get('/portfolio/reports')
            ]);
            
            const isPilotActive = activeMode === 'live' ? portfolioRes.data.autoPilotLive : portfolioRes.data.autoPilotMock;

            // Update states
            setWatchlist(watchlistRes.data);
            setPortfolio(portfolioRes.data.items || []);
            setMockBalance(portfolioRes.data.mockBalance || 0);
            setSettlementBalance(portfolioRes.data.settlementBalance || 0);
            setAutoPilot(isPilotActive);
            setTradeQueue(queueRes.data);
            setTradeLogs(logsRes.data);
            setBrokerOrders(ordersRes.data || []);
            setMarketOpen(marketStatusRes.data.isOpen);
            setDailyReports(reportsRes.data || []);

            // PERSIST TO CACHE ONLY IF LOGGED IN
            if (user) {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    watchlist: watchlistRes.data,
                    portfolio: portfolioRes.data.items || [],
                    mockBalance: portfolioRes.data.mockBalance || 0,
                    settlementBalance: portfolioRes.data.settlementBalance || 0,
                    autoPilot: isPilotActive,
                    tradeQueue: queueRes.data,
                    tradeLogs: logsRes.data,
                    brokerOrders: ordersRes.data || [],
                    marketOpen: marketStatusRes.data.isOpen,
                    dailyReports: reportsRes.data || []
                }));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            if (!user) {
                // Ensure empty state if fetch fails and user is not logged in
                setWatchlist([]);
                setPortfolio([]);
                setMockBalance(0);
                setSettlementBalance(0);
                setAutoPilot(false);
                setTradeQueue([]);
                setTradeLogs([]);
                setBrokerOrders([]);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 2-Step Login Optimization: Check for pre-fetched data
        const initialDataRaw = localStorage.getItem('initial_dashboard_data');
        if (initialDataRaw) {
            try {
                const initialData = JSON.parse(initialDataRaw);
                if (initialData.portfolio) {
                    setPortfolio(initialData.portfolio);
                    setLoading(false); // Stop skeleton immediately
                }
            } catch (e) {
                console.error('Failed to parse initial portfolio data', e);
            }
        }
        
        fetchData();
    }, [mode, user]);

    useEffect(() => {
        if (user?.brokerType) {
            setSelectedBroker(user.brokerType);
        }
    }, [user]);


    useEffect(() => {
        if (!socket) return;

        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const handleConnect = () => {
            if (mode === 'live') {
                const symbols = [
                    ...new Set([
                        ...watchlist.map(i => i.stock.symbol.split('.')[0]),
                        ...portfolio.map(i => i.stock.symbol.split('.')[0])
                    ])
                ];
                if (symbols.length > 0) {
                    socket.emit('subscribe_live_data', { userId, symbols });
                }
            } else {
                const symbols = [
                    ...new Set([
                        ...watchlist.map(i => i.stock.symbol),
                        ...portfolio.map(i => i.stock.symbol)
                    ])
                ];
                if (symbols.length > 0) {
                    socket.emit('subscribe_mock_data', { userId, symbols });
                }
            }
        };

        if (socket.connected) {
            handleConnect();
        }

        socket.on('connect', handleConnect);
        
        socket.on('live_ticks', (ticks) => {
            if (mode !== 'live') return;
            setPortfolio(prev => prev.map(item => {
                const tick = ticks.find(t => t.tradingsymbol === item.stock.symbol.split('.')[0]);
                if (tick) {
                    const currentVal = tick.last_price * item.quantity;
                    const pnl = currentVal - item.totalCost;
                    return { 
                        ...item, 
                        currentPrice: tick.last_price,
                        pnl: pnl,
                        pnlPercent: (pnl / item.totalCost) * 100
                    };
                }
                return item;
            }));
        });

        socket.on('mock_ticks', (ticks) => {
            if (mode !== 'mock') return;
            setPortfolio(prev => prev.map(item => {
                const tick = ticks.find(t => t.instrument_token === item.stock.symbol);
                if (tick) {
                    const currentVal = tick.last_price * item.quantity;
                    const pnl = currentVal - item.totalCost;
                    return { 
                        ...item, 
                        currentPrice: tick.last_price,
                        pnl: pnl,
                        pnlPercent: (pnl / item.totalCost) * 100
                    };
                }
                return item;
            }));
        });

        return () => {
            socket.off('connect', handleConnect);
            socket.off('live_ticks');
            socket.off('mock_ticks');
        };
    }, [socket, portfolio.length, watchlist.length, mode]);

    const distributionData = useMemo(() => {
        const stocks = {};
        portfolio.forEach(item => {
            const name = item.stock.symbol.split('.')[0]; // Clean symbol (e.g., RELIANCE from RELIANCE.NS)
            stocks[name] = (stocks[name] || 0) + (item.quantity * (item.currentPrice || item.avgPrice || 0));
        });
        return Object.entries(stocks)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value); // Sort by value desc
    }, [portfolio]);

    const colorMap = useMemo(() => {
        const map = {};
        distributionData.forEach((item, idx) => {
            map[item.name] = COLORS[idx % COLORS.length];
        });
        return map;
    }, [distributionData]);

    const calculateTotalPnL = () => {
        let totalInvested = 0;
        let totalCurrent = 0;
        portfolio.forEach(item => {
            totalInvested += item.totalCost || 0;
            totalCurrent += (item.currentPrice * item.quantity) || item.totalCost || 0;
        });
        const pnl = totalCurrent - totalInvested;
        const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
        return { pnl, pnlPercent, totalCurrent, totalInvested };
    };

    const { pnl: totalPnL, pnlPercent: totalPnLPercent, totalCurrent, totalInvested } = calculateTotalPnL();

    const handleDelete = async (id) => {
        if (!window.confirm('Terminate this position?')) return;
        try {
            const res = await api.delete(`/portfolio/portfolio/${id}`);
            if (res.data.isQueued) {
                toast.success('Market Closed: Sell order queued');
            } else {
                toast.success('Position Liquidated');
            }
            fetchData();
        } catch (error) {
            toast.error('Liquidation Failed');
        }
    };

    const addToWatchlist = async (e) => {
        e.preventDefault();
        try {
            await api.post('/portfolio/watchlist', { symbol: watchlistSymbol.toUpperCase() });
            toast.success('Added to watchlist');
            setWatchlistSymbol('');
            fetchData();
        } catch (error) {
            toast.error('Failed to add ticker');
        }
    };

    const removeFromWatchlist = async (id) => {
        try {
            await api.delete(`/portfolio/watchlist/${id}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to remove');
        }
    };

    // SEARCH LOGIC
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (watchlistSymbol.length >= 2) {
                setIsSearching(true);
                try {
                    const res = await api.get(`/market/search?q=${watchlistSymbol}`);
                    setSearchSuggestions(res.data.slice(0, 5));
                } catch (e) {
                    console.error('Search error', e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [watchlistSymbol]);

    const selectFromSearch = async (symbol) => {
        try {
            await api.post('/portfolio/watchlist', { symbol });
            toast.success(`${symbol} Added`);
            setWatchlistSymbol('');
            setSearchSuggestions([]);
            fetchData();
        } catch (error) {
            toast.error('Failed to add ticker');
        }
    };

    const handleMockOrder = async (e) => {
        e.preventDefault();
        try {
            const symbol = newItem.symbol.toUpperCase().endsWith('.NS') ? newItem.symbol.toUpperCase() : `${newItem.symbol.toUpperCase()}.NS`;
            const quoteRes = await api.get(`/market/quote/${symbol}`);
            const price = quoteRes.data.price;

            if (newItem.type === 'BUY') {
                await api.post('/portfolio/mock/buy', {
                    symbol,
                    quantity: parseFloat(newItem.quantity),
                    price
                });
                toast.success(`Bought ${newItem.quantity} shares of ${symbol}`);
            } else {
                await api.post('/portfolio/mock/sell', {
                    symbol,
                    quantity: parseFloat(newItem.quantity),
                    price
                });
                toast.success(`Sold ${newItem.quantity} shares of ${symbol}`);
            }

            setShowAddModal(false);
            setNewItem({ symbol: '', quantity: '', type: 'BUY' });
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Order execution failed');
        }
    };

    const handleTopUp = async (e) => {
        e.preventDefault();
        try {
            await api.post('/portfolio/mock/balance', { amount: topUpAmount });
            toast.success('Funds added to vault');
            setShowTopUpModal(false);
            setTopUpAmount('');
            fetchData();
        } catch (error) {
            toast.error('Failed to add funds');
        }
    };

    const toggleAI = async () => {
        const isCurrentlyActive = mode === 'live' ? user?.autoPilotLive : user?.autoPilotMock;
        if (!isCurrentlyActive) {
            setShowPilotModal(true);
            return;
        } else {
            setShowDisengageModal(true);
        }
    };

    const confirmAIDisable = async () => {
        try {
            await api.post('/portfolio/autopilot/toggle', { enabled: false, mode: mode });
            toast.success(`AI Pilot (${mode.toUpperCase()}) Disengaged`);
            setShowDisengageModal(false);
            refreshUser();
        } catch (error) {
            toast.error('Failed to disable AI Pilot');
        }
    };

    const confirmAIEnable = async () => {
        try {
            const limit = pilotConfig.mode === 'specific' ? pilotConfig.limit : null;
            await api.post('/portfolio/autopilot/toggle', { 
                enabled: true, 
                mode: mode,
                limit: limit
            });
            setShowPilotModal(false);
            toast.success(`EquiTrade AI (${mode.toUpperCase()}) Engaged`, { icon: '🚀' });
            refreshUser();
        } catch (error) {
            toast.error('AI Control Activation Failed');
        }
    };

    const handleFullEngagement = async () => {
        setIsAnalyzing(true);
        // Automatically deploy 70% of the vault capital in Mock Mode
        const amount = mode === 'mock' 
            ? Math.floor((user?.mockBalance || 10000) * 0.70)
            : (pilotConfig.mode === 'specific' ? pilotConfig.limit : user?.mockBalance || 10000);
        
        try {
            const res = await api.post('/portfolio/autopilot/engage-full', { 
                amount,
                riskLevel: 'moderate',
                sector: 'any',
                mode: mode
            });
            setShowPilotModal(false);
            toast.success(`Deployment Successful: ${res.data.deployed.length} assets acquired in ${mode.toUpperCase()} mode.`, { 
                icon: '🚀',
                duration: 6000 
            });
            refreshUser();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Full Engagement Failed');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runPortfolioAnalysis = async () => {
        setIsAnalyzingPortfolio(true);
        try {
            const res = await api.get('/portfolio/analyze');
            setPortfolioReport(res.data.analysis);
            toast.success('Institutional Analysis Generated', { icon: '📊' });
        } catch (error) {
            toast.error('Analysis Generation Failed');
        } finally {
            setIsAnalyzingPortfolio(false);
        }
    };

    const handleSkipOrder = async (id) => {
        try {
            await api.post(`/portfolio/queue/skip/${id}`);
            toast.success('Order skipped by user');
            fetchData();
        } catch (error) {
            toast.error('Failed to skip order');
        }
    };

    const handleDismissTrade = async (id) => {
        try {
            await api.delete(`/portfolio/queue/${id}`);
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const confirmAndExecute = async () => {
        if (!pendingExecution) return;
        setShowExecuteConfirm(false);
        const trade = pendingExecution;
        
        try {
            const res = await api.post('/portfolio/execute-strategy', {
                mode: 'live',
                trades: trade.trades.map(t => ({ name: t.symbol, amount: t.amount || (t.quantity * t.price), quantity: t.quantity })),
                totalCapital: trade.trades.reduce((sum, t) => sum + (t.amount || (t.quantity * t.price)), 0)
            });

            if (res.data.isQueued) {
                toast.success('Market is closed. Trade remains in queue.', { icon: '⏳' });
            } else {
                await api.delete(`/portfolio/queue/${trade.id}`);
                toast.success('Order transmitted to broker!', { icon: '🚀' });
            }
            fetchData();
        } catch (e) {
            toast.error(e.response?.data?.error || 'Live execution failed.');
        } finally {
            setPendingExecution(null);
        }
    };

    const upcomingTrades = tradeQueue.filter(t => t.status === 'PENDING' || t.status === 'FAILED');

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-transparent min-h-screen pb-32"
        >
            {/* ── Premium Control Bar ── */}
            <div className="sticky top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
                {/* Accent bar */}
                <div className="h-0.5 w-full bg-gradient-to-r from-rose-500 via-orange-400 to-transparent" />
                <div className="max-w-7xl mx-auto px-6 md:px-12 py-3 flex items-center justify-between gap-4 flex-wrap">
                    {/* Identity */}
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow shadow-orange-500/25">
                            <Briefcase className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-slate-900 tracking-tighter leading-none">Portfolio <span className="text-premium italic">Hub</span></h1>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.18em] mt-0.5">Institutional Wealth Terminal</p>
                        </div>
                    </div>

                    {/* Centre: Mode + Broker */}
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                            <button onClick={() => { 
                                if (mode === 'live') setShowModeConfirm(true); 
                            }}
                                className={`px-4 py-1.5 rounded-[10px] font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'mock' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                Mock
                            </button>
                            <button 
                                disabled={!(user?.brokerType && user[`has${user.brokerType.charAt(0).toUpperCase() + user.brokerType.slice(1)}AccessToken`]) || (user?.[`${user.brokerType}AccessExpiry`] && new Date(user[`${user.brokerType}AccessExpiry`]) <= new Date(Date.now() - 30*60000))} 
                                onClick={() => { if (mode === 'mock') setShowModeConfirm(true); }}
                                className={`px-4 py-1.5 rounded-[10px] font-black text-[9px] uppercase tracking-widest transition-all ${mode === 'live' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'} ${(!(user?.brokerType && user[`has${user.brokerType.charAt(0).toUpperCase() + user.brokerType.slice(1)}AccessToken`]) || (user?.[`${user.brokerType}AccessExpiry`] && new Date(user[`${user.brokerType}AccessExpiry`]) <= new Date(Date.now() - 30*60000))) ? 'opacity-40 cursor-not-allowed' : ''}`}>
                                Live
                            </button>
                        </div>
                        {mode === 'live' && (
                            <select value={selectedBroker} onChange={(e) => setSelectedBroker(e.target.value)}
                                className="bg-white border border-slate-200 text-[9px] font-black text-slate-700 uppercase tracking-widest px-3 py-2 rounded-xl focus:outline-none cursor-pointer shadow-sm">
                                <option value="zerodha">Zerodha</option>
                                <option value="groww">Groww</option>
                                <option value="dhan">Dhan</option>
                            </select>
                        )}
                    </div>

                    {/* Right: Funds + Market + AI */}
                    <div className="flex items-center gap-2">
                        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${marketOpen ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${marketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {marketOpen ? 'Open' : 'Closed'}
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                            <Wallet className="w-3.5 h-3.5 text-orange-500" />
                            <span className="text-sm font-black text-slate-900">₹{user ? mockBalance.toLocaleString() : '---'}</span>
                            {mode === 'mock' && user && (
                                <button onClick={() => setShowTopUpModal(true)} className="w-4 h-4 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white transition-all active:scale-90">
                                    <Plus className="w-2.5 h-2.5" />
                                </button>
                            )}
                        </div>
                        <button onClick={user ? toggleAI : undefined}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow active:scale-95 ${autoPilot && user ? 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-orange-500/20' : 'bg-slate-900 text-white hover:bg-slate-700'} ${!user && 'opacity-50 cursor-not-allowed'}`}>
                            <Zap className={`w-3 h-3 fill-current ${autoPilot && user ? 'animate-pulse' : ''}`} />
                            {autoPilot && user ? 'AI Active' : 'EquiTrade'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 md:px-12 pt-10">
                <FeatureLock featureName="Portfolio Hub" description="Unlock real-time portfolio tracking, AI risk analysis, and multi-broker execution.">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        {/* Main Content Area */}
                        <div className="lg:col-span-8 space-y-10">
                            {loading ? (
                                <PortfolioSkeleton />
                            ) : (
                                <>
                                    {/* Performance KPIs */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total AUM</p>
                                                </div>
                                                <p className="text-2xl font-black text-slate-900 tracking-tight">₹{user ? (mockBalance + settlementBalance + totalCurrent).toLocaleString() : '---'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1.5">
                                                    {settlementBalance > 0 ? `Vault + Market + ₹${settlementBalance.toLocaleString()} (T+1 Pending)` : 'Vault + Market Value'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className={`h-1 ${totalPnL >= 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-rose-400 to-red-400'}`} />
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${totalPnL >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                                        {totalPnL >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> : <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />}
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net P&L</p>
                                                </div>
                                                 <p className={`text-2xl font-black tracking-tight ${totalPnL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {totalPnL >= 0 ? '+' : '-'}₹{Math.abs(totalPnL).toLocaleString()}
                                                </p>
                                                <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${totalPnL >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                    {totalPnLPercent.toFixed(2)}% ROI
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="h-1 bg-gradient-to-r from-orange-400 to-amber-400" />
                                            <div className="p-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="w-7 h-7 rounded-xl bg-orange-50 flex items-center justify-center">
                                                        <Target className="w-3.5 h-3.5 text-orange-600" />
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deployed</p>
                                                </div>
                                                <p className="text-2xl font-black text-slate-900 tracking-tight">₹{totalInvested.toLocaleString()}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1.5">{((totalInvested / (mockBalance + totalInvested || 1)) * 100).toFixed(1)}% Allocation</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Holdings Table */}
                                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                        <div className="h-0.5 bg-gradient-to-r from-rose-500 via-orange-400 to-transparent" />
                                        <div className="px-6 pt-5 pb-0 border-b border-slate-50">
                                            {/* Row 1: Title + CTA */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl flex items-center justify-center border border-orange-100/50">
                                                        <LayoutDashboard className="w-3.5 h-3.5 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-sm font-black text-slate-900 tracking-tight leading-none">EquiSense Vault</h2>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Managed Assets</p>
                                                    </div>
                                                </div>

                                                {activeTab === 'portfolio' && (
                                                    <button
                                                        onClick={() => setShowAddModal(true)}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-600/20 transition-all active:scale-95"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Open Position
                                                    </button>
                                                )}
                                            </div>

                                            {/* Tabs */}
                                            <div className="flex bg-slate-50 p-0.5 rounded-xl w-fit mb-4">
                                                {[
                                                    { id: 'portfolio', label: 'Portfolio' },
                                                    { id: 'analysis',  label: 'Analysis'  },
                                                    { id: 'orders',    label: 'Orders'    },
                                                ].map(tab => (
                                                    <button
                                                        key={tab.id}
                                                        onClick={() => setActiveTab(tab.id)}
                                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="min-h-[400px]">
                                            {activeTab === 'portfolio' && (
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-50/60 border-t border-slate-100">
                                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Units</th>
                                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Live / Entry</th>
                                                            <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">P&amp;L</th>
                                                            <th className="px-4 py-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50">
                                                        {portfolio.map((item, pidx) => (
                                                            <tr key={item.id || `portfolio-${pidx}`} className="group hover:bg-slate-50/50 transition-all duration-200">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white text-sm shadow-md transition-transform group-hover:scale-105 shrink-0"
                                                                            style={{
                                                                                backgroundColor: colorMap[item.stock.symbol.split('.')[0]] || '#0f172a',
                                                                                boxShadow: `0 8px 20px -6px ${(colorMap[item.stock.symbol.split('.')[0]] || '#0f172a')}50`
                                                                            }}
                                                                        >
                                                                            {item.stock.symbol[0]}
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none">{item.stock.symbol}</p>
                                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Equity</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <p className="font-black text-slate-800 text-sm">{item.quantity.toLocaleString()}</p>
                                                                    <p className="text-[9px] text-slate-300 font-black tracking-widest mt-0.5">UNITS</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <p className="font-black text-slate-900 text-sm">₹{item.currentPrice?.toLocaleString() || '--'}</p>
                                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">Entry ₹{(item.avgPrice || item.averagePrice || 0).toLocaleString()}</p>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <p className={`text-sm font-black ${((item.currentPrice - (item.avgPrice || item.averagePrice)) * item.quantity) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                        {((item.currentPrice - (item.avgPrice || item.averagePrice)) * item.quantity) >= 0 ? '+' : ''}₹{((item.currentPrice - (item.avgPrice || item.averagePrice)) * item.quantity).toLocaleString()}
                                                                    </p>
                                                                    <p className={`text-[11px] font-black mt-1 ${((item.currentPrice - (item.avgPrice || item.averagePrice)) / (item.avgPrice || item.averagePrice)) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {(((item.currentPrice - (item.avgPrice || item.averagePrice)) / (item.avgPrice || item.averagePrice)) * 100).toFixed(2)}% ROI
                                                                    </p>
                                                                </td>
                                                                <td className="px-4 py-4">
                                                                    <button
                                                                        onClick={() => handleDelete(item.id)}
                                                                        className="p-2 bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all active:scale-90"
                                                                        title="Liquidate Position"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {portfolio.length === 0 && (
                                                            <tr>
                                                                <td colSpan="5" className="py-24 text-center">
                                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-200">
                                                                        <Briefcase className="w-7 h-7" />
                                                                    </div>
                                                                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">No open positions</p>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            )}

                                            {activeTab === 'analysis' && (
                                                <div className="p-10">
                                                    <div className="flex justify-between items-center mb-10">
                                                        <div>
                                                            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Institutional Oversight</h2>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI-Driven Portfolio Audit & Strategy</p>
                                                        </div>
                                                        <button 
                                                            onClick={runPortfolioAnalysis}
                                                            disabled={isAnalyzingPortfolio}
                                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 flex items-center gap-3 disabled:opacity-50"
                                                        >
                                                            {isAnalyzingPortfolio ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                                    Processing...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Sparkles className="w-4 h-4" />
                                                                    Generate Report
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-10">
                                                        <div className="w-full">
                                                            {portfolioReport ? (
                                                                <div className="bg-white p-16 rounded-[48px] border border-slate-100 shadow-2xl relative overflow-hidden h-full min-h-[600px]">
                                                                    {/* Background Decorative Elements */}
                                                                    <div className="absolute top-0 right-0 w-96 h-96 bg-slate-50 rounded-full blur-3xl -mr-48 -mt-48 opacity-50" />
                                                                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -ml-32 -mb-32 opacity-30" />
                                                                    
                                                                    <div className="relative z-10">
                                                                        {/* Official Header */}
                                                                        <div className="flex justify-between items-start mb-16 pb-8 border-b-2 border-slate-900/5">
                                                                            <div>
                                                                                <div className="flex items-center gap-3 mb-2">
                                                                                    <div className="p-2 bg-slate-900 rounded-lg text-white">
                                                                                        <Shield className="w-4 h-4" />
                                                                                    </div>
                                                                                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900">EquiSense Institutional</span>
                                                                                </div>
                                                                                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Internal Strategy Memorandum</h4>
                                                                            </div>
                                                                            <div className="text-right">
                                                                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                                                                <p className="text-[8px] font-bold text-orange-500 uppercase tracking-[0.2em] mt-1 italic">Classification: Restricted</p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Report Content */}
                                                                        <div className="prose prose-slate max-w-none">
                                                                            {portfolioReport.split('\n').map((line, i) => {
                                                                                const cleanLine = line.trim();
                                                                                if (!cleanLine) return <div key={i} className="h-4" />;
                                                                                
                                                                                // Header 3 Parsing
                                                                                if (cleanLine.startsWith('###')) {
                                                                                    return (
                                                                                        <h3 key={i} className="text-xl font-black text-slate-900 uppercase italic tracking-tight mt-12 mb-6 flex items-center gap-4">
                                                                                            <span className="w-8 h-[2px] bg-orange-500" />
                                                                                            {cleanLine.replace('###', '').replace(/\[|\]/g, '').trim()}
                                                                                        </h3>
                                                                                    );
                                                                                }
                                                                                
                                                                                // Memorandum Header Pattern (**KEY:** Value)
                                                                                if (cleanLine.startsWith('**') && cleanLine.includes(':**')) {
                                                                                    const [key, ...rest] = cleanLine.split(':**');
                                                                                    return (
                                                                                        <div key={i} className="flex gap-4 mb-2">
                                                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 shrink-0">{key.replace(/\*/g, '')}</span>
                                                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{rest.join(':**').trim()}</span>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                // Generic Bold Pattern (**Text**)
                                                                                if (cleanLine.includes('**')) {
                                                                                    const parts = cleanLine.split('**');
                                                                                    return (
                                                                                        <p key={i} className="text-slate-600 text-sm font-medium leading-relaxed mb-4">
                                                                                            {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-slate-900 font-black italic">{part}</strong> : part)}
                                                                                        </p>
                                                                                    );
                                                                                }

                                                                                // Memorandum Title (**TITLE**)
                                                                                if (cleanLine.startsWith('**') && cleanLine.endsWith('**')) {
                                                                                    return <h2 key={i} className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-10">{cleanLine.replace(/\*/g, '')}</h2>;
                                                                                }

                                                                                // List Item Pattern (* )
                                                                                if (cleanLine.startsWith('* ')) {
                                                                                    const content = cleanLine.replace('* ', '');
                                                                                    const parts = content.split('**');
                                                                                    return (
                                                                                        <div key={i} className="flex gap-4 mb-4 pl-4 border-l-2 border-orange-500/20">
                                                                                            <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                                                                                {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-slate-900 font-black italic">{part}</strong> : part)}
                                                                                            </p>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                return <p key={i} className="text-slate-600 text-sm font-medium leading-relaxed mb-4">{cleanLine}</p>;
                                                                            })}
                                                                        </div>

                                                                        {/* Footer Signature Area */}
                                                                        <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-end">
                                                                            <div className="opacity-20 select-none">
                                                                                <p className="text-[40px] font-black text-slate-900 tracking-tighter uppercase italic leading-none">STRATEGIC AUDIT</p>
                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[1em] mt-2">CONFIDENTIAL ADVISORY</p>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
                                                                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                                                                                    <Bot className="w-6 h-6 text-orange-500" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">EquiTrade AI Pilot</p>
                                                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated Intelligence Suite</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="h-full bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center">
                                                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl shadow-slate-200/50 mb-8 text-slate-300">
                                                                        <Bot className="w-10 h-10" />
                                                                    </div>
                                                                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">No Insight Generated</h4>
                                                                    <p className="text-slate-400 font-medium max-w-sm mb-8 leading-relaxed">Click the button above to run an institutional-grade audit on your current holdings using real-time market data.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {activeTab === 'orders' && (
                                                <div className="p-10 space-y-12">
                                                    {/* Section 1: Pending / Future Orders */}
                                                    <div>
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                                                                    <Clock className="w-6 h-6" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Active Queue</h3>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled Transmissions</p>
                                                                </div>
                                                            </div>
                                                            <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
                                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{upcomingTrades.length} Pending</span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {upcomingTrades.map((trade, tidx) => (
                                                                <div key={trade.id || `pending-${tidx}`} className="p-8 rounded-[40px] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all group">
                                                                    <div className="flex justify-between items-start mb-6">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-lg ${trade.trades?.[0]?.action === 'BUY' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                                                                {trade.trades?.[0]?.symbol?.[0] || 'T'}
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xl font-black text-slate-900 tracking-tight uppercase">{trade.trades?.[0]?.symbol || 'UNKNOWN'}</p>
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{trade.trades?.[0]?.action || 'AUTO'}</p>
                                                                            </div>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => handleDismissTrade(trade.id)}
                                                                            className="p-3 bg-rose-50 text-rose-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"
                                                                            title="Cancel Order"
                                                                        >
                                                                            <X className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume</p>
                                                                            <p className="font-black text-slate-900">{trade.trades?.[0]?.quantity || 0}</p>
                                                                        </div>
                                                                        <div className="p-4 bg-slate-50 rounded-2xl">
                                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</p>
                                                                            <p className="font-black text-slate-900">₹{trade.trades?.[0]?.price?.toLocaleString() || '---'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {upcomingTrades.length === 0 && (
                                                                <div className="col-span-2 py-20 text-center border-2 border-dashed border-slate-100 rounded-[48px]">
                                                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                                        <CheckCircle2 className="w-8 h-8 text-slate-200" />
                                                                    </div>
                                                                    <p className="text-slate-300 font-black text-[10px] uppercase tracking-widest italic">All Orders Executed</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Order History */}
                                                    <div>
                                                        <div className="flex items-center gap-4 mb-6">
                                                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                                                <HistoryIcon className="w-6 h-6" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase">Order History</h3>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Trail of Executions</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                                                            <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                    <tr className="bg-slate-50/40 border-b border-slate-50">
                                                                        <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                                                                        <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                                                        <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Volume</th>
                                                                        <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Price</th>
                                                                        <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {[...tradeLogs, ...brokerOrders].sort((a, b) => new Date(b.timestamp || b.order_timestamp) - new Date(a.timestamp || a.order_timestamp)).map((order, oidx) => (
                                                                        <tr key={order.id || order.order_id || `hist-${oidx}`} className="hover:bg-slate-50/50 transition-all group">
                                                                            <td className="p-8">
                                                                                <p className="font-black text-slate-900 text-lg uppercase tracking-tight">{order.symbol || order.tradingsymbol}</p>
                                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{new Date(order.timestamp || order.order_timestamp).toLocaleString()}</p>
                                                                            </td>
                                                                            <td className="p-8 text-right">
                                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${order.action === 'BUY' || order.transaction_type === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                                    {order.action || order.transaction_type || 'BUY'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-8 text-right font-black text-slate-700">{order.quantity}</td>
                                                                            <td className="p-8 text-right font-black text-slate-900">₹{(order.price || order.average_price || 0).toLocaleString()}</td>
                                                                            <td className="p-8 text-right">
                                                                                <span className={`px-4 py-2 rounded-full text-[8px] font-black uppercase tracking-widest ${order.status === 'COMPLETE' || order.type === 'MOCK' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                                    {order.status || 'MOCK EXECUTED'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                    {[...tradeLogs, ...brokerOrders].length === 0 && (
                                                                        <tr>
                                                                            <td colSpan="5" className="p-20 text-center text-slate-300 font-black text-[10px] uppercase tracking-widest">Archive Empty</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                                    {/* Daily Executive Briefing */}
                                    {dailyReports.length > 0 && (
                                        <div className="bg-slate-900 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group mt-10">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-orange-600/20 transition-all duration-700" />
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-orange-500">
                                                            <Sparkles className="w-6 h-6 fill-current" />
                                                        </div>
                                                        <div>
                                                            <h2 className="text-xl font-black italic uppercase tracking-tight">Daily <span className="text-orange-500">Executive</span> Brief</h2>
                                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Strategy Reconnaissance</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                                                        <Clock className="w-3 h-3 text-white/40" />
                                                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                                                            {new Date(dailyReports[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                                                    <div className="md:col-span-4 space-y-4">
                                                        <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${dailyReports[0].marketStatus === 'OPEN' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                            {dailyReports[0].marketStatus === 'OPEN' ? (
                                                                <><Activity className="w-3 h-3" /> Trading Day Active</>
                                                            ) : (
                                                                <><ShieldAlert className="w-3 h-3" /> Exchange Holiday</>
                                                            )}
                                                        </div>
                                                        <h3 className="text-2xl font-black leading-tight tracking-tighter italic">
                                                            {dailyReports[0].summary}
                                                        </h3>
                                                    </div>
                                                    <div className="md:col-span-8">
                                                        <div className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10 h-full">
                                                            <div className="flex items-start gap-4">
                                                                <Brain className="w-5 h-5 text-orange-500 mt-1 shrink-0" />
                                                                <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                                                                    "{dailyReports[0].analysis}"
                                                                </p>
                                                            </div>
                                                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Institutional Grade Synthesis</p>
                                                                <div className="flex -space-x-2">
                                                                    {[1,2,3].map(i => (
                                                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                                                                            <Bot className="w-3 h-3 text-white/40" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                        </div>

                        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 lg:self-start">
                            {/* Asset Distribution */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="h-0.5 bg-gradient-to-r from-rose-500 to-orange-400" />
                                <div className="p-6">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-7 h-7 rounded-xl bg-rose-50 flex items-center justify-center">
                                            <PieIcon className="w-3.5 h-3.5 text-rose-500" />
                                        </div>
                                        <h2 className="text-sm font-black text-slate-900 tracking-tight">Distribution</h2>
                                    </div>
                                    <div className="h-[240px] w-full relative flex items-center justify-center">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Assets</span>
                                            <span className="text-base font-black text-slate-900 tracking-tighter">
                                                {distributionData.length} Hold.
                                            </span>
                                        </div>
                                        <ResponsiveContainer width="99%" height={240} minWidth={0} minHeight={0}>
                                            <PieChart>
                                                <Pie
                                                    data={distributionData}
                                                    innerRadius={75}
                                                    outerRadius={95}
                                                    paddingAngle={10}
                                                    cornerRadius={14}
                                                    dataKey="value"
                                                    stroke="none"
                                                    animationBegin={0}
                                                    animationDuration={1200}
                                                >
                                                    {distributionData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={COLORS[index % COLORS.length]} 
                                                            className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            return (
                                                                <div className="bg-white/90 backdrop-blur-md border border-slate-100 p-4 rounded-2xl shadow-2xl">
                                                                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-1">{payload[0].name}</p>
                                                                    <p className="text-sm font-black text-rose-600">₹{payload[0].value.toLocaleString()}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                                                        {((payload[0].value / distributionData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}% Weight
                                                                    </p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>

                                    {/* Custom Legend */}
                                    <div className="mt-6 space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {distributionData.slice(0, 5).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50 group hover:bg-white hover:border-slate-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{item.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">
                                                    {((item.value / distributionData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        ))}
                                        {distributionData.length > 5 && (
                                            <div className="text-center py-2">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">+ {distributionData.length - 5} Others</span>
                                            </div>
                                        )}
                                    </div>
                            </div>
                        </div>

                            {/* Watchlist */}
                            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-400" />
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-xl bg-indigo-50 flex items-center justify-center">
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                            </div>
                                            <h2 className="text-sm font-black text-slate-900 tracking-tight">Watchlist</h2>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{watchlist.length} Active</span>
                                    </div>

                                    <div className="relative mb-5">
                                        <form onSubmit={addToWatchlist} className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    placeholder="Add ticker (e.g. RELIANCE)"
                                                    value={watchlistSymbol}
                                                    onChange={(e) => setWatchlistSymbol(e.target.value)}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-indigo-200 transition-all"
                                                />
                                                {isSearching && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                            <button type="submit" className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-indigo-600 transition-all active:scale-90">
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </form>

                                        <AnimatePresence>
                                            {searchSuggestions.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden"
                                                >
                                                    {searchSuggestions.map((item) => (
                                                        <button
                                                            key={item.symbol}
                                                            onClick={() => selectFromSearch(item.symbol)}
                                                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
                                                        >
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.symbol}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 truncate max-w-[180px]">{item.name}</p>
                                                            </div>
                                                            <Plus className="w-3 h-3 text-slate-300 group-hover:text-indigo-600 transition-all" />
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-3">
                                        {watchlist.length > 0 ? watchlist.slice(0, 10).map((item) => (
                                            <div key={item.id} className="flex items-center justify-between group cursor-pointer">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-400 text-sm group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                        {item.stock.symbol[0]}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-900 text-sm tracking-tight">{item.stock.symbol}</span>
                                                        <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase">NSE</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromWatchlist(item.id)}
                                                    className="p-2 bg-white shadow-sm rounded-lg text-slate-200 hover:text-rose-500 border border-transparent transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )) : (
                                            <p className="text-[10px] font-bold text-slate-400 text-center py-8 uppercase tracking-widest italic">No assets tracked</p>
                                        )}
                                    </div>

                                    <div className="mt-5 pt-4 border-t border-slate-50 flex gap-2 items-start">
                                        <Zap className="w-3.5 h-3.5 text-orange-500 mt-0.5 shrink-0" />
                                        <p className="text-[9px] font-bold text-slate-400 leading-relaxed">
                                            <span className="text-orange-500 font-black">Priority Protocol:</span> These stocks are prioritised for AI Pilot deployment.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FeatureLock>
            </div>


            {/* Log Detail Modal */}
            <AnimatePresence>
                {showDetailModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 relative border border-white/20">
                            <button onClick={() => setShowDetailModal(null)} className="absolute top-8 right-8 p-3 bg-slate-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all z-20">
                                <X className="w-5 h-5" />
                            </button>
                            
                            <div className={`p-12 text-white relative ${showDetailModal.action === 'BUY' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -mr-32 -mt-32" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-4 bg-white/20 rounded-[24px] backdrop-blur-md">
                                            <Brain className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black italic tracking-tighter uppercase">AI Decision Report</h3>
                                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Institutional Audit Trail</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Asset Identification</p>
                                            <p className="text-2xl font-black">{showDetailModal.symbol}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2">Timestamp</p>
                                            <p className="text-xl font-black">{new Date(showDetailModal.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-12 space-y-10">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Action</p>
                                        <p className={`text-xl font-black uppercase ${showDetailModal.action === 'BUY' ? 'text-emerald-600' : 'text-rose-600'}`}>{showDetailModal.action}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Volume</p>
                                        <p className="text-xl font-black text-slate-900">{showDetailModal.quantity}</p>
                                    </div>
                                    <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Price</p>
                                        <p className="text-xl font-black text-slate-900">₹{showDetailModal.price.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-orange-500" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">AI Logic Reasoning</h4>
                                    </div>
                                    <div className="p-8 bg-orange-50 rounded-[32px] border border-orange-100/50">
                                        <p className="text-slate-700 font-bold leading-relaxed italic text-lg">
                                            "{showDetailModal.reason || 'Technical sentiment analysis indicated a high-probability breakout setup with a positive correlation to sector momentum.'}"
                                        </p>
                                    </div>
                                </div>

                                <button onClick={() => setShowDetailModal(null)} className="w-full py-6 rounded-[32px] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-orange-600 transition-all shadow-xl">
                                    Acknowledge Decision
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Top Up Modal */}
            <AnimatePresence>
                {showTopUpModal && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-10 w-full max-w-md rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 relative border border-slate-200">
                            <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase italic tracking-tighter underline decoration-orange-600 decoration-4">Injection Protocol</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-8">Add Mock Funds to Vault</p>
                            
                            <form onSubmit={handleTopUp} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capital Amount (INR)</label>
                                    <input 
                                        type="number" 
                                        placeholder="E.g. 500000" 
                                        className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-3xl font-black focus:outline-none focus:border-orange-600/30 transition-all" 
                                        value={topUpAmount}
                                        onChange={(e) => setTopUpAmount(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setShowTopUpModal(false)} className="flex-1 p-6 rounded-3xl border border-slate-100 font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort</button>
                                    <button type="submit" className="flex-1 p-6 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl">Inject Capital</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add/Trade Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white p-10 w-full max-w-lg rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 relative border border-slate-200"
                        >
                            <div className="flex items-center gap-4 mb-8">
                                <div className={`p-4 rounded-[20px] text-white ${newItem.type === 'BUY' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase italic">Secure Transmission</h3>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Executing {newItem.type} Order</p>
                                </div>
                            </div>

                            <form onSubmit={handleMockOrder} className="space-y-6">
                                <div className="flex bg-slate-100 p-1.5 rounded-[20px] mb-6">
                                    <button 
                                        type="button"
                                        onClick={() => setNewItem({...newItem, type: 'BUY'})}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newItem.type === 'BUY' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Buy Signal
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setNewItem({...newItem, type: 'SELL'})}
                                        className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newItem.type === 'SELL' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Sell Signal
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Identification</label>
                                    <input 
                                        type="text" 
                                        placeholder="E.g. RELIANCE" 
                                        className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-black focus:outline-none focus:ring-4 focus:ring-orange-600/5 focus:border-orange-600/30 transition-all uppercase" 
                                        value={newItem.symbol}
                                        onChange={(e) => setNewItem({...newItem, symbol: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Share Quantity</label>
                                    <input type="number" placeholder="00" className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-lg font-black focus:outline-none border-slate-100 focus:border-orange-600/30 transition-all" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} />
                                </div>
                                
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 p-6 rounded-3xl border border-slate-100 font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors">Abort</button>
                                    <button type="submit" className={`flex-1 p-6 rounded-3xl text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl ${newItem.type === 'BUY' ? 'bg-emerald-600 shadow-emerald-900/10' : 'bg-rose-600 shadow-rose-900/10'}`}>
                                        Transmit {newItem.type}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showExecuteConfirm && (
                    <div className="fixed inset-0 z-[250] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => {
                                setShowExecuteConfirm(false);
                                setPendingExecution(null);
                            }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden"
                        >
                            <div className="p-12 text-center">
                                <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-inner">
                                    <ShieldCheck className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Confirm Transmission</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                                    You are about to transmit this order directly to the <span className="text-emerald-600 font-black uppercase tracking-widest text-[10px]">{selectedBroker}</span> production environment.
                                </p>
                                
                                <div className="bg-slate-50 p-6 rounded-3xl mb-10 text-left border border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticker</span>
                                        <span className="font-black text-slate-900 uppercase">{pendingExecution?.trades?.[0]?.symbol}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</span>
                                        <span className="font-black text-slate-900">{pendingExecution?.trades?.[0]?.quantity} Units</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Est. Value</span>
                                        <span className="font-black text-emerald-600">₹{pendingExecution?.trades?.[0]?.amount?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={confirmAndExecute}
                                        className="w-full py-6 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95"
                                    >
                                        Execute Real Order
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowExecuteConfirm(false);
                                            setPendingExecution(null);
                                        }} 
                                        className="w-full py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all"
                                    >
                                        Abort Transmission
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showModeConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModeConfirm(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-white w-full max-w-lg rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden"
                        >
                            <div className="p-12 text-center">
                                {mode === 'mock' ? (
                                    <>
                                        <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-inner">
                                            <ShieldCheck className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Engage Live Sync?</h3>
                                        <p className="text-slate-500 font-medium leading-relaxed mb-10">
                                            You are about to switch from the <span className="text-orange-600 font-bold uppercase tracking-widest text-[10px]">Mock Environment</span> to <span className="text-emerald-600 font-bold uppercase tracking-widest text-[10px]">Live Production</span>. 
                                            All trades executed in this mode will involve real capital through your connected broker.
                                        </p>
                                        <div className="flex flex-col gap-4">
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const res = await api.post('/portfolio/sync-broker', { 
                                                            brokerType: selectedBroker,
                                                            apiKey: 'PERSISTED_IN_DB' 
                                                        });
                                                        if (res.data.loginUrl) {
                                                            const isExpired = !!user?.brokerAccess;
                                                            toast.error(isExpired ? 'Session Expired. Please reconnect in Settings.' : 'Broker not authorized. Please visit Settings.');
                                                            setShowModeConfirm(false);
                                                            return;
                                                        }
                                                        if (res.data.synced >= 0) {
                                                            setMode('live');
                                                            localStorage.setItem('tradingMode', 'live');
                                                            await api.post('/portfolio/mode', { mode: 'live' });
                                                            setShowModeConfirm(false);
                                                            fetchData('live');
                                                            toast.success(`${selectedBroker.toUpperCase()} Sync Successful`);
                                                        }
                                                    } catch (err) {
                                                        setShowModeConfirm(false);
                                                        toast.error(!user?.brokerApiKey ? 'Broker Not Configured. Please visit Settings.' : 'Handshake Failed. Re-authenticate in Settings.');
                                                    }
                                                }}
                                                className="w-full py-6 bg-emerald-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-emerald-700 transition-all active:scale-95"
                                            >
                                                Activate Production Mode
                                            </button>
                                            <button onClick={() => setShowModeConfirm(false)} className="w-full py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Stay in Mock Deck</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-orange-600 shadow-inner">
                                            <ShieldAlert className="w-10 h-10" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Enter Simulation?</h3>
                                        <p className="text-slate-500 font-medium leading-relaxed mb-10">
                                            You are reverting to the <span className="text-orange-600 font-bold uppercase tracking-widest text-[10px]">Mock Environment</span>. 
                                            Live broker synchronization will be suspended. All trades will use virtual balance.
                                        </p>
                                        <div className="flex flex-col gap-4">
                                            <button 
                                                onClick={async () => {
                                                    setMode('mock');
                                                    localStorage.setItem('tradingMode', 'mock');
                                                    await api.post('/portfolio/mode', { mode: 'mock' });
                                                    setShowModeConfirm(false);
                                                    fetchData('mock');
                                                    toast.success('Simulation Mode Engaged');
                                                }}
                                                className="w-full py-6 bg-slate-900 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-orange-600 transition-all active:scale-95"
                                            >
                                                Switch to Mock Deck
                                            </button>
                                            <button onClick={() => setShowModeConfirm(false)} className="w-full py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Stay in Live Sync</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* AI Pilot Config Modal */}
            <AnimatePresence>
                {showPilotModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPilotModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden">
                            <div className="p-12 text-center">
                                <div className="w-24 h-24 bg-orange-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-orange-600 shadow-inner">
                                    <Zap className="w-10 h-10 fill-current" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Engage AI Pilot</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10">
                                    The AI Pilot will actively scan the market, automatically taking profits at +7% and cutting losses at -2%. It will use your {mode === 'mock' ? 'Mock Balance' : 'Broker Funds'} to discover and acquire high-momentum assets.
                                </p>
                                <div className="flex gap-4">
                                    <button onClick={() => setShowPilotModal(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Cancel</button>
                                    <button 
                                        onClick={handleFullEngagement} 
                                        disabled={isAnalyzing}
                                        className="flex-1 py-6 bg-orange-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-orange-900/20 hover:bg-orange-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Deploying...
                                            </>
                                        ) : (
                                            'Confirm Engage'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Disengage AI Pilot Modal */}
            <AnimatePresence>
                {showDisengageModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDisengageModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 overflow-hidden">
                            <div className="p-12 text-center">
                                <div className="w-24 h-24 bg-rose-50 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-rose-600 shadow-inner">
                                    <PowerOff className="w-10 h-10" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase mb-4">Disengage Pilot?</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-10">
                                    Are you sure you want to disable the EquiTrade AI Pilot? It will no longer actively manage your portfolio, and you will be responsible for manually cutting losses and taking profits.
                                </p>
                                <div className="flex gap-4">
                                    <button onClick={() => setShowDisengageModal(false)} className="flex-1 py-6 bg-slate-50 text-slate-400 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-100 transition-all">Cancel</button>
                                    <button onClick={confirmAIDisable} className="flex-1 py-6 bg-rose-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 hover:bg-rose-700 transition-all active:scale-95">
                                        Confirm Disengage
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Portfolio;
