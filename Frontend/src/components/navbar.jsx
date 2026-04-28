import { MenuIcon, XIcon, ChevronDown, Activity, Brain, Target, LayoutDashboard, Briefcase, History, BarChart2, LogOut, User as UserIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const { user, logout, setShowAuthModal } = useAuth();
    const navigate = useNavigate();
    const profileMenuRef = useRef(null);

    // Close profile menu on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        };

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showProfileMenu]);

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
    ];

    const handleLogout = () => {
        logout();
        setShowProfileMenu(false);
        navigate('/');
    };

    return (
        <>
            <nav className='sticky top-0 z-50 flex w-full items-center justify-between bg-gradient-to-r from-indigo-50/20 via-slate-50/90 to-rose-50/50 px-4 py-3.5 backdrop-blur-md border-b border-slate-200/30 md:px-16 lg:px-24'>
                <Link to='/' className='flex items-center gap-2'>
                    <span className='text-2xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-orange-600 decoration-4 underline-offset-4'>Equi<span className='text-premium'>Sense</span></span>
                </Link>

                <div className='hidden items-center space-x-7 text-gray-700 md:flex'>
                    {links.map((link) => link.subLinks ? (
                        <div key={link.name} className='group relative' onMouseEnter={() => setOpenDropdown(link.name)} onMouseLeave={() => setOpenDropdown(null)}>
                            <div className='flex cursor-pointer items-center gap-1 hover:text-black'>
                                {link.name}
                                <ChevronDown className={`mt-px size-4 transition-transform duration-200 ${openDropdown === link.name ? 'rotate-180' : ''}`} />
                            </div>

                            <div className={`absolute top-6 left-0 z-40 w-lg rounded-md border border-gray-100 bg-white p-3 shadow-lg transition-all duration-200 ease-in-out ${openDropdown === link.name ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-2 opacity-0'}`}>
                                <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2'>Explore our AI tools</p>
                                <div className='grid grid-cols-2 gap-2'>
                                    {link.subLinks.map((sub) => (
                                        <Link to={sub.href} key={sub.name} className='group/link flex items-center gap-2 rounded-md p-2 transition hover:bg-gray-100'>
                                            <div className='w-max gap-1 rounded-md btn p-2'>
                                                <sub.icon className='size-4.5 text-white transition duration-300 group-hover/link:scale-110' />
                                            </div>
                                            <div>
                                                <p className='font-medium'>{sub.name}</p>
                                                <p className='text-xs text-gray-400 line-clamp-1'>{sub.description}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link key={link.name} to={link.href} className='transition hover:text-black'>
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className='flex items-center gap-4'>
                    {user ? (
                        <div className='relative' ref={profileMenuRef}>
                            <button 
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className='flex items-center gap-2 p-1 pr-3 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors'
                            >
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} className='w-8 h-8 rounded-full border border-white shadow-sm' />
                                ) : (
                                    <div className='w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold'>
                                        {user.name?.[0] || 'U'}
                                    </div>
                                )}
                                <span className='text-sm font-medium text-slate-700 hidden sm:inline-block'>{user.name?.split(' ')[0]}</span>
                            </button>

                            <AnimatePresence>
                                {showProfileMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className='absolute right-0 mt-2 w-48 rounded-xl bg-white border border-gray-100 shadow-xl p-2 z-50'
                                    >
                                        <div className='px-3 py-2 border-bottom border-gray-50 mb-1'>
                                            <p className='text-xs text-gray-400'>Logged in as</p>
                                            <p className='text-sm font-semibold text-slate-800 truncate'>{user.email}</p>
                                        </div>
                                        <Link 
                                            to="/settings" 
                                            onClick={() => setShowProfileMenu(false)}
                                            className='flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors'
                                        >
                                            <UserIcon className='w-4 h-4' /> Profile Settings
                                        </Link>
                                        <button 
                                            onClick={handleLogout}
                                            className='flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1'
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
                            className='hidden rounded-full btn px-8 py-2.5 font-medium text-white transition hover:opacity-90 md:inline-block'
                        >
                            Log In / Sign Up
                        </button>
                    )}

                    <button onClick={() => setIsOpen(true)} className='transition active:scale-90 md:hidden'>
                        <MenuIcon className='size-6.5' />
                    </button>
                </div>
            </nav>

            {/* Mobile Menu */}
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white/20 text-lg font-medium backdrop-blur-2xl transition duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {links.map((link) => (
                    <div key={link.name} className='text-center'>
                        {link.subLinks ? (
                            <>
                                <button onClick={() => setOpenDropdown(openDropdown === link.name ? null : link.name)} className='flex items-center justify-center gap-1 text-gray-800'>
                                    {link.name}
                                    <ChevronDown className={`size-4 transition-transform ${openDropdown === link.name ? 'rotate-180' : ''}`} />
                                </button>
                                {openDropdown === link.name && (
                                    <div className='mt-2 flex flex-col gap-2 text-left text-sm'>
                                        {link.subLinks.map((sub) => (
                                            <Link key={sub.name} to={sub.href} className='block text-gray-600 transition hover:text-black' onClick={() => setIsOpen(false)}>
                                                {sub.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link to={link.href} className='block text-gray-800 transition hover:text-black' onClick={() => setIsOpen(false)}>
                                {link.name}
                            </Link>
                        )}
                    </div>
                ))}

                {!user && (
                    <button 
                        onClick={() => { setShowAuthModal(true); setIsOpen(false); }}
                        className='rounded-full btn px-8 py-2.5 font-medium text-white transition hover:opacity-90'
                    >
                        Log In / Sign Up
                    </button>
                )}

                {user && (
                    <button 
                        onClick={handleLogout}
                        className='text-red-500 font-bold'
                    >
                        Logout
                    </button>
                )}

                <button onClick={() => setIsOpen(false)} className='rounded-md btn p-2 text-white ring-white active:ring-2'>
                    <XIcon />
                </button>
            </div>
        </>
    );
}
