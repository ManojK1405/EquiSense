import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, TrendingUp, BarChart3, PieChart, Newspaper, ArrowUpRight, ArrowDownRight, Globe, Layers, Cpu, RefreshCw, Info, Activity, Zap, Maximize2, Building2, MessageSquare, ChevronDown, ChevronUp, ArrowRight, Target, ShieldCheck, Eye, X, ScanSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import FeatureLock from '../components/feature-lock';
import { toast } from 'react-hot-toast';
import PageHero from '../components/PageHero';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeModalTab, setActiveModalTab] = useState(null);

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
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflowY = 'scroll'; // Prevent layout shift
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
            window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflowY = '';
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
            } catch (e) {
                console.error("Analysis Fetch Error:", e);
                toast.error(`Unable to resolve analysis for ${selectedStock.symbol}. Verify market data availability.`);
            } finally {
                setAnalysisLoading(false);
            }
        };
        fetchAnalysis();
    }, [selectedStock]);

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
                subtitle="Deep quantitative analysis powered by AI. Uncover signals, trends, and institutional flow across Indian and global equities."
                accentColor="rose"
                stats={[
                    { label: 'Markets', value: '50+', color: 'rose' },
                    { label: 'Indicators', value: '120+', color: 'orange' },
                    { label: 'Engine', value: 'Gemini', color: 'rose' },
                    { label: 'Latency', value: 'Live', color: 'emerald' },
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 pb-12 lg:pb-16">
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
                                placeholder="Search stocks, indices, ETFs… (e.g. RELIANCE, TCS, AAPL)"
                                className="w-full pl-14 pr-28 py-5 bg-white border border-slate-200 rounded-[24px] shadow-xl text-base font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400/60 transition-all"
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
                            {['RELIANCE', 'TCS', 'HDFC BANK', 'NIFTY 50', 'AAPL'].map((chip) => (
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

                    {/* Market Momentum */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-10 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full" />
                            <div className="flex justify-between items-center mb-10">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 italic tracking-tight uppercase italic">
                                    <TrendingUp className="w-6 h-6 text-orange-600" />
                                    Market Analysis
                                </h3>
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
                                <div className="aspect-[21/9] w-full bg-slate-50 rounded-[24px] border border-slate-100 flex items-center justify-center">
                                    <div className="text-center">
                                        <BarChart3 className="w-16 h-16 text-slate-200 mb-4 mx-auto animate-pulse" />
                                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Select an asset to load interactive chart</p>
                                    </div>
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
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[100px] rounded-full -mr-32 -mt-32" />
                                        <div>
                                            <div className="flex items-center gap-4 mb-3">
                                                <h4 className="text-4xl font-black text-slate-900 tracking-tight">{analysis.symbol}</h4>
                                                <span className="px-4 py-1.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-[0.2em] border border-orange-100">{analysis.sector || 'Equities'}</span>
                                            </div>
                                            <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">{analysis.name}</p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Price</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-4xl font-black text-slate-900">₹{analysis.currentPrice?.toLocaleString()}</span>
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-sm font-black ${analysis.fundamentals?.regularMarketChangePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {analysis.fundamentals?.regularMarketChangePercent >= 0 ? '▲' : '▼'} {Math.abs(analysis.fundamentals?.regularMarketChangePercent || 0).toFixed(2)}%
                                                        </span>
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Today</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-3">
                                                <div className={`px-10 py-5 rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-orange-900/10 flex items-center gap-4 transition-all hover:scale-105 ${analysis.signal.includes('BUY') ? 'bg-emerald-600 text-white shadow-emerald-900/20' :
                                                        analysis.signal.includes('SELL') ? 'bg-rose-600 text-white shadow-rose-900/20' : 'bg-slate-900 text-white'
                                                    }`}>
                                                    <Target className="w-5 h-5" />
                                                    {analysis.signal}
                                                </div>
                                                <Link 
                                                    to="/products/ai-strategist" 
                                                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-orange-50 border border-orange-100 text-[10px] font-black text-orange-600 uppercase tracking-widest hover:bg-orange-600 hover:text-white transition-all group/cta"
                                                >
                                                    <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                                                    Generate AI Investment Plan
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover/cta:translate-x-1 transition-transform" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Real Interactive Chart (TradingView) */}
                                    <div className="relative group/chart">
                                        <div className="absolute top-6 right-6 z-10 flex gap-2 opacity-0 group-hover/chart:opacity-100 transition-all duration-300 translate-y-2 group-hover/chart:translate-y-0">
                                            <a 
                                                href={`https://www.tradingview.com/chart/?symbol=${analysis.symbol.split('.')[0]}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="px-4 py-2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-widest hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                                Full Terminal
                                            </a>
                                        </div>
                                        <div className="aspect-[21/9] w-full bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
                                            <iframe 
                                                key={analysis.symbol}
                                                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_76d4d&symbol=${analysis.symbol.split('.')[0]}&interval=D&hidesidetoolbar=1&hidetoptoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=light&style=1&timezone=Asia%2FKolkata&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${analysis.symbol.split('.')[0]}`}
                                                style={{ width: '100%', height: '100%', border: 'none' }}
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
                                                summary: `₹${analysis.fundamentals?.fiftyTwoWeekHigh?.toLocaleString()}`,
                                                labels: [
                                                    { label: '52W Peak', val: `₹${analysis.fundamentals?.fiftyTwoWeekHigh?.toLocaleString()}` },
                                                    { label: '52W Floor', val: `₹${analysis.fundamentals?.fiftyTwoWeekLow?.toLocaleString()}` },
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

                                            <div className="bg-orange-600 rounded-[40px] p-8 relative overflow-hidden shadow-xl shadow-orange-900/20 group/note">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -mr-16 -mt-16 group-hover/note:bg-white/20 transition-all duration-700" />
                                                <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-orange-200 flex items-center gap-2">
                                                    <Zap className="w-4 h-4 fill-current" />
                                                    AI Strategy Insights
                                                </h5>
                                                <p className="text-sm font-bold text-white leading-relaxed italic relative z-10">
                                                    "The asset is showing {analysis.score > 40 ? 'exceptional bullish' : analysis.score > 0 ? 'steady positive' : 'volatile or bearish'} characteristics. Institutional flow suggests {analysis.signal.toLowerCase()} positions are being {analysis.signal.includes('BUY') ? 'aggressively accumulated' : 'systematically unwound'} at these levels."
                                                </p>
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

                    {/* Side Feed */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group/news">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover/news:bg-orange-500/20 transition-all duration-700" />
                            <h4 className="text-xl font-black mb-8 flex items-center gap-3 italic tracking-tight">
                                <Newspaper className="w-6 h-6 text-orange-500" />
                                Market News
                            </h4>
                            <div className="space-y-8 relative z-10">
                                {marketData?.topNews?.map((news, i) => (
                                    <div key={i} className="group cursor-pointer">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-1 h-1 rounded-full bg-orange-500" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{news.publisher}</p>
                                        </div>
                                        <a href={news.link} target="_blank" rel="noreferrer" className="text-[15px] font-bold leading-snug hover:text-orange-400 transition-colors block">
                                            {news.title}
                                        </a>
                                        <div className="mt-4 w-full h-px bg-slate-800 group-last:hidden" />
                                    </div>
                                ))}
                                <button className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-[0.2em] mt-4">
                                    Browse All Intelligence
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm p-8">
                             <h4 className="text-lg font-bold text-slate-900 mb-6 tracking-tight italic flex items-center gap-2">
                                <Eye className="w-5 h-5 text-orange-500" />
                                Recently Analyzed
                             </h4>
                             {recentStocks.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center py-8 text-center">
                                     <Search className="w-10 h-10 text-slate-200 mb-3" />
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No stocks analyzed yet</p>
                                     <p className="text-[10px] text-slate-300 font-medium mt-1">Search for a stock above to get started</p>
                                 </div>
                             ) : (
                                 <div className="space-y-3">
                                    {recentStocks.map((stock, idx) => (
                                        <motion.button
                                            key={stock.symbol}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            onClick={() => handleSelection(stock)}
                                            className="w-full flex justify-between items-center p-4 rounded-2xl hover:bg-orange-50 hover:border-orange-100 transition-all border border-transparent group text-left"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center font-black text-white text-sm shadow-md shadow-orange-500/20">
                                                    {stock.symbol[0]}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm tracking-tight">{stock.symbol}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{stock.name}</p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                        </motion.button>
                                    ))}
                                 </div>
                             )}
                        </div>
                    </div>

                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && analysis && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 md:p-12">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onWheel={(e) => e.stopPropagation()}
                            className="bg-white w-full max-w-5xl h-[90vh] rounded-[48px] shadow-2xl relative overflow-hidden flex flex-col"
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
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', ring: 'ring-orange-500/10', border: 'hover:border-orange-200', btn: 'group-hover:bg-orange-50 group-hover:text-orange-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500/10', border: 'hover:border-emerald-200', btn: 'group-hover:bg-emerald-50 group-hover:text-emerald-600' },
        fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', ring: 'ring-fuchsia-500/10', border: 'hover:border-fuchsia-200', btn: 'group-hover:bg-fuchsia-50 group-hover:text-fuchsia-600' },
    };

    const styles = colorMap[card.color] || colorMap.orange;

    return (
        <motion.div 
            whileHover={{ y: -8, transition: { duration: 0.3, ease: 'easeOut' } }}
            className={`bg-white rounded-[48px] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-500 hover:border-orange-200 hover:shadow-[0_20px_50px_rgba(59,130,246,0.1)] cursor-pointer group relative aspect-square flex flex-col`}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-[60px] -mr-16 -mt-16 group-hover:bg-orange-50 transition-colors duration-700" />
            
            <div className="p-8 flex-1 flex flex-col justify-between relative z-10">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-[20px] ${styles.bg} flex items-center justify-center transition-all duration-500 group-hover:scale-110 shrink-0 shadow-sm border border-white`}>
                            <card.icon className={`w-7 h-7 ${styles.text}`} />
                        </div>
                        <div className="space-y-0.5">
                            <h4 className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">{card.title}</h4>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">1m Insight</p>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-slate-50/80 backdrop-blur-md flex items-center justify-center text-slate-300 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 shadow-sm">
                        <Maximize2 className="w-4 h-4" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {card.labels.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100/50 hover:bg-white transition-all duration-300 flex flex-col justify-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">{item.label}</p>
                            <p className={`text-[11px] font-black tracking-tighter leading-tight ${item.isTrend ? (item.val?.toLowerCase().includes('down') || item.val?.toLowerCase().includes('bear') ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-900'}`}>
                                {item.val}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        className={`h-full bg-gradient-to-r ${card.color === 'emerald' ? 'from-emerald-400 to-emerald-600' : card.color === 'orange' ? 'from-orange-400 to-orange-600' : 'from-fuchsia-400 to-fuchsia-600'} opacity-20`}
                    />
                </div>
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

export default Dashboard;
