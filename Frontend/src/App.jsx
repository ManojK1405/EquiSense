import { Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/scroll-to-top";
import LenisScroll from "./components/lenis-scroll";
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Portfolio from "./pages/Portfolio";
import IntradayPulse from "./pages/IntradayPulse";
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

export default function App() {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <AuthProvider>
                <SocketProvider>
                    <ScrollToTop />
                    <LenisScroll />
                    <Toaster position="top-right" reverseOrder={false} />
                    <Navbar />
                    <AuthModal />
                    <main className='min-h-screen bg-transparent'>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/products/dashboard" element={<Dashboard />} />
                            <Route path="/products/portfolio" element={<Portfolio />} />
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
                    </main>
                    <Footer />
                </SocketProvider>
            </AuthProvider>
        </GoogleOAuthProvider>
    );
}