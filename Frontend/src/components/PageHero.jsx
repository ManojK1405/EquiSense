import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

// Animates a number from 0 → target over `duration` ms
function useCountUp(target, duration = 1400) {
    const [count, setCount] = useState(0);
    const raf = useRef(null);
    useEffect(() => {
        const start = performance.now();
        const num = parseFloat(String(target).replace(/[^0-9.]/g, '')) || 0;
        const step = (ts) => {
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(+(num * ease).toFixed(num % 1 !== 0 ? 1 : 0));
            if (progress < 1) raf.current = requestAnimationFrame(step);
        };
        raf.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf.current);
    }, [target, duration]);
    return count;
}

// Renders a stat value with count-up for numeric parts
function StatValue({ value, className }) {
    const raw = String(value);
    const match = raw.match(/^([+\-]?)(\d+\.?\d*)(.*)$/);
    if (!match) return <span className={className}>{value}</span>;
    const [, prefix, numStr, suffix] = match;
    const animated = useCountUp(parseFloat(numStr));
    return (
        <span className={className}>
            {prefix}{numStr.includes('.') ? animated.toFixed(1) : Math.floor(animated)}{suffix}
        </span>
    );
}

/**
 * PageHero — Multi-layout premium hero section.
 *
 * variant:
 *   "centered"      default – centered text, subtle gradient, stats bar
 *   "split-dark"    dark left panel with heading + right decorative glass card
 *   "gradient-bold" vivid full-bleed gradient with diagonal slash
 *   "minimal-left"  left-aligned with a large number/accent, clean white
 */
