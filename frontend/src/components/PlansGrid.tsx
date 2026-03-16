import { Zap, Check, Loader2 } from 'lucide-react'
import { PLANS } from '../constants/plans'

interface PlansGridProps {
    effectivePlanId: string
    isSubscribing: string | null
    handleSubscribe: (planId: string) => Promise<void>
}

export default function PlansGrid({ effectivePlanId, isSubscribing, handleSubscribe }: PlansGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-fr">
            {PLANS.filter(p => !p.hidden).map((p) => {
                const isSelected = p.id === effectivePlanId
                const isPopular = p.highlight

                return (
                    <div
                        key={p.id}
                        className={`group p-8 rounded-[2.5rem] border transition-all duration-500 flex flex-col h-full relative overflow-hidden ${isSelected
                            ? 'border-brand-500 bg-brand-50/30 shadow-2xl shadow-brand-200/50 ring-1 ring-brand-200'
                            : 'border-slate-200/80 bg-white hover:border-brand-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2'
                            }`}
                    >
                        {/* Popular Badge */}
                        {isPopular && !isSelected && (
                            <div className="absolute top-0 right-0 p-4">
                                <div className="bg-brand-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg shadow-brand-500/30 animate-pulse">
                                    Destaque
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col items-start gap-4 mb-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isSelected ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-slate-50 text-slate-400 group-hover:bg-brand-100 group-hover:text-brand-600'
                                }`}>
                                <Zap className={`w-6 h-6 ${isSelected ? 'animate-pulse' : ''}`} />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-slate-900 text-xl tracking-tight leading-none mb-1.5">{p.name}</h4>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.id === 'trial' ? 'Acesso inicial' : 'Assinatura mensal'}</p>
                            </div>
                        </div>

                        <div className="mb-8 flex-grow">
                            <ul className="space-y-3.5">
                                {p.features.slice(0, 4).map((feat, i) => (
                                    <li key={i} className="flex items-start gap-3 text-[13px] font-semibold text-slate-600 transition-colors group-hover:text-slate-900">
                                        <div className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-brand-100 text-brand-600' : 'bg-slate-50 text-slate-300 group-hover:bg-brand-50 group-hover:text-brand-500'}`}>
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span className="leading-snug">{feat}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border-t border-slate-100/80 pt-6 mt-auto flex flex-col items-center">
                            <div className="flex items-baseline gap-1 mb-6">
                                <p className="font-black text-slate-900 text-3xl tracking-tighter">{p.price}</p>
                                {p.period && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.period}</p>}
                            </div>
                            <button
                                onClick={() => !isSelected && handleSubscribe(p.id)}
                                disabled={isSelected || !!(isSubscribing && isSubscribing === p.id)}
                                className={`w-full h-12 rounded-xl text-sm font-black transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 ${isSelected
                                    ? 'bg-brand-100 text-brand-700 cursor-default font-black border border-brand-200'
                                    : 'bg-slate-900 text-white hover:bg-brand-600 shadow-lg shadow-slate-200 hover:shadow-brand-500/30'
                                    }`}
                            >
                                {isSubscribing === p.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : isSelected ? 'Plano atual' : 'Selecionar'}
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
