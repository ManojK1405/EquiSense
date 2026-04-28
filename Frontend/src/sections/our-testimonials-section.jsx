import React from 'react';
import SectionTitle from '../components/section-title';
import { StarIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OurTestimonialSection() {
    const data = [
        {
            review: "EquiSense transformed my trading from reactive to proactive. The sentiment engine is frighteningly accurate.",
            name: "Arjun Mehta",
            about: "Intraday Scalper",
            rating: 5,
            image: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200",
        },
        {
            review: "I used to spend hours on spreadsheets. Now, the Goal Backcaster does my 10-year goal planning in seconds.",
            name: "Priya Sharma",
            about: "Long-term Investor",
            rating: 5,
            image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200",
        },
        {
            review: "The institutional-grade data at this price point is insane. Finally, a tool that respects the retail investor.",
            name: "Siddharth Goel",
            about: "Portfolio Manager",
            rating: 5,
            image: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&auto=format&fit=crop&q=60",
        },
        {
            review: "Finally, an AI that doesn't just hallucinate but actually backs its claims with technical chart patterns.",
            name: "Ananya Iyer",
            about: "Quant Enthusiast",
            rating: 5,
            image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&h=100&auto=format&fit=crop",
        },
        {
            review: "Renaming to Goal Backcaster really highlights its technical depth. Loving the new branding and accuracy!",
            name: "Rahul V.",
            about: "Wealth Manager",
            rating: 5,
            image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200",
        },
        {
            review: "The Intraday Pulse has become my go-to for Nifty scalp signals. Extremely reliable momentum tracking.",
            name: "Karan Singh",
            about: "Day Trader",
            rating: 5,
            image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200",
        }
    ];

    // Tripling the data to ensure no blank spaces even on large screens
    const row1 = [...data.slice(0, 3), ...data.slice(0, 3), ...data.slice(0, 3)];
    const row2 = [...data.slice(3, 6), ...data.slice(3, 6), ...data.slice(3, 6)];

    const TestimonialCard = ({ item }) => (
        <div className='w-88 shrink-0 space-y-4 rounded-[32px] border border-slate-100 bg-white p-8 text-gray-500 transition-all duration-300 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 group'>
            <div className='flex gap-1'>
                {[...Array(item.rating)].map((_, i) => (
                    <StarIcon key={i} className='size-3.5 fill-orange-500 text-orange-500' />
                ))}
            </div>
            <p className='text-sm leading-relaxed text-slate-600 italic'>“{item.review}”</p>
            <div className='flex items-center gap-4 pt-4 border-t border-slate-50'>
                <img className='size-12 rounded-2xl object-cover' src={item.image} alt={item.name} />
                <div>
                    <p className='font-black text-slate-900 text-sm tracking-tight'>{item.name}</p>
                    <p className='text-slate-400 text-[10px] font-bold uppercase tracking-widest'>{item.about}</p>
                </div>
            </div>
        </div>
    );

    return (
        <section className='flex flex-col items-center justify-center mt-40 overflow-visible'>
            <SectionTitle title='Voices of Clarity' subtitle='Hear from our community of systematic investors who moved from uncertainty to intelligence with EquiSense.' />

            <div className='mt-16 w-full space-y-8 relative overflow-hidden py-10'>
                {/* Gradient Fades */}
                <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent z-10 hidden md:block" />
                <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-slate-50 via-slate-50/90 to-transparent z-10 hidden md:block" />

                {/* Row 1: Moving Left */}
                <div className="flex">
                    <motion.div 
                        className='flex gap-6'
                        animate={{
                            x: [0, '-33.33%'],
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 25,
                                ease: "linear",
                            },
                        }}
                        style={{ width: 'fit-content' }}
                    >
                        {row1.map((item, index) => <TestimonialCard key={index} item={item} />)}
                    </motion.div>
                </div>

                {/* Row 2: Moving Right */}
                <div className="flex">
                    <motion.div 
                        className='flex gap-6'
                        animate={{
                            x: ['-33.33%', 0],
                        }}
                        transition={{
                            x: {
                                repeat: Infinity,
                                repeatType: "loop",
                                duration: 30,
                                ease: "linear",
                            },
                        }}
                        style={{ width: 'fit-content' }}
                    >
                        {row2.map((item, index) => <TestimonialCard key={index} item={item} />)}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}