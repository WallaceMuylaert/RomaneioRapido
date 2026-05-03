import { Zap, Check, Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { PLANS } from '../constants/plans'
import { useRef, useState, useEffect, useCallback } from 'react'

interface PlansGridProps {
    effectivePlanId: string
    isSubscribing: string | null
    handleSubscribe: (planId: string) => Promise<void>
}

export default function PlansGrid({ effectivePlanId, isSubscribing, handleSubscribe }: PlansGridProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const [isPaused, setIsPaused] = useState(false)
    const visiblePlans = PLANS.filter(p => !p.hidden)

    const handleScroll = useCallback(() => {
        if (scrollRef.current) {
            const scrollLeft = scrollRef.current.scrollLeft
            const newIndex = Math.round(scrollLeft / (280 + 16)) // Card width + gap
            setActiveIndex(newIndex)
        }
    }, [])

    useEffect(() => {
        const scrollContainer = scrollRef.current
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
            return () => scrollContainer.removeEventListener('scroll', handleScroll)
        }
    }, [handleScroll])

    useEffect(() => {
        if (isPaused) return

        const timer = setInterval(() => {
            if (scrollRef.current) {
                const nextIndex = (activeIndex + 1) % visiblePlans.length
                const cardWidth = 280 + 16 // lg: 320 + 24
                
                scrollRef.current.scrollTo({
                    left: nextIndex * cardWidth,
                    behavior: 'smooth'
                })
            }
        }, 5000)

        return () => clearInterval(timer)
    }, [activeIndex, isPaused, visiblePlans.length])

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef
            const scrollAmount = current.offsetWidth * 0.8
            current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            })
            setIsPaused(true)
            setTimeout(() => setIsPaused(false), 10000)
        }
    }

    return (
        <div 
            className="relative group/carousel max-w-full"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Scroll Buttons - Hidden on Mobile */}
            <button
                onClick={() => scroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 z-20 w-12 h-12 bg-card border border-border rounded-full items-center justify-center text-text-secondary hover:text-brand-600 shadow-xl transition-all opacity-0 group-hover/carousel:opacity-100 hidden xl:flex hover:scale-110 active:scale-95"
            >
                <ChevronLeft className="w-6 h-6" />
            </button>

            <button
                onClick={() => scroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 -mr-6 z-20 w-12 h-12 bg-card border border-border rounded-full items-center justify-center text-text-secondary hover:text-brand-600 shadow-xl transition-all opacity-0 group-hover/carousel:opacity-100 hidden xl:flex hover:scale-110 active:scale-95"
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Carousel Container */}
            <div 
                ref={scrollRef}
                className="flex overflow-x-auto gap-4 lg:gap-6 pb-12 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 lg:-mx-0 lg:px-0 scroll-pl-4 lg:scroll-pl-0"
            >
                {visiblePlans.map((p, idx) => {
                    const isSelected = p.id === effectivePlanId
                    const isPopular = p.highlight
                    const isActive = idx === activeIndex

                    return (
                        <div
                            key={p.id}
                            className={`flex-none w-[280px] lg:w-[320px] snap-start snap-always group p-6 lg:p-10 rounded-[2.5rem] border transition-all duration-700 flex flex-col h-full relative overflow-hidden ${isSelected
                                ? 'border-brand-500 bg-brand-50/30 shadow-2xl shadow-brand-200/50 ring-1 ring-brand-200'
                                : 'border-border/80 bg-card hover:border-brand-300 hover:shadow-2xl hover:shadow-slate-200/50'
                                } ${isActive ? 'scale-100 opacity-100' : 'scale-[0.96] opacity-90 lg:scale-100 lg:opacity-100'}`}
                        >
                            {/* Popular Badge */}
                            {isPopular && !isSelected && (
                                <div className="absolute top-0 right-0 p-3 lg:p-5">
                                    <div className="bg-brand-600 text-card text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-lg shadow-primary/30 animate-pulse">
                                        Destaque
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col items-start gap-4 mb-8">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-700 ${isSelected ? 'bg-brand-600 text-card shadow-lg shadow-brand-600/30' : 'bg-background text-text-secondary group-hover:bg-brand-100 group-hover:text-brand-600'
                                    }`}>
                                    <Zap className={`w-7 h-7 ${isSelected ? 'animate-pulse' : ''}`} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-extrabold text-text-primary text-2xl tracking-tight leading-none">{p.name}</h4>
                                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{p.id === 'trial' ? 'Acesso inicial' : 'Assinatura mensal'}</p>
                                </div>
                            </div>

                            <div className="mb-10 flex-grow">
                                <ul className="space-y-4">
                                    {p.features.map((feat, i) => (
                                        <li key={i} className="flex items-start gap-3.5 text-[14px] font-semibold text-text-secondary transition-colors group-hover:text-text-primary">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-background text-text-secondary/60 group-hover:bg-brand-50 group-hover:text-brand-500'}`}>
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span className="leading-snug">{feat}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="border-t border-border/80 pt-8 mt-auto flex flex-col items-center">
                                <div className="flex items-baseline gap-1 mb-8">
                                    <p className="font-black text-text-primary text-4xl tracking-tighter">{p.price}</p>
                                    {p.period && <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{p.period}</p>}
                                </div>
                                <button
                                    onClick={() => !isSelected && handleSubscribe(p.id)}
                                    disabled={isSelected || !!(isSubscribing && isSubscribing === p.id)}
                                    className={`w-full h-14 rounded-2xl text-base font-black transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${isSelected
                                        ? 'bg-brand-100 text-brand-700 cursor-default font-bold border border-brand-200'
                                        : 'bg-text-primary text-card hover:bg-brand-600 shadow-xl shadow-slate-200 hover:shadow-primary/40'
                                        }`}
                                >
                                    {isSubscribing === p.id
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : isSelected ? 'Plano atual' : 'Selecionar'}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Premium Dots Indicator */}
            <div className="flex justify-center items-center gap-3 mt-4">
                {visiblePlans.map((_, i) => (
                    <button 
                        key={i}
                        onClick={() => {
                            const cardWidth = 280 + 16
                            scrollRef.current?.scrollTo({ left: i * cardWidth, behavior: 'smooth' })
                            setIsPaused(true)
                            setTimeout(() => setIsPaused(false), 10000)
                        }}
                        className={`h-2 rounded-full transition-all duration-500 ${activeIndex === i ? 'w-8 bg-brand-500 shadow-lg shadow-primary/20' : 'w-2 bg-border hover:bg-slate-300'}`}
                    />
                ))}
            </div>
        </div>
    )
}
