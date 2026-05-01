import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ScrollToTop from "./components/scroll-to-top";
import LenisScroll from "./components/lenis-scroll";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import IntradayPulse from "./pages/IntradayPulse";
import NewsTerminal from "./pages/NewsTerminal";
import AIStrategist from "./pages/AIStrategist";
import ReverseStrategist from "./pages/ReverseStrategist";
import Backtester from "./pages/Backtester";
import AboutUs from "./pages/AboutUs";
import OurVision from "./pages/OurVision";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import ContactUs from "./pages/ContactUs";
import Settings from "./pages/Settings";
import AuthModal from "./components/auth-modal";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "react-hot-toast";
import ChatWidget from "./components/ChatWidget";

const pageVariants = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.2, ease: "easeIn" } },
};

function AnimatedRoutes() {
    const location = useLocation();
    return (
        <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={location.pathname}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ overflow: 'visible' }}
            >
                <Routes location={location}>
                    <Route path="/" element={<Home />} />
                    <Route path="/products/dashboard" element={<Dashboard />} />
                    <Route path="/products/portfolio" element={<Portfolio />} />
                    <Route path="/products/news-terminal" element={<NewsTerminal />} />
                    <Route path="/products/intraday-pulse" element={<IntradayPulse />} />
                    <Route path="/products/ai-strategist" element={<AIStrategist />} />
                    <Route path="/products/goal-backcaster" element={<ReverseStrategist />} />
                    <Route path="/products/backtester" element={<Backtester />} />
                    <Route path="/about-us" element={<AboutUs />} />
                    <Route path="/our-vision" element={<OurVision />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/contact-us" element={<ContactUs />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </motion.div>
        </AnimatePresence>
    );
}

export default function App() {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <SocketProvider>
                    <ScrollToTop />
                    <LenisScroll />
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            style: {
                                background: '#0f172a',
                                color: '#f8fafc',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                fontSize: '12px',
                                fontWeight: '700',
                                letterSpacing: '0.02em',
                                border: '1px solid rgba(255,255,255,0.08)',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                            },
                            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                            error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
                        }}
                    />
                    <Navbar />
                    <AuthModal />
                    <ChatWidget />
                    <div className='px-4 min-h-screen relative overflow-visible'>
                        <AnimatedRoutes />
                    </div>
                    <Footer />
                </SocketProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}