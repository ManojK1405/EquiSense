import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, BarChart3, PieChart, Newspaper, ArrowUpRight, ArrowDownRight, Globe, Layers, Cpu, RefreshCw, Info, Activity, Zap, Maximize2, Building2, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Target, ShieldCheck, Eye, X, ScanSearch, Clock, AlertTriangle, ChevronRight, Share2, Download, Trash2, Layout, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import FeatureLock from '../components/feature-lock';
import { toast } from 'react-hot-toast';
import PageHero from '../components/PageHero';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const getTradingViewSymbol = (s) => {
    if (!s) return 'NIFTY';
    // TradingView's widgetembed is more forgiving with raw symbols
    // We prioritize the base ticker (e.g. RELIANCE instead of NSE:RELIANCE)
    return s.split('.')[0].toUpperCase();
};

const TradingViewChart = ({ symbol }) => {
    return (
        <iframe
            title="TradingView Real-time Chart"
            src={`https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=f1f3f6&theme=light&style=1&timezone=Asia/Kolkata&withdateranges=1&showpopupbutton=1&details=1&hotlist=1&calendar=1`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            className="rounded-[32px]"
        />
    );
};

const Dashboard = () => {
    const { user } = useAuth();
    const CACHE_KEY = `equisense_dashboard_cache_${user?.id || 'guest'}`;

    const RECENT_KEY = `equisense_recent_stocks_${user?.id || 'guest'}`;

    const [searchQuery, setSearchQuery] = useState('');
    const [marketData, setMarketData] = useState(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch (e) { return null; }
    });
    const [loading, setLoading] = useState(!localStorage.getItem(CACHE_KEY));
    const [recentStocks, setRecentStocks] = useState([]);

    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [selectedStock, setSelectedStock] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState('technical');
    const [isNewsCollapsed, setIsNewsCollapsed] = useState(true);

    const fetchMarket = async () => {
        try {
            if (!marketData) setLoading(true);
            const res = await api.get('/market/summary');
            setMarketData(res.data);
            localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentAnalyses = async () => {
        if (!user) return;
        try {
            const res = await api.get('/auth/recent-analyses');
            setRecentStocks(res.data);
        } catch (e) {
            console.error('Failed to fetch recent analyses', e);
        }
    };

    useEffect(() => {
        fetchMarket();
        fetchRecentAnalyses();
    }, [user]);

    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    const handleSelection = (stock) => {
        setAnalysis(null);
        setSearchQuery('');
        setShowSuggestions(false);
        setSelectedStock(stock);
        // Save to DB (fire and forget)
        if (user) {
            api.post('/auth/recent-analyses', { symbol: stock.symbol, name: stock.name || stock.shortName })
               .then(() => fetchRecentAnalyses())
               .catch(err => console.error('Failed to record analysis', err));
        }
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (searchQuery.length < 2) {
                setSearchResults([]);
                setShowSuggestions(false);
                return;
            }
            try {
                const res = await api.get(`/market/search?q=${searchQuery}`);
                setSearchResults(res.data);
                setShowSuggestions(true);
            } catch (e) {
                console.error(e);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (!selectedStock) return;
            try {
                setAnalysisLoading(true);
                const res = await api.get(`/predictions/${selectedStock.symbol}`);
                setAnalysis(res.data);
                setShowSuccessModal(true);
            } catch (e) {
                console.error("Analysis Fetch Error:", e);
                toast.error(`Unable to resolve analysis for ${selectedStock.symbol}. Verify market data availability.`);
            } finally {
                setAnalysisLoading(false);
            }
        };
        fetchAnalysis();
    }, [selectedStock]);

    useEffect(() => {
        if (showSuccessModal) {
            const timer = setTimeout(() => setShowSuccessModal(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessModal]);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-transparent min-h-screen"
        >
            <PageHero
                variant="centered"
                badge={{ icon: ScanSearch, label: 'Institutional Research Terminal', live: true }}
                title="Research"
                titleAccent="Terminal"
                subtitle="Deep quantitative analysis powered by AI Analyst Chat."
                accentColor="rose"
                stats={[
                    { label: 'Markets', value: '50+', color: 'rose' },
                    { label: 'Indicators', value: '120+', color: 'orange' },
                    { label: 'Engine', value: 'Gemini', color: 'rose' },
                    { label: 'Latency', value: 'Live', color: 'emerald' },
                ]}
            />

            <div className={`${selectedStock ? 'max-w-[95%] px-4' : 'max-w-7xl px-6'} mx-auto pb-12 lg:pb-16 transition-all duration-700`}>
                {/* ── Premium Search Section ── */}
                <div className="max-w-3xl mx-auto mb-16 -mt-4">
                    <div className="relative">
                        {/* Search input */}
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search NSE/BSE stocks, indices, ETFs… (e.g. RELIANCE, TCS, INFY)"
                                className="w-full pl-14 pr-28 py-5 glass-panel rounded-[24px] text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400/60 transition-all shadow-2xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <kbd className="hidden md:flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">⌘K</kbd>
                            </div>
                        </div>

                        {/* Quick chips */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap px-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Popular:</span>
                            {['RELIANCE', 'TCS', 'HDFC BANK', 'INFY', 'NIFTY 50'].map((chip) => (
                                <button
                                    key={chip}
                                    onMouseDown={(e) => { e.preventDefault(); setSearchQuery(chip); }}
                                    className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[9px] font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm"
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Suggestions dropdown */}
                        {showSuggestions && searchResults.length > 0 && (
                            <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-100 rounded-[20px] shadow-2xl z-50 overflow-hidden text-left py-2 mt-8">
                                {searchResults.map((res) => (
                                    <div
                                        key={res.symbol}
                                        className="px-5 py-3.5 hover:bg-rose-50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0 group"
                                        onMouseDown={(e) => { e.preventDefault(); handleSelection(res); }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[11px] group-hover:bg-rose-600 transition-colors">
                                                {res.symbol[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm tracking-tight">{res.symbol}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{res.name}</p>
                                            </div>
                                        </div>
                                        <span className="text-[9px] font-black bg-slate-100 group-hover:bg-white px-2.5 py-1 rounded-full text-slate-500 uppercase tracking-widest transition-colors">{res.exch}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Market Momentum - Expanded to Full Screen */}
                    <div className="lg:col-span-12 space-y-8">
                        
                        {/* Collapsible News Tab */}
                        <div className="glass-panel rounded-[40px] overflow-hidden shadow-xl transition-all duration-500">
                            <button 
                                onClick={() => setIsNewsCollapsed(!isNewsCollapsed)}
                                className="w-full p-8 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/20">
                                        <Newspaper className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="text-xl heading-institutional text-slate-900">Market Intelligence Feed</h4>
                                        <p className="label-premium">Real-time Global Headlines & Sentiment Analysis</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                                        Live Pulse
                                    </span>
                                    {isNewsCollapsed ? <ChevronDown className="w-6 h-6 text-slate-400" /> : <ChevronUp className="w-6 h-6 text-slate-400" />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {!isNewsCollapsed && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.4, ease: "circOut" }}
                                    >
                                        <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                                            {marketData?.topNews?.map((news, i) => (
                                                <motion.a 
                                                    key={i}
                                                    initial={{ y: 10, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    href={news.link} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="glow-card glass-panel p-6 rounded-3xl group block"
                                                >
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{news.publisher}</p>
                                                    </div>
                                                    <p className="text-sm font-bold leading-relaxed text-slate-800 group-hover:text-rose-600 transition-colors line-clamp-3">
                                                        {news.title}
                                                    </p>
                                                    <div className="mt-4 flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Impact Index: High</span>
                                                        <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-rose-500 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </motion.a>
                                            ))}
                                        </div>
                                        <div className="px-8 pb-8">
                                            <button className="w-full py-4 rounded-2xl bg-slate-900 text-white hover:bg-orange-600 transition-all font-black text-[10px] uppercase tracking-widest">
                                                Launch Comprehensive News Terminal
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full" />
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl heading-institutional text-slate-900 flex items-center gap-3">
                                    {selectedStock ? <Activity className="w-6 h-6 text-rose-600 animate-pulse" /> : <TrendingUp className="w-6 h-6 text-orange-600" />}
                                    {selectedStock ? 'Institutional Research Terminal' : 'Market Analysis Overview'}
                                </h3>
                                {selectedStock && (
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setSelectedStock(null);
                                        }}
                                        className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"
                                        title="Close Research Terminal"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>

                            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {marketData?.pulse?.map((idx) => (
                                    <div key={idx.symbol} className={`p-6 rounded-3xl border ${idx.changePercent >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${idx.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{idx.name}</p>
                                        <p className={`text-xl font-bold ${idx.changePercent >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>₹{idx.price.toLocaleString()}</p>
                                        <p className={`text-xs font-bold mt-1 ${idx.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{idx.changePercent.toFixed(2)}%</p>
                                    </div>
                                ))}
                            </div>

                            {!selectedStock ? (
                                <div className="p-10 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                    <ScanSearch className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Terminal Ready</p>
                                    <p className="text-sm font-bold text-slate-500 max-w-sm">Search for a stock symbol to launch the institutional research architect.</p>
                                </div>
                            ) : analysisLoading ? (
                                <div className="aspect-[21/9] w-full bg-slate-50 rounded-[24px] border border-slate-100 flex flex-col items-center justify-center space-y-4">
                                    <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
                                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Running Institutional Analysis...</p>
                                </div>
                            ) : analysis ? (
                                <FeatureLock featureName="Institutional Research" description="Unlock deep fundamental analysis, technical signals, and real-time TradingView terminals.">
                                <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    {/* Header Section */}
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 glass-panel p-8 rounded-[40px] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-rose-500/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
                                        
                                        <div className="flex items-center gap-6 relative z-10">
                                            <div className="w-20 h-20 rounded-[28px] glass-panel border-white/50 flex items-center justify-center text-3xl heading-institutional text-slate-900">
                                                {analysis.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1.5">
                                                    <h4 className="text-3xl font-black tracking-tight text-slate-900 uppercase">{analysis.symbol}</h4>
                                                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em] border border-slate-100">{analysis.sector || 'Equities'}</span>
                                                </div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] truncate max-w-[300px]">{analysis.name}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10 relative z-10">
                                            <div className="text-right flex flex-col justify-center border-r border-slate-100 pr-10">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Live Market</p>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-3xl font-black text-slate-900">₹{analysis.currentPrice?.toLocaleString()}</span>
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest ${analysis.fundamentals?.regularMarketChangePercent >= 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                        {analysis.fundamentals?.regularMarketChangePercent >= 0 ? '▲' : '▼'} {Math.abs(analysis.fundamentals?.regularMarketChangePercent || 0).toFixed(2)}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-sm flex items-center justify-center gap-3 transition-all ${analysis.signal.includes('BUY') || analysis.signal.includes('LONG') ? 'bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-700' :
                                                    analysis.signal.includes('SELL') || analysis.signal.includes('SHORT') ? 'bg-rose-600 text-white shadow-rose-900/20 hover:bg-rose-700' : 'bg-slate-900 text-white hover:bg-slate-800'
                                                }`}>
                                                <Target className="w-4 h-4" />
                                                {analysis.signal}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real Interactive Chart (TradingView) */}
                                    <div className="relative group/chart">
                                        <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover/chart:opacity-100 transition-all duration-300 translate-y-2 group-hover/chart:translate-y-0">
                                            <a 
                                                href={`https://www.tradingview.com/chart/?symbol=${getTradingViewSymbol(analysis.symbol)}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="px-4 py-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                                Full Terminal
                                            </a>
                                        </div>
                                        <div className="aspect-[21/9] w-full bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                                            <TradingViewChart 
                                                symbol={getTradingViewSymbol(analysis.symbol)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                        {[
                                            {
                                                id: 'technical',
                                                title: 'Technical Analysis',
                                                icon: Activity,
                                                color: 'emerald',
                                                summary: `₹${analysis.currentPrice?.toLocaleString()}`,
                                                labels: [
                                                    { label: 'Live Price', val: `₹${analysis.currentPrice?.toLocaleString()}` },
                                                    { label: 'Momentum', val: analysis.trendAnalysis?.indicators?.rsi?.value?.toFixed(2) },
                                                    { label: 'Primary Trend', val: analysis.trendAnalysis?.overall?.direction, isTrend: true },
                                                    { label: 'MACD Diverge', val: analysis.trendAnalysis?.indicators?.macd?.macdLine?.toFixed(2) }
                                                ]
                                            },
                                            {
                                                id: 'fundamental',
                                                title: 'Fundamental Analysis',
                                                icon: BarChart3,
                                                color: 'orange',
                                                summary: analysis.fundamentals?.peRatio?.toFixed(2),
                                                labels: [
                                                    { label: 'P/E Ratio', val: analysis.fundamentals?.peRatio?.toFixed(2) },
                                                    { label: 'Market Cap', val: `₹${(analysis.fundamentals?.marketCap / 10000000).toFixed(0)} Cr` },
                                                    { label: 'Lvg (D/E)', val: analysis.fundamentals?.debtToEquity?.toFixed(2) },
                                                    { label: 'EPS (TTM)', val: `₹${analysis.fundamentals?.eps?.toFixed(2)}` }
                                                ]
                                            },
                                            {
                                                id: 'sentiment',
                                                title: 'AI Sentiment Analysis',
                                                icon: ArrowUpRight,
                                                color: 'fuchsia',
                                                summary: `${analysis.score}/100`,
                                                labels: [
                                                    { label: 'AI Quant Score', val: `${analysis.score}/100` },
                                                    { label: 'Institutional Pivot', val: `₹${analysis.fundamentals?.fiftyTwoWeekHigh?.toLocaleString()}` },
                                                    { label: 'AI Bias', val: analysis.sentiment > 0 ? 'Bullish' : 'Bearish', isTrend: true },
                                                    { label: 'Daily Range', val: `₹${(analysis.trendAnalysis?.ohlcv?.high - analysis.trendAnalysis?.ohlcv?.low).toFixed(2)}` }
                                                ]
                                            }
                                        ].map((card) => (
                                            <ExpandableCard 
                                                key={card.id} 
                                                card={card} 
                                                analysis={analysis}
                                                onClick={() => {
                                                    setActiveModalTab(card.id);
                                                    setIsModalOpen(true);
                                                }}
                                            />
                                        ))}
                                    </div>

                                     <div className="space-y-8">
                                         {/* Institutional Analyst Chat - Promoted to Top */}
                                         <ResearchChat analysis={analysis} />

                                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 blur-[100px] rounded-full group-hover:bg-orange-600/20 transition-all duration-1000" />
                                            <h5 className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] mb-10 text-orange-400">
                                                <Cpu className="w-5 h-5" />
                                                Quant Intelligence Report
                                            </h5>
                                            <div className="space-y-6">
                                                {analysis.reasoning?.filter(r => !r.includes('**') || r.length > 20).slice(0, 5).map((r, i) => (
                                                    <div key={i} className="flex gap-6 items-start group/item">
                                                        <div className="mt-2 w-2 h-2 rounded-full bg-orange-500 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover/item:scale-125 transition-transform" />
                                                        <p className="text-sm font-medium text-slate-300 leading-relaxed group-hover/item:text-white transition-colors">
                                                            {r.replace(/[#*]/g, '').replace(/^\d+\.\s*/, '').trim()}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className={`rounded-[40px] border p-8 shadow-xl transition-all duration-500 overflow-hidden relative ${
                                                 analysis.signal.includes('BUY') ? 'bg-emerald-50/50 border-emerald-100 shadow-emerald-900/5' :
                                                 analysis.signal.includes('SELL') ? 'bg-rose-50/50 border-rose-100 shadow-rose-900/5' :
                                                 'bg-white border-slate-200 shadow-slate-900/5'
                                             }`}>
                                                 <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[40px] opacity-20 ${
                                                     analysis.signal.includes('BUY') ? 'bg-emerald-500' :
                                                     analysis.signal.includes('SELL') ? 'bg-rose-500' :
                                                     'bg-slate-500'
                                                 }`} />
                                                 
                                                 <h5 className={`text-[10px] font-black uppercase tracking-[0.3em] mb-10 flex items-center gap-3 ${
                                                     analysis.signal.includes('BUY') ? 'text-emerald-600' :
                                                     analysis.signal.includes('SELL') ? 'text-rose-600' :
                                                     'text-slate-400'
                                                 }`}>
                                                     <RefreshCw className={`w-4 h-4 ${analysisLoading ? 'animate-spin' : ''}`} />
                                                     Institutional Risk Matrix
                                                 </h5>
                                                 
                                                 <div className="space-y-10">
                                                     <div className="flex justify-between items-center px-2">
                                                         {analysis.signal.includes('BUY') ? (
                                                             <>
                                                                 <div className="space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bullish Target (R1)</p>
                                                                     <p className="text-3xl font-black text-emerald-600 tracking-tighter">₹{analysis.sellLevel?.toLocaleString()}</p>
                                                                 </div>
                                                                 <div className="text-right space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Stop Loss (S1)</p>
                                                                     <p className="text-3xl font-black text-rose-600 tracking-tighter">₹{analysis.stopLoss?.toLocaleString()}</p>
                                                                 </div>
                                                             </>
                                                         ) : analysis.signal.includes('SELL') ? (
                                                             <>
                                                                 <div className="space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bearish Target (S1)</p>
                                                                     <p className="text-3xl font-black text-rose-600 tracking-tighter">₹{analysis.sellLevel?.toLocaleString()}</p>
                                                                 </div>
                                                                 <div className="text-right space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Short Exit (R1)</p>
                                                                     <p className="text-3xl font-black text-emerald-600 tracking-tighter">₹{analysis.stopLoss?.toLocaleString()}</p>
                                                                 </div>
                                                             </>
                                                         ) : (
                                                             <>
                                                                 <div className="space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resistance Zone</p>
                                                                     <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{analysis.sellLevel?.toLocaleString()}</p>
                                                                 </div>
                                                                 <div className="text-right space-y-1">
                                                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Support Zone</p>
                                                                     <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{analysis.stopLoss?.toLocaleString()}</p>
                                                                 </div>
                                                             </>
                                                         )}
                                                     </div>

                                                     <div className="grid grid-cols-2 gap-6">
                                                         <div className="p-6 rounded-[24px] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Reward Ratio</p>
                                                             <p className="text-xl font-black text-slate-900 text-center tracking-tighter italic">2.4x</p>
                                                         </div>
                                                         <div className="p-6 rounded-[24px] bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Confidence</p>
                                                             <p className="text-xl font-black text-slate-900 text-center tracking-tighter">{Math.min(95, 60 + analysis.score / 2)}%</p>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>

                                            <div className="bg-slate-900 rounded-[40px] p-8 relative overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] ring-1 ring-white/5 group/note">
                                                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[60px] rounded-full -mr-20 -mt-20 group-hover/note:bg-orange-500/20 transition-all duration-700" />
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-orange-400 flex items-center gap-2 relative z-10">
                                                    <Zap className="w-4 h-4 fill-current" />
                                                    AI Strategy Insights
                                                </h5>
                                                <p className="text-sm font-bold text-slate-300 leading-relaxed italic relative z-10">
                                                    "The asset is showing {analysis.score > 40 ? 'exceptional bullish' : analysis.score > 0 ? 'steady positive' : 'volatile or bearish'} characteristics. Institutional flow suggests {analysis.signal.toLowerCase()} positions are being {analysis.signal.includes('BUY') ? 'aggressively accumulated' : 'systematically unwound'} at these levels."
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                                </FeatureLock>
                             ) : null}


                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8">
                                <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 tracking-tight italic">
                                    <Layers className="w-5 h-5 text-orange-500" />
                                    Top Sector Gainers
                                </h4>
                                <div className="space-y-4">
                                    {marketData?.sectorGainers?.map(s => (
                                        <div key={s.name} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="font-bold text-slate-700">{s.name}</span>
                                            <span className={`font-bold text-sm ${s.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    )) || (
                                        <div className="animate-pulse space-y-4">
                                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-2xl" />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8">
                                <h4 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 tracking-tight italic">
                                    <Globe className="w-5 h-5 text-fuchsia-500" />
                                    Global Indices
                                </h4>
                                <div className="space-y-4">
                                    {marketData?.globalIndices?.map(s => (
                                        <div key={s.name} className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <span className="font-bold text-slate-700">{s.name}</span>
                                            <span className={`font-bold text-sm ${s.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    )) || (
                                        <div className="animate-pulse space-y-4">
                                            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-50 rounded-2xl" />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>


                </div>
            </div>

            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20, y: -20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="fixed top-8 right-8 z-[300] bg-white border border-slate-100 p-5 rounded-[28px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] flex items-center gap-5 ring-1 ring-slate-900/5 min-w-[320px]"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                            <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Analysis Protocol</p>
                            <h4 className="text-sm font-black text-slate-900 tracking-tight">
                                {selectedStock?.symbol} Research Finalized
                            </h4>
                        </div>
                        <div className="ml-auto pl-4 border-l border-slate-50">
                            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isModalOpen && analysis && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onWheel={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-slate-900/5 relative overflow-hidden flex flex-col"
                        >
                            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl shadow-sm">
                                        {analysis.symbol[0]}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{analysis.symbol}</h3>
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Updated: {new Date().toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{analysis.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right mr-4">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p>
                                        <p className="text-sm font-black text-orange-600">1m</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
                                        <X className="w-6 h-6 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            <div 
                                className="flex-1 overflow-y-auto p-12 custom-research-scrollbar bg-slate-50/30 overscroll-contain scroll-smooth"
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                {activeModalTab === 'technical' ? (
                                    <div className="space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                            {/* OHLCV Data */}
                                            <div>
                                                <h6 className="text-xs font-black text-slate-900 border-l-4 border-slate-900 pl-4 uppercase tracking-[0.2em] mb-10">OHLCV Data</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="Open" value={`₹${analysis.trendAnalysis?.ohlcv?.open?.toLocaleString()}`} />
                                                    <DataRow label="High" value={`₹${analysis.trendAnalysis?.ohlcv?.high?.toLocaleString()}`} />
                                                    <DataRow label="Low" value={`₹${analysis.trendAnalysis?.ohlcv?.low?.toLocaleString()}`} />
                                                    <DataRow label="Close" value={`₹${analysis.trendAnalysis?.ohlcv?.close?.toLocaleString()}`} />
                                                    <DataRow label="Volume" value={analysis.trendAnalysis?.ohlcv?.volume?.toLocaleString()} />
                                                </div>
                                            </div>

                                            {/* Price & Moving Averages */}
                                            <div>
                                                <h6 className="text-xs font-black text-slate-900 border-l-4 border-slate-900 pl-4 uppercase tracking-[0.2em] mb-10">Price & Moving Averages</h6>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {Object.entries(analysis.trendAnalysis?.averages || {}).map(([key, val]) => (
                                                        <DataRow key={key} label={key.toUpperCase()} value={`₹${val?.toLocaleString()}`} />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                            {/* Momentum Indicators */}
                                            <div>
                                                <h6 className="text-xs font-black text-slate-900 border-l-4 border-slate-900 pl-4 uppercase tracking-[0.2em] mb-10">Momentum Indicators</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="RSI 14" value={analysis.trendAnalysis?.oscillators?.rsi14} />
                                                    <DataRow label="RSI 9" value={analysis.trendAnalysis?.oscillators?.rsi9} />
                                                    <DataRow label="RSI 7" value={analysis.trendAnalysis?.oscillators?.rsi7} />
                                                    <DataRow label="MACD" value={analysis.trendAnalysis?.indicators?.macd?.macdLine} />
                                                    <DataRow label="MACD Signal" value={analysis.trendAnalysis?.indicators?.macd?.signalLine} />
                                                    <DataRow label="MACD Hist" value={analysis.trendAnalysis?.indicators?.macd?.histogram} />
                                                </div>
                                            </div>

                                            {/* Volatility & Trend */}
                                            <div>
                                                <h6 className="text-xs font-black text-slate-900 border-l-4 border-slate-900 pl-4 uppercase tracking-[0.2em] mb-10">Volatility & Trend</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="ATR 14" value={analysis.trendAnalysis?.oscillators?.atr} />
                                                    <DataRow label="Bollinger Upper" value={`₹${analysis.trendAnalysis?.indicators?.bollingerBands?.upper?.toLocaleString()}`} />
                                                    <DataRow label="Bollinger Middle" value={`₹${analysis.trendAnalysis?.indicators?.bollingerBands?.middle?.toLocaleString()}`} />
                                                    <DataRow label="Bollinger Lower" value={`₹${analysis.trendAnalysis?.indicators?.bollingerBands?.lower?.toLocaleString()}`} />
                                                    <DataRow label="%B" value={`${analysis.trendAnalysis?.indicators?.bollingerBands?.position}%`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : activeModalTab === 'fundamental' ? (
                                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                                            {/* Company Overview Quadrant */}
                                            <div>
                                                <h6 className="text-xs font-black text-orange-600 border-l-4 border-orange-600 pl-4 uppercase tracking-[0.2em] mb-10">Company Overview</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="Company Name" value={analysis.name} />
                                                    <DataRow label="Industry" value={analysis.profile?.industry} />
                                                    <DataRow label="Market Cap" value={`₹${(analysis.fundamentals?.marketCap / 10000000).toFixed(2)} Cr`} />
                                                    <DataRow label="52W High" value={`₹${analysis.fundamentals?.fiftyTwoWeekHigh?.toLocaleString()}`} />
                                                    <DataRow label="52W Low" value={`₹${analysis.fundamentals?.fiftyTwoWeekLow?.toLocaleString()}`} />
                                                    <DataRow label="P/E Ratio (TTM)" value={analysis.fundamentals?.peRatio?.toFixed(2)} />
                                                </div>
                                            </div>

                                            {/* Valuation & Leverage Quadrant */}
                                            <div>
                                                <h6 className="text-xs font-black text-orange-600 border-l-4 border-orange-600 pl-4 uppercase tracking-[0.2em] mb-10">Valuation & Leverage</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="P/B Ratio (MRQ)" value={analysis.fundamentals?.priceToBook?.toFixed(2)} />
                                                    <DataRow label="Debt to Equity (MRQ)" value={analysis.fundamentals?.debtToEquity?.toFixed(2)} />
                                                    <DataRow label="EPS (TTM)" value={`₹${analysis.fundamentals?.eps?.toFixed(2)}`} />
                                                    <DataRow label="Book Value (MRQ)" value={`₹${analysis.fundamentals?.bookValue?.toFixed(2)}`} />
                                                    <DataRow label="Dividend Yield (LTM)" value={`${(analysis.fundamentals?.dividendYield * 100).toFixed(2)}%`} />
                                                </div>
                                            </div>

                                            {/* Financial Performance Quadrant */}
                                            <div>
                                                <h6 className="text-xs font-black text-orange-600 border-l-4 border-orange-600 pl-4 uppercase tracking-[0.2em] mb-10">Financial Performance</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="Revenue (TTM)" value={`₹${(analysis.fundamentals?.totalRevenue / 10000000).toFixed(2)} Cr`} />
                                                    <DataRow label="Net Income (TTM)" value={`₹${(analysis.fundamentals?.netIncome / 10000000).toFixed(2)} Cr`} />
                                                    <DataRow label="EBITDA (TTM)" value={`₹${(analysis.fundamentals?.ebitda / 10000000).toFixed(2)} Cr`} />
                                                    <DataRow label="Operating Margin" value={`${(analysis.fundamentals?.operatingMargins * 100).toFixed(2)}%`} />
                                                    <DataRow label="Profit Margin" value={`${(analysis.fundamentals?.profitMargins * 100).toFixed(2)}%`} />
                                                </div>
                                            </div>

                                            {/* Returns & Holdings Quadrant */}
                                            <div>
                                                <h6 className="text-xs font-black text-orange-600 border-l-4 border-orange-600 pl-4 uppercase tracking-[0.2em] mb-10">Returns & Holdings</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="ROE (TTM)" value={`${(analysis.fundamentals?.roe * 100).toFixed(2)}%`} />
                                                    <DataRow label="ROA (MRY)" value={`${(analysis.fundamentals?.roa * 100).toFixed(2)}%`} />
                                                    <DataRow label="Promoter Holding" value={`${(analysis.fundamentals?.insiderHolding * 100).toFixed(2)}%`} />
                                                    <DataRow label="Inst. Holding" value={`${(analysis.fundamentals?.institutionsHolding * 100).toFixed(2)}%`} />
                                                    <DataRow label="Inst. Count" value={analysis.fundamentals?.institutionsCount} />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="pt-16 border-t border-slate-100">
                                            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">About Company</h6>
                                            <p className="text-base font-medium text-slate-600 leading-relaxed italic">
                                                {analysis.profile?.description}
                                            </p>
                                        </div>
                                    </div>
                                ) : activeModalTab === 'sentiment' ? (
                                    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                                            {/* AI Sentiment Pulse */}
                                            <div>
                                                <h6 className="text-xs font-black text-fuchsia-600 border-l-4 border-fuchsia-600 pl-4 uppercase tracking-[0.2em] mb-10">AI Sentiment Pulse</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="Sentiment Score" value={`${((analysis.sentiment || 0) * 100).toFixed(1)}%`} />
                                                    <DataRow label="Sentiment Bias" value={analysis.sentiment > 0.1 ? 'Positive' : analysis.sentiment < -0.1 ? 'Negative' : 'Neutral'} />
                                                    <DataRow label="Analysis Depth" value="High (48h News)" />
                                                    <DataRow label="Market Reaction" value={analysis.score > 20 ? 'Favorable' : analysis.score < -20 ? 'Risk-Off' : 'Neutral'} />
                                                </div>
                                            </div>

                                            {/* Predictive Intelligence */}
                                            <div>
                                                <h6 className="text-xs font-black text-fuchsia-600 border-l-4 border-fuchsia-600 pl-4 uppercase tracking-[0.2em] mb-10">Predictive Intelligence</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="AI Confidence" value={`${Math.min(95, 70 + Math.abs((analysis.sentiment || 0) * 20)).toFixed(1)}%`} />
                                                    <DataRow label="Signal Strength" value={Math.abs(analysis.score) > 40 ? 'Institutional' : 'Retail'} />
                                                    <DataRow label="Timeframe Focus" value="Short-term (1-5 days)" />
                                                    <DataRow label="Price Target AI" value={`₹${analysis.sellLevel?.toLocaleString()}`} />
                                                </div>
                                            </div>

                                            {/* Institutional Flow Proxy */}
                                            <div>
                                                <h6 className="text-xs font-black text-fuchsia-600 border-l-4 border-fuchsia-600 pl-4 uppercase tracking-[0.2em] mb-10">Institutional Flow Proxy</h6>
                                                <div className="space-y-5">
                                                    <DataRow label="Smart Money Index" value={(50 + (analysis.sentiment || 0) * 30 + analysis.score / 5).toFixed(1)} />
                                                    <DataRow label="Accumulation" value={analysis.score > 15 ? 'Increasing' : analysis.score < -15 ? 'Distribution' : 'Neutral'} />
                                                    <DataRow label="Volume Profile" value={analysis.trendAnalysis?.volume?.trend || 'Stable'} />
                                                    <DataRow label="Whale Activity" value={Math.abs(analysis.score) > 30 ? 'Active' : 'Dormant'} />
                                                </div>
                                            </div>

                                            {/* News Impact Audit */}
                                            <div>
                                                <h6 className="text-xs font-black text-fuchsia-600 border-l-4 border-fuchsia-600 pl-4 uppercase tracking-[0.2em] mb-10">News Impact Audit</h6>
                                                <div className="space-y-5">
                                                    {marketData?.topNews?.slice(0, 3).map((n, i) => (
                                                        <div key={i} className="flex flex-col gap-1">
                                                            <p className="text-[11px] font-black text-slate-900 line-clamp-1">{n.title}</p>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{n.publisher}</span>
                                                                <span className="text-[9px] font-black text-fuchsia-500 uppercase">Impact: High</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-10 rounded-[32px] bg-fuchsia-50 border border-fuchsia-100 relative overflow-hidden">
                                            <Cpu className="absolute -bottom-8 -right-8 w-40 h-40 text-fuchsia-200/50 rotate-12" />
                                            <h6 className="text-xs font-black text-fuchsia-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                Gemini Quant Reasoning
                                            </h6>
                                            <div className="space-y-3 relative z-10">
                                                {analysis.reasoning?.slice(0, 3).map((r, i) => (
                                                    <p key={i} className="text-sm font-bold text-fuchsia-900/80 leading-relaxed italic">
                                                        "{r.replace(/[#*]/g, '').replace(/^\d+\.\s*/, '').trim()}"
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest">
                                        Module Research under development
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const ExpandableCard = ({ card, analysis, onClick }) => {
    const colorMap = {
        emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/20',
        orange: 'from-orange-500 to-rose-600 shadow-orange-500/20',
        fuchsia: 'from-fuchsia-500 to-purple-600 shadow-fuchsia-500/20'
    };

    return (
        <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={onClick}
            className="glow-card glass-panel p-8 rounded-[40px] cursor-pointer group h-full flex flex-col"
        >
            <div className="flex justify-between items-start mb-10">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[card.color]} flex items-center justify-center text-white shadow-xl transform group-hover:rotate-6 transition-all duration-500`}>
                    <card.icon className="w-7 h-7" />
                </div>
                <div className="text-right">
                    <p className="label-premium mb-1">{card.title.split(' ')[0]}</p>
                    <p className="text-2xl heading-institutional text-slate-900">{card.summary}</p>
                </div>
            </div>

            <h4 className="text-sm font-black text-slate-900 mb-6 tracking-tight flex items-center gap-2">
                {card.title}
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </h4>
            
            <div className="space-y-4 mt-auto">
                {card.labels.map((l, i) => (
                    <div key={i} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">{l.label}</span>
                            <span className={l.isTrend ? (l.val.toLowerCase().includes('bull') || l.val.toLowerCase().includes('up') ? 'text-emerald-500' : 'text-rose-500') : 'text-slate-900'}>
                                {l.val}
                            </span>
                        </div>
                        <div className="progress-bar-premium">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: l.isTrend ? (l.val.toLowerCase().includes('bull') || l.val.toLowerCase().includes('up') ? '80%' : '30%') : '65%' }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className={`progress-bar-fill ${card.color === 'emerald' ? 'from-emerald-500 to-teal-500' : card.color === 'orange' ? 'from-orange-500 to-rose-500' : 'from-fuchsia-500 to-purple-500'}`} 
                            />
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const DataRow = ({ label, value }) => {
    const cleanValue = (val) => {
        if (val === null || val === undefined || (typeof val === 'number' && isNaN(val))) return 'N/A';
        return val;
    };
    
    return (
        <div className="flex justify-between items-center group/row">
            <span className="text-xs font-bold text-slate-400 group-hover/row:text-slate-600 transition-colors uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-black transition-colors ${cleanValue(value) === 'N/A' ? 'text-slate-300' : 'text-slate-900'}`}>
                {cleanValue(value)}
            </span>
        </div>
    );
};

const ResearchChat = ({ analysis }) => {
    const [messages, setMessages] = useState([
        { role: 'assistant', content: `I've completed my institutional analysis of **${analysis.symbol}**. The signal is currently **${analysis.signal}**. How can I help you dive deeper into the data?` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const newMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, newMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/strategy/chat', { 
                messages: [...messages, newMsg],
                mode: 'research',
                context: `The user is researching this specific stock: ${analysis.symbol}. Current price: ${analysis.currentPrice}. Signal: ${analysis.signal}. Fundamentals: ${JSON.stringify(analysis.fundamentals)}`
            });
            setMessages(prev => [...prev, res.data]);
        } catch (e) {
            toast.error('Research Assistant Connection Lost');
        } finally {
            setLoading(false);
        }
    };

    const scrollRef = useRef(null);
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    return (
        <div className="mt-8 border-t border-slate-100 bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                    <Cpu className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                    <h6 className="text-xs heading-institutional text-slate-900">Institutional Analyst Chat</h6>
                    <p className="label-premium">Direct Line to AI Research Architect</p>
                </div>
            </div>

            <div 
                ref={scrollRef}
                className="space-y-6 mb-10 max-h-[500px] overflow-y-auto px-4 custom-research-scrollbar scroll-smooth"
            >
                {messages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-6 rounded-[28px] text-sm font-medium leading-relaxed ${
                            m.role === 'user' 
                            ? 'bg-slate-900 text-white rounded-tr-none shadow-xl shadow-slate-900/10' 
                            : 'bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                        }`}>
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-50 border border-slate-100 p-6 rounded-[28px] rounded-tl-none shadow-sm flex gap-2">
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                        </div>
                    </div>
                )}
            </div>

            <div className="relative">
                <input 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-6 pr-16 text-sm font-medium focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-sm"
                    placeholder="Ask about technical targets, fundamental risks..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                    onClick={handleSend}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-orange-600 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
