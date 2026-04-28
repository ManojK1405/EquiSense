import HeroSection from "../sections/hero-section";
import WhatWeDoSection from "../sections/what-we-do-section";
import OurLatestCreations from "../sections/our-latest-creations";
import OurTestimonialSection from "../sections/our-testimonials-section";
import FaqSection from "../sections/faq-section";
import Newsletter from "../sections/newsletter";
import { motion } from "framer-motion";

export default function Home() {
    return (
        <div className='px-4 min-h-screen relative overflow-x-hidden'>
            {/* Background Decorative Elements */}
            <div className="absolute -top-20 -left-40 w-[700px] h-[700px] bg-indigo-400/[0.03] blur-[150px] rounded-full -z-10" />
            <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-rose-400/[0.08] blur-[150px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-orange-400/[0.04] blur-[120px] rounded-full -z-10" />

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                <HeroSection />
                <WhatWeDoSection />
                <OurLatestCreations />
                <OurTestimonialSection />
                <Newsletter />
                <FaqSection />
            </motion.div>
        </div>
    );
}
