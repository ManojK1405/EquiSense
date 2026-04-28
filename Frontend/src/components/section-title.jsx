export default function SectionTitle({ title, subtitle }) {
    return (
        <div className='flex flex-col items-center justify-center'>
            <h2 className='text-center text-4xl font-black tracking-tighter text-slate-900'>{title}</h2>
            <div className='h-1 w-12 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 mt-3 mb-4' />
            <p className='mt-1 max-w-xs text-center text-slate-500 font-medium md:max-w-lg leading-relaxed'>{subtitle}</p>
        </div>
    );
}
