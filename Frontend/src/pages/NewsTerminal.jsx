import React, { useState, useEffect } from 'react';
import { Newspaper, Search, RefreshCw, ArrowUpRight, Globe, TrendingUp, Filter, Clock, Share2, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import PageHero from '../components/PageHero';
import { toast } from 'react-hot-toast';

const NewsTerminal = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');

    const fetchNews = async () => {
        try {
            setLoading(true);
            const res = await api.get('/market/news');
            setNews(res.data);
        } catch (e) {
            console.error(e);
            toast.error('Failed to sync with global news nodes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, []);

    const filteredNews = news.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             n.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="bg-transparent min-h-screen">
            <PageHero
                variant="centered"
                badge={{ icon: Newspaper, label: 'Global Intelligence Network', live: true }}
                title="News"
                titleAccent="Terminal"
                subtitle="Institutional-grade market sentiment and breaking headlines from worldwide sources."
                accentColor="orange"
                stats={[
                    { label: 'Sources', value: '50+', color: 'orange' },
                    { label: 'Network', value: 'Global', color: 'rose' },
                    { label: 'Updates', value: 'Real-time', color: 'emerald' },
                ]}
            />

            <div className="max-w-7xl mx-auto px-6 pb-20">
                {/* Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
                    <div className="md:col-span-8">
                        <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
                                <Search className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search headlines, companies, or macro trends..."
                                className="w-full pl-14 pr-6 py-5 glass-panel rounded-[24px] text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400/60 transition-all shadow-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="md:col-span-4 flex gap-4">
                        <button 
                            onClick={fetchNews}
                            className="flex-1 glass-panel rounded-[24px] flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-orange-600 hover:bg-orange-50/50 transition-all group"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            Sync Feed
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="glass-panel p-8 rounded-[40px] animate-pulse space-y-6">
                                <div className="h-4 bg-slate-100 rounded-full w-1/4" />
                                <div className="space-y-3">
                                    <div className="h-6 bg-slate-100 rounded-full w-full" />
                                    <div className="h-6 bg-slate-100 rounded-full w-3/4" />
                                </div>
                                <div className="h-20 bg-slate-50 rounded-2xl w-full" />
                                <div className="flex justify-between">
                                    <div className="h-4 bg-slate-100 rounded-full w-1/4" />
                                    <div className="h-4 bg-slate-100 rounded-full w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <AnimatePresence>
                            {filteredNews.map((item, i) => (
                                <motion.a
                                    key={i}
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="glass-panel p-8 rounded-[40px] group flex flex-col hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-500 border-slate-100 hover:border-orange-200"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[10px]">
                                                {item.source[0]}
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.source}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-300">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[9px] font-bold">{new Date(item.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-4 group-hover:text-orange-600 transition-colors line-clamp-3">
                                        {item.title}
                                    </h3>

                                    {item.description && (
                                        <p className="text-sm font-medium text-slate-500 line-clamp-3 mb-8 leading-relaxed">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div className="flex gap-4">
                                            <button className="text-slate-300 hover:text-orange-500 transition-colors">
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button className="text-slate-300 hover:text-orange-500 transition-colors">
                                                <Bookmark className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-orange-500 font-black text-[9px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Read Article
                                            <ArrowUpRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </motion.a>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {!loading && filteredNews.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 text-slate-300">
                            <Search className="w-10 h-10" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-900 mb-2">No intelligence matching your query</h4>
                        <p className="text-slate-500 font-medium">Try broadening your search terms or syncing the feed again.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NewsTerminal;
