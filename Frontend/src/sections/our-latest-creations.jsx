import SectionTitle from "../components/section-title";

export default function OurLatestCreations() {

    const data = [
        {
            title: 'Sentiment Engine',
            description: 'Analyzes millions of news data points to gauge market mood and emotional volatility.',
            image: 'https://res.cloudinary.com/dy0drp7ka/image/upload/v1777402223/maSrcNXVdjFqw8seksTyL8ReVmNLf5ggUVuqzjv9b3J9NxK3h6YS22Ue4R2rrUBdHlvcNdtNPFYFli3976mllUxk5JdUpryMXGTv8P1Ig6vBsOKBtg4njOfZCGUEkHdgZN0379VWSJIXqGwCWPiwcc8jeGb1KdwvtajETsnKgwtBuSI9jiuriipUe7JnqsBY_prnti3.jpg',
        },
        {
            title: 'Technical Terminal',
            description: 'Institutional-grade indicators and chart patterns tracked with millisecond precision.',
            image: 'https://res.cloudinary.com/dy0drp7ka/image/upload/v1777402123/bza5FbI6wyuClrBIo04GVgv6_WEzyIa-glrIkg3PbE5BNLxQohYS-SDnOFAuEhkqDYlrBoh5BR76-NCrtZvON4-KLalftUjOlOs2aHWfFUg5QBTnFtHUg9uwusanSGUf2bI_f20flXjbblxU3GfwU7KkUKnNeQx7aKQSAcePOHM1yH5JlzF_wPeTwRnsRI5S_lrsdap.jpg',
        },
        {
            title: 'Portfolio Vault',
            description: 'Seamlessly switch between Live tracking and Paper trading with real-time WebSocket sync.',
            image: 'https://res.cloudinary.com/dy0drp7ka/image/upload/v1777402123/qmfXwdWgbaPbYgxcgZKFwN2Wi_ytYdDS53pZoiZkDQQC3WR6o3Ru7KniI_bC80YAXpD2EnCh3AUkI6qxidOG9_ODl89SD6ZNmgVZhJ8G1pelltJc7QOBTq_8wuAzY2zftd5BfCkc9fHGUy67nmCfUGSZR2YA7hb7LP7FC0siLnGLwtW4c8mxPGTYjWWknPzU_tg6bx2.jpg'
        },
    ];
    return (
        <section className="py-40 bg-transparent">
            <SectionTitle
                title="Quant Intelligence"
                subtitle="A suite of proprietary algorithms designed to strip away market noise and reveal institutional-grade insights."
            />
            <div className="flex flex-wrap items-center justify-center gap-10 mt-24 px-6 max-w-7xl mx-auto">
                {data.map((item, index) => (
                    <div key={index} className="flex-1 min-w-[300px] max-w-[380px] group cursor-pointer">
                        <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-[32px] p-2 shadow-xl shadow-slate-200/50 group-hover:shadow-2xl group-hover:shadow-orange-200/40 transition-all duration-500 group-hover:-translate-y-2">
                            <div className="overflow-hidden rounded-[26px]">
                                <img
                                    className="w-full aspect-[4/2.5] object-cover group-hover:scale-105 transition-transform duration-700"
                                    src={item.image}
                                    alt={item.title}
                                />
                            </div>
                            <div className="p-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3 group-hover:text-orange-600 transition-colors">{item.title}</h3>
                                <p className="text-slate-500 leading-relaxed font-medium">{item.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}