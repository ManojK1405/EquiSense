import { LinkedinIcon, InstagramIcon, Github } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
    const sections = [
        {
            title: 'Company',
            links: [
                { title: 'About Us', href: '/about-us' },
                { title: 'Our Vision', href: '/our-vision' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { title: 'Terms & Conditions', href: '/terms' },
                { title: 'Privacy', href: '/privacy' },
            ],
        },
        {
            title: 'Support',
            links: [
                { title: 'Contact Us', href: '/contact-us' },
            ],
        },
    ];

    const socialLinks = {
        github: "https://github.com/ManojK1405/EquiSense.git",
        instagram: "https://instagram.com/manojkalasgonda",
        linkedin: "https://linkedin.com/in/manojkalasgonda"
    };

    return (
        <footer className="px-4 md:px-16 lg:px-24 text-[13px] mt-32 text-gray-500 border-t border-slate-100 pt-20 pb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 md:gap-16">
                <div className="col-span-2 lg:col-span-2">
                    <Link to='/' className='flex items-center gap-2 mb-6'>
                        <span className='text-3xl font-black text-slate-900 tracking-tighter italic uppercase underline decoration-orange-600 decoration-4 underline-offset-4'>Equi<span className='text-premium'>Sense</span></span>
                    </Link>
                    <p className="max-w-xs leading-relaxed">
                        EquiSense provides institutional-grade quantitative research and AI-driven wealth strategies for the modern investor.
                    </p>
                </div>

                {sections.map((section, idx) => (
                    <div key={idx}>
                        <p className="font-black text-slate-900 uppercase tracking-widest text-[10px] mb-6">{section.title}</p>
                        <ul className="space-y-4">
                            {section.links.map((link, lIdx) => (
                                <li key={lIdx}>
                                    <Link to={link.href} className="hover:text-orange-600 transition-colors">
                                        {link.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="flex flex-col md:flex-row py-10 mt-20 border-t border-slate-100 md:justify-between items-center gap-6">
                <p>© 2026 EquiSense Platforms Pvt Ltd. All rights reserved.</p>
                <div className="flex items-center gap-6">
                    <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-600 transition-colors">
                        <LinkedinIcon className="size-5" />
                    </a>
                    <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-600 transition-colors">
                        <InstagramIcon className="size-5" />
                    </a>
                    <a href={socialLinks.github} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-orange-600 transition-colors">
                        <Github className="size-5" />
                    </a>
                </div>
            </div>
            <p className="text-center">
                Developed with <span className="text-premium">Passion</span>  by <span className="text-premium">Manoj K.</span>
            </p>
        </footer>
    );
};