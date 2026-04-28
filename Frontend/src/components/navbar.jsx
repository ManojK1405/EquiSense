import { MenuIcon, XIcon, ChevronDown, Activity, Brain, Target, LayoutDashboard, Briefcase, History, BarChart2, LogOut, User as UserIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Static ticker data with tiny live drift
const BASE_TICKERS = [
    { sym: 'NIFTY 50',  price: 22543.25, chg: +0.68 },
    { sym: 'SENSEX',    price: 74339.80, chg: +0.72 },
    { sym: 'RELIANCE',  price: 2847.60,  chg: +1.24 },
    { sym: 'TCS',       price: 3521.40,  chg: -0.38 },
    { sym: 'HDFC BANK', price: 1623.75,  chg: +0.55 },
    { sym: 'INFOSYS',   price: 1489.20,  chg: -0.91 },
    { sym: 'ICICI BANK',price: 1072.30,  chg: +1.03 },
    { sym: 'WIPRO',     price: 458.90,   chg: +0.27 },
    { sym: 'LT',        price: 3248.50,  chg: -0.14 },
    { sym: 'BAJFINANCE',price: 6820.10,  chg: +1.88 },
    { sym: 'MARUTI',    price: 11240.00, chg: +0.43 },
    { sym: 'GOLD',      price: 71250.00, chg: +0.12 },
];

function useMarketOpen() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay();
    const h = ist.getHours(), m = ist.getMinutes();
    const mins = h * 60 + m;
    return day >= 1 && day <= 5 && mins >= 555 && mins < 930; // 9:15–15:30 IST
}

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [tickers, setTickers] = useState(BASE_TICKERS);
    const { user, logout, setShowAuthModal } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const profileMenuRef = useRef(null);
    const isMarketOpen = useMarketOpen();

    // Simulate live price drift every 4s
    useEffect(() => {
        const interval = setInterval(() => {
            setTickers(prev => prev.map(t => ({
                ...t,
                price: +(t.price * (1 + (Math.random() - 0.5) * 0.0008)).toFixed(2),
                chg:   +(t.chg  + (Math.random() - 0.5) * 0.05).toFixed(2),
            })));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };
        if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showProfileMenu]);

    const isActive = (href) => location.pathname === href;

    const links = [
        { name: 'Home', href: '/' },
        {
            name: 'Products',
            subLinks: [
                { name: 'Stock Analysis', href: '/products/dashboard', icon: LayoutDashboard, description: 'Deep quantitative research' },
                { name: 'Portfolio Hub', href: '/products/portfolio', icon: Briefcase, description: 'Live tracking & paper trading' },
                { name: 'Intraday Pulse', href: '/products/intraday-pulse', icon: Activity, description: 'Real-time market momentum' },
                { name: 'AI Strategist', href: '/products/ai-strategist', icon: Brain, description: 'AI-driven custom logic' },
                { name: 'Goal Backcaster', href: '/products/goal-backcaster', icon: History, description: 'Goal-based wealth backcasting' },
                { name: 'Backtester', href: '/products/backtester', icon: BarChart2, description: 'Simulate strategies on historical data' },
            ],
        },
        { name: 'Our Story', href: '/about-us' },
        { name: 'Our Vision', href: '/our-vision' },
    ];

    const handleLogout = () => {
        logout();
        setShowProfileMenu(false);
        navigate('/');
    };

    return (
        <div className='sticky top-0 z-50'>
            <nav className='flex w-full items-center justify-between px-4 py-3 backdrop-blur-xl border-b border-white/40 md:px-16 lg:px-24'
                style={{ background: 'rgba(248, 250, 252, 0.88)' }}
            >
                {/* Logo */}
                <Link to='/' className='flex items-center gap-3 group'>
                    {/* SVG mark: rising bars + trend line */}
                    <div className='relative w-9 h-9 shrink-0'>
                        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                            <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                    <stop offset="0%" stopColor="#f43f5e"/>
                                    <stop offset="100%" stopColor="#f97316"/>
                                </linearGradient>
                            </defs>
                            {/* Rounded square bg */}
                            <rect width="36" height="36" rx="10" fill="url(#logoGrad)"/>
                            {/* Bar chart columns */}
                            <rect x="6" y="20" width="4" height="9" rx="1.5" fill="white" opacity="0.5"/>
                            <rect x="12" y="15" width="4" height="14" rx="1.5" fill="white" opacity="0.7"/>
                            <rect x="18" y="10" width="4" height="19" rx="1.5" fill="white"/>
                            {/* Trend arrow line */}
                            <polyline points="7,22 13,17 19,12 27,7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                            <circle cx="27" cy="7" r="2" fill="white"/>
                        </svg>
                    </div>
                    {/* Wordmark */}
                    <div className='flex flex-col leading-none'>
                        <span className='text-[17px] font-black tracking-tight text-slate-900 leading-none'>
                            Equi<span className='text-rose-500'>Sense</span>
                        </span>
                        <span className='text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5'>Markets · AI · Wealth</span>
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className='hidden items-center gap-1 md:flex'>
                    {links.map((link) => link.subLinks ? (
                        <div
                            key={link.name}
                            className='relative'
                            onMouseEnter={() => setOpenDropdown(link.name)}
                            onMouseLeave={() => setOpenDropdown(null)}
                        >
                            <div className='flex cursor-pointer items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/70 transition-all'>
                                {link.name}
                                <ChevronDown className={`size-3.5 transition-transform duration-200 ${openDropdown === link.name ? 'rotate-180' : ''}`} />
                            </div>

                            <AnimatePresence>
                                {openDropdown === link.name && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                                        transition={{ duration: 0.15 }}
                                        className='absolute top-[calc(100%+8px)] left-0 z-40 w-[420px] rounded-[24px] border border-slate-200/60 bg-white/95 backdrop-blur-xl p-4 shadow-2xl shadow-slate-900/10'
                                    >
                                        <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2'>Explore Products</p>
                                        <div className='grid grid-cols-2 gap-1.5'>
                                            {link.subLinks.map((sub) => (
                                                <Link
                                                    to={sub.href}
                                                    key={sub.name}
                                                    className={`group/link flex items-center gap-3 rounded-2xl p-3 transition-all hover:bg-slate-50 ${isActive(sub.href) ? 'bg-orange-50 border border-orange-100' : ''}`}
                                                >
                                                    <div className='w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/20 group-hover/link:scale-110 transition-transform'>
                                                        <sub.icon className='size-4 text-white' />
                                                    </div>
                                                    <div>
                                                        <p className='text-sm font-bold text-slate-900'>{sub.name}</p>
                                                        <p className='text-[10px] text-slate-400 line-clamp-1'>{sub.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <Link
                            key={link.name}
                            to={link.href}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                isActive(link.href)
                                    ? 'text-slate-900 bg-white/80 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                            }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                {/* Right Side */}
                <div className='flex items-center gap-3'>
                    {user ? (
                        <div className='relative' ref={profileMenuRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className='flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-white border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-md transition-all'
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className='w-7 h-7 rounded-full border border-white shadow-sm' />
                                ) : (
                                    <div className='w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white text-xs font-black shadow-sm'>
                                        {user.name?.[0]?.toUpperCase() || 'U'}
                                    </div>
                                )}
                                <span className='text-sm font-bold text-slate-700 hidden sm:inline-block'>{user.name?.split(' ')[0]}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {showProfileMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                                        transition={{ duration: 0.15 }}
                                        className='absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-100 shadow-2xl shadow-slate-900/10 p-2 z-50'
                                    >
                                        <div className='px-3 py-2.5 mb-1'>
                                            <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Logged in as</p>
                                            <p className='text-sm font-bold text-slate-800 truncate mt-0.5'>{user.email}</p>
                                        </div>
                                        <div className='h-px bg-slate-100 mb-1' />
                                        <Link
                                            to="/settings"
                                            onClick={() => setShowProfileMenu(false)}
                                            className='flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-xl transition-colors'
                                        >
                                            <UserIcon className='w-4 h-4' /> Profile Settings
                                        </Link>
                                        <button
                                            onClick={handleLogout}
                                            className='flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 rounded-xl transition-colors'
                                        >
                                            <LogOut className='w-4 h-4' /> Logout
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAuthModal(true)}
                            className='hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-gradient-to-r hover:from-rose-500 hover:to-orange-500 transition-all shadow-md shadow-slate-900/10 hover:shadow-orange-500/20'
                        >
                            Sign In
                        </button>
                    )}

                    {/* Market status badge */}
                    <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isMarketOpen ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-500 live-dot' : 'bg-slate-400'}`} />
                        {isMarketOpen ? 'NSE Open' : 'Market Closed'}
                    </div>

                    <button onClick={() => setIsOpen(true)} className='transition active:scale-90 md:hidden p-2 rounded-xl hover:bg-white/70'>
                        <MenuIcon className='size-5 text-slate-700' />
                    </button>
                </div>
            </nav>


            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '-100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '-100%' }}
                        transition={{ type: 'tween', duration: 0.25 }}
                        className='fixed inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-2xl p-8 md:hidden'
                    >
                        <div className='flex items-center justify-between mb-10'>
                            <Link to='/' onClick={() => setIsOpen(false)} className='flex items-center gap-3'>
                                <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9">
                                    <defs>
                                        <linearGradient id="logoGradMobile" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                                            <stop offset="0%" stopColor="#f43f5e"/>
                                            <stop offset="100%" stopColor="#f97316"/>
                                        </linearGradient>
                                    </defs>
                                    <rect width="36" height="36" rx="10" fill="url(#logoGradMobile)"/>
                                    <rect x="6" y="20" width="4" height="9" rx="1.5" fill="white" opacity="0.5"/>
                                    <rect x="12" y="15" width="4" height="14" rx="1.5" fill="white" opacity="0.7"/>
                                    <rect x="18" y="10" width="4" height="19" rx="1.5" fill="white"/>
                                    <polyline points="7,22 13,17 19,12 27,7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
                                    <circle cx="27" cy="7" r="2" fill="white"/>
                                </svg>
                                <div className='flex flex-col leading-none'>
                                    <span className='text-[17px] font-black tracking-tight text-slate-900 leading-none'>Equi<span className='text-rose-500'>Sense</span></span>
                                    <span className='text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5'>Markets · AI · Wealth</span>
                                </div>
                            </Link>
                            <button onClick={() => setIsOpen(false)} className='p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors'>
                                <XIcon className='size-5 text-slate-600' />
                            </button>
                        </div>

                        <div className='flex flex-col gap-2 flex-1'>
                            {links.map((link) => (
                                <div key={link.name}>
                                    {link.subLinks ? (
                                        <>
                                            <button
                                                onClick={() => setOpenDropdown(openDropdown === link.name ? null : link.name)}
                                                className='flex items-center justify-between w-full px-4 py-3 rounded-2xl text-base font-bold text-slate-700 hover:bg-slate-50 transition-colors'
                                            >
                                                {link.name}
                                                <ChevronDown className={`size-4 transition-transform ${openDropdown === link.name ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {openDropdown === link.name && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className='ml-4 mt-1 flex flex-col gap-1 overflow-hidden'
                                                    >
                                                        {link.subLinks.map((sub) => (
                                                            <Link
                                                                key={sub.name}
                                                                to={sub.href}
                                                                onClick={() => setIsOpen(false)}
                                                                className='flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors'
                                                            >
                                                                <div className='w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0'>
                                                                    <sub.icon className='size-4 text-white' />
                                                                </div>
                                                                {sub.name}
                                                            </Link>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    ) : (
                                        <Link
                                            to={link.href}
                                            onClick={() => setIsOpen(false)}
                                            className='block px-4 py-3 rounded-2xl text-base font-bold text-slate-700 hover:bg-slate-50 transition-colors'
                                        >
                                            {link.name}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className='mt-auto pt-6 border-t border-slate-100'>
                            {!user ? (
                                <button
                                    onClick={() => { setShowAuthModal(true); setIsOpen(false); }}
                                    className='w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white text-sm font-black uppercase tracking-widest shadow-lg shadow-orange-500/20'
                                >
                                    Sign In / Sign Up
                                </button>
                            ) : (
                                <button
                                    onClick={handleLogout}
                                    className='w-full py-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-black uppercase tracking-widest'
                                >
                                    Logout
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
