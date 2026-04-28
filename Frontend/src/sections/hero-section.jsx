import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function HeroSection() {
    const installCommand = 'npm install prebuiltui@latest';
    const [isCopied, setIsCopied] = useState(false);

    const logos = [
        '/assets/companies-logo/instagram.svg',
        '/assets/companies-logo/framer.svg',
        '/assets/companies-logo/microsoft.svg',
        '/assets/companies-logo/huawei.svg',
        '/assets/companies-logo/walmart.svg',
    ]

    const handleCopy = () => {
        setIsCopied(true);
        navigator.clipboard.writeText(installCommand);
        setTimeout(() => {
            setIsCopied(false);
        }, 3000);
    }

    return (
        <section className="flex flex-col items-center justify-center relative h-svh overflow-hidden">
            <svg className="absolute inset-0 -z-10" width="1440" height="1018" viewBox="0 0 1440 1018" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g filter="url(#a)">
                    <ellipse cx="271.282" cy="200.379" rx="271.282" ry="200.379" fill="#EEF2FF" fillOpacity="0.15" />
                </g>
                <g filter="url(#b)">
                    <ellipse cx="993.487" cy="451.53" rx="359.487" ry="265.53" fill="url(#c)" fillOpacity="0.08" />
                </g>
                <defs>
                    <filter id="a" x="-300" y="-300" width="1142.56" height="1000.76" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur stdDeviation="150" result="effect1_foregroundBlur_8119_961" />
                    </filter>
                    <filter id="b" x="333.9" y="-114.1" width="1319.18" height="1131.26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                        <feGaussianBlur stdDeviation="150.05" result="effect1_foregroundBlur_8119_961" />
                        <feTurbulence type="fractalNoise" baseFrequency="0.01" stitchTiles="stitch" numOctaves="3" result="noise" seed="9943" />
                        <feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
                        <feComponentTransfer in="alphaNoise" result="coloredNoise1">
                            <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0" />
                        </feComponentTransfer>
                        <feComposite operator="in" in2="effect1_foregroundBlur_8119_961" in="coloredNoise1" result="noise1Clipped" />
                        <feFlood floodColor="rgba(0, 0, 0, 0.1)" result="color1Flood" />
                        <feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1" />
                        <feMerge result="effect2_noise_8119_961">
                            <feMergeNode in="effect1_foregroundBlur_8119_961" />
                            <feMergeNode in="color1" />
                        </feMerge>
                    </filter>
                    <linearGradient id="c" x1="550.41" y1="500.394" x2="1343.15" y2="82.986" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#F6DFF4" stopOpacity="0.4" />
                        <stop offset=".5" stopColor="#818CF8" stopOpacity="0.1" />
                        <stop offset="1" stopColor="#EF3EC2" stopOpacity="0.25" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="flex flex-wrap items-center justify-center p-1.5 rounded-full border border-orange-100 italic">
                <p className="pl-2 pr-3 text-gray-400 font-bold text-[10px] uppercase tracking-widest leading-none">A Smarter Way to Invest</p>
            </div>

            <h1
                className="text-4xl md:text-6xl/18 text-center font-bold max-w-4xl mt-5 bg-gradient-to-r from-black to-[#748298] text-transparent bg-clip-text tracking-tighter">
                Systematic Wealth Engine for{" "}
                <span className="text-premium">Intelligent Investors</span>.
            </h1>
            <p className="text-slate-500 md:text-lg max-md:px-4 text-center max-w-2xl mt-6 leading-relaxed">
                Cut through the market noise. EquiSense brings together real-time data, AI sentiment, and technical clarity into one actionable view.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
                <Link
                    to="/products/dashboard"
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-10 py-4 rounded-full transition-all duration-300 hover:-translate-y-1 hover:scale-105 shadow-xl shadow-orange-200 hover:shadow-2xl hover:shadow-orange-300/50 font-bold uppercase text-xs tracking-widest">
                    <span>Analyze the Market</span>
                    <ArrowRightIcon className='size-4' />
                </Link>
                <Link
                    to="/products/ai-strategist"
                    className="bg-white border border-slate-200 text-slate-900 px-10 py-4 rounded-full transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:bg-slate-50 font-bold uppercase text-xs tracking-widest">
                    Explore Strategy
                </Link>
            </div>
            {/* Market Alpha Metrics Bar */}
            <div className="mt-20 w-full max-w-5xl px-6">
                <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 py-10 border-y border-slate-100 bg-white/30 backdrop-blur-sm rounded-[40px]">
                    <div className="text-center group">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-orange-600 transition-colors">16% - 24%</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Avg. Strategy CAGR</p>
                    </div>
                    <div className="hidden md:block w-px h-10 bg-slate-100" />
                    <div className="text-center group">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-orange-600 transition-colors">50+</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Institutional Indicators</p>
                    </div>
                    <div className="hidden md:block w-px h-10 bg-slate-100" />
                    <div className="text-center group">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter group-hover:text-orange-600 transition-colors">97%</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI Sentiment Accuracy</p>
                    </div>
                </div>
            </div>
        </section >
    );
}