export default function PageHero({
    badge,
    title,
    titleAccent,
    subtitle,
    stats = [],
    accentColor = 'rose',
    variant = 'centered',
    decorativeContent, // JSX for the right panel (split-dark only)
    children,
}) {
    const item = {
        hidden: { opacity: 0, y: 18 },
        show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
    };
    const container = {
        hidden: {},
        show: { transition: { staggerChildren: 0.08 } },
    };

    // ─── VARIANT: SPLIT-DARK ────────────────────────────────────────────────────
    if (variant === 'split-dark') {
        const glowColor = {
            rose:    'from-rose-600 to-orange-600',
            orange:  'from-orange-500 to-amber-500',
            indigo:  'from-indigo-600 to-violet-600',
            emerald: 'from-emerald-500 to-teal-500',
            fuchsia: 'from-fuchsia-600 to-violet-600',
        }[accentColor] || 'from-rose-600 to-orange-600';

        const dotColor = {
            rose: 'bg-rose-500', orange: 'bg-orange-500',
            indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', fuchsia: 'bg-fuchsia-500',
        }[accentColor] || 'bg-rose-500';

        return (
            <section className="relative overflow-hidden bg-slate-900 pt-28 pb-0">
                {/* Grid texture */}
                <div className="absolute inset-0 opacity-[0.07]"
                    style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                {/* Glow */}
                <div className={`absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br ${glowColor} opacity-20 blur-[160px] rounded-full -ml-64 -mt-64 pointer-events-none`} />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
                        {/* Left: Text */}
                        <motion.div variants={container} initial="hidden" animate="show" className="pb-16">
                            {badge && (
                                <motion.div variants={item} className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.25em] mb-8">
                                    {badge.live && (
                                        <span className="relative flex h-2 w-2">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
                                            <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                                        </span>
                                    )}
                                    {badge.icon && <badge.icon className="w-3.5 h-3.5 text-white/70" />}
                                    {badge.label}
                                </motion.div>
                            )}
                            <motion.h1 variants={item} className="text-6xl md:text-7xl font-black text-white tracking-tighter leading-none mb-6">
                                {title}<br />
                                <span className={`bg-gradient-to-r ${glowColor} bg-clip-text text-transparent italic`}>{titleAccent}</span>
                            </motion.h1>
                            {subtitle && (
                                <motion.p variants={item} className="text-lg text-white/50 leading-relaxed font-medium mb-10 max-w-lg">
                                    {subtitle}
                                </motion.p>
                            )}
                            {children && <motion.div variants={item}>{children}</motion.div>}
                            {stats.length > 0 && (
                                <motion.div variants={item} className="flex flex-wrap gap-6 mt-10">
                                    {stats.map((s, i) => (
                                        <div key={i}>
                                            <StatValue value={s.value} className="text-2xl font-black text-white tracking-tight block" />
                                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{s.label}</p>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </motion.div>

                        {/* Right: Decorative panel */}
                        {decorativeContent && (
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.7, delay: 0.2 }}
                                className="h-[340px] lg:h-[420px] relative"
                            >
                                {decorativeContent}
                            </motion.div>
                        )}
                    </div>
                </div>
                {/* Scallop edge into white */}
                <div className="relative z-10 h-12 bg-white" style={{ borderRadius: '40px 40px 0 0', marginTop: '-1px' }} />
            </section>
        );
    }

    // ─── VARIANT: GRADIENT-BOLD ─────────────────────────────────────────────────
    if (variant === 'gradient-bold') {
        const bgMap = {
            rose:    'from-rose-50 via-white to-orange-50',
            orange:  'from-orange-50 via-white to-amber-50',
            indigo:  'from-indigo-50 via-white to-violet-50',
            emerald: 'from-emerald-50 via-white to-teal-50',
            fuchsia: 'from-fuchsia-50 via-white to-violet-50',
        }[accentColor] || 'from-rose-50 via-white to-orange-50';

        const accentLine = {
            rose:    'from-rose-500 to-orange-500',
            orange:  'from-orange-500 to-amber-400',
            indigo:  'from-indigo-500 to-violet-500',
            emerald: 'from-emerald-500 to-teal-400',
            fuchsia: 'from-fuchsia-500 to-violet-500',
        }[accentColor] || 'from-rose-500 to-orange-500';

        const dotColor = {
            rose: 'bg-rose-500', orange: 'bg-orange-500',
            indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', fuchsia: 'bg-fuchsia-500',
        }[accentColor] || 'bg-rose-500';

        const badgeColor = {
            rose:    'bg-rose-100 text-rose-700 border-rose-200',
            orange:  'bg-orange-100 text-orange-700 border-orange-200',
            indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
            emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            fuchsia: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
        }[accentColor] || 'bg-rose-100 text-rose-700 border-rose-200';

        return (
            <section className={`relative pt-28 pb-16 overflow-hidden bg-gradient-to-br ${bgMap}`}>
                {/* Diagonal slash */}
                <div className={`absolute right-0 top-0 h-full w-[45%] bg-gradient-to-bl ${accentLine} opacity-[0.05] skew-x-[-12deg] translate-x-32 pointer-events-none`} />
                {/* Large ghost letter */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[200px] md:text-[280px] font-black opacity-[0.04] tracking-tighter leading-none text-slate-900 select-none pointer-events-none hidden lg:block">
                    {titleAccent?.[0]}
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <motion.div variants={container} initial="hidden" animate="show">
                        {badge && (
                            <motion.div variants={item} className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.25em] mb-7 ${badgeColor}`}>
                                {badge.live && (
                                    <span className="relative flex h-2 w-2">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                                    </span>
                                )}
                                {badge.icon && <badge.icon className="w-3.5 h-3.5" />}
                                {badge.label}
                            </motion.div>
                        )}
                        <motion.h1 variants={item} className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none mb-5 max-w-3xl">
                            {title}{' '}
                            <span className={`bg-gradient-to-r ${accentLine} bg-clip-text text-transparent italic`}>{titleAccent}</span>
                        </motion.h1>
                        {/* Accent underline */}
                        <motion.div variants={item} className={`h-1.5 w-24 rounded-full bg-gradient-to-r ${accentLine} mb-7`} />
                        {subtitle && (
                            <motion.p variants={item} className="text-xl text-slate-500 max-w-2xl leading-relaxed font-medium mb-10">
                                {subtitle}
                            </motion.p>
                        )}
                        {children && <motion.div variants={item} className="mb-10">{children}</motion.div>}
                        {stats.length > 0 && (
                            <motion.div variants={item} className="flex flex-wrap gap-8">
                                {stats.map((s, i) => (
                                    <div key={i} className="flex flex-col">
                                        <StatValue value={s.value} className={`text-3xl font-black tracking-tight bg-gradient-to-r ${accentLine} bg-clip-text text-transparent`} />
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</span>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </section>
        );
    }

    // ─── VARIANT: MINIMAL-LEFT ──────────────────────────────────────────────────
    if (variant === 'minimal-left') {
        const accentBorder = {
            rose:    'border-rose-500',
            orange:  'border-orange-500',
            indigo:  'border-indigo-500',
            emerald: 'border-emerald-500',
            fuchsia: 'border-fuchsia-500',
        }[accentColor] || 'border-rose-500';

        const accentText = {
            rose:    'text-rose-600',
            orange:  'text-orange-600',
            indigo:  'text-indigo-600',
            emerald: 'text-emerald-600',
            fuchsia: 'text-fuchsia-600',
        }[accentColor] || 'text-rose-600';

        const statBg = {
            rose:    'bg-rose-50 border-rose-100',
            orange:  'bg-orange-50 border-orange-100',
            indigo:  'bg-indigo-50 border-indigo-100',
            emerald: 'bg-emerald-50 border-emerald-100',
            fuchsia: 'bg-fuchsia-50 border-fuchsia-100',
        }[accentColor] || 'bg-rose-50 border-rose-100';

        const dotColor = {
            rose: 'bg-rose-500', orange: 'bg-orange-500',
            indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', fuchsia: 'bg-fuchsia-500',
        }[accentColor] || 'bg-rose-500';

        return (
            <section className="relative pt-28 pb-12 overflow-hidden bg-white border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div variants={container} initial="hidden" animate="show">
                            {badge && (
                                <motion.div variants={item} className="flex items-center gap-3 mb-8">
                                    {badge.live && (
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
                                        </span>
                                    )}
                                    {badge.icon && <badge.icon className={`w-4 h-4 ${accentText}`} />}
                                    <span className={`text-xs font-black uppercase tracking-widest ${accentText}`}>{badge.label}</span>
                                </motion.div>
                            )}
                            <motion.h1 variants={item} className={`text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none mb-6 pl-6 border-l-[5px] ${accentBorder}`}>
                                {title}<br />
                                <span className="text-premium italic">{titleAccent}</span>
                            </motion.h1>
                            {subtitle && (
                                <motion.p variants={item} className="text-lg text-slate-500 leading-relaxed font-medium mb-8 max-w-md">
                                    {subtitle}
                                </motion.p>
                            )}
                            {children && <motion.div variants={item}>{children}</motion.div>}
                        </motion.div>

                        {/* Right: Stats grid */}
                        {stats.length > 0 && (
                            <motion.div
                                variants={container} initial="hidden" animate="show"
                                className="grid grid-cols-2 gap-4"
                            >
                                {stats.map((s, i) => (
                                    <motion.div key={i} variants={item} className={`p-6 rounded-3xl border ${statBg}`}>
                                        <StatValue value={s.value} className={`text-3xl font-black tracking-tight mb-1 block ${accentText}`} />
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </div>
                </div>
            </section>
        );
    }

    // ─── VARIANT: CENTERED (default) ────────────────────────────────────────────
    const glowMap = {
        rose:    'from-rose-500/15 to-orange-500/8',
        orange:  'from-orange-500/15 to-amber-400/8',
        indigo:  'from-indigo-500/15 to-violet-500/8',
        emerald: 'from-emerald-500/15 to-teal-400/8',
        fuchsia: 'from-fuchsia-500/15 to-violet-500/8',
    };
    const badgeBgMap = {
        rose:    'bg-rose-50 border-rose-100 text-rose-600',
        orange:  'bg-orange-50 border-orange-100 text-orange-600',
        indigo:  'bg-indigo-50 border-indigo-100 text-indigo-600',
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        fuchsia: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600',
    };
    const statColorMap = {
        rose: 'text-rose-600', orange: 'text-orange-600',
        emerald: 'text-emerald-600', indigo: 'text-indigo-600', fuchsia: 'text-fuchsia-600',
    };
    const dotColor = {
        rose: 'bg-rose-500', orange: 'bg-orange-500',
        indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', fuchsia: 'bg-fuchsia-500',
    }[accentColor] || 'bg-rose-500';

    return (
        <section className={`relative pt-28 pb-16 overflow-hidden bg-gradient-to-br ${glowMap[accentColor] || glowMap.rose}`}>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/60 rounded-full blur-[100px] -mr-64 -mt-64 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/40 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="max-w-7xl mx-auto px-6 relative z-10">
                <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col items-center text-center">
                    {badge && (
                        <motion.div variants={item} className={`inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] mb-7 border shadow-sm ${badgeBgMap[accentColor] || badgeBgMap.rose}`}>
                            {badge.live && (
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute h-full w-full rounded-full opacity-75 ${dotColor}`} />
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
                                </span>
                            )}
                            {badge.icon && <badge.icon className="w-3.5 h-3.5" />}
                            {badge.label}
                        </motion.div>
                    )}
                    <motion.h1 variants={item} className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none mb-5">
                        {title}{' '}<span className="text-premium italic">{titleAccent}</span>
                    </motion.h1>
                    {subtitle && (
                        <motion.p variants={item} className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium mb-10">
                            {subtitle}
                        </motion.p>
                    )}
                    {children && <motion.div variants={item} className="mb-10">{children}</motion.div>}
                    {stats.length > 0 && (
                        <motion.div variants={item} className="flex flex-wrap items-center justify-center gap-px bg-slate-200/60 rounded-[20px] overflow-hidden border border-slate-200/60 shadow-sm">
                            {stats.map((s, i) => (
                                <div key={i} className="flex flex-col items-center px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white transition-colors">
                                    <StatValue value={s.value} className={`text-xl font-black tracking-tight ${statColorMap[s.color] || statColorMap.rose}`} />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </motion.div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/50 to-transparent pointer-events-none" />
        </section>
    );
}
