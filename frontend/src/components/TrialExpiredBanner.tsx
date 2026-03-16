import { useAuth } from '../context/AuthContext'
import { PLANS } from '../constants/plans'
import { Crown, ArrowUpRight, Clock, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TrialExpiredBanner() {
    const { user } = useAuth()
    const navigate = useNavigate()

    if (!user || user.plan_id !== 'trial' || !user.trial_expired) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Gradient header */}
                <div className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-8 py-10 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                    <div className="relative">
                        <div className="w-16 h-16 mx-auto bg-white/20 backdrop-blur-sm rounded-[1.25rem] flex items-center justify-center mb-4 shadow-lg shadow-brand-700/30">
                            <Clock className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-white tracking-tight">
                            Seu teste gratuito terminou
                        </h2>
                        <p className="text-brand-100 font-medium mt-2 text-sm leading-relaxed max-w-xs mx-auto">
                            Seus 7 dias de teste acabaram. Escolha um plano para continuar usando todas as funcionalidades.
                        </p>
                    </div>
                </div>

                {/* Plans quick view */}
                <div className="p-6 space-y-3">
                    {PLANS.filter(p => !p.hidden).map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => navigate('/perfil?tab=subscription')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left group hover:shadow-md ${plan.highlight
                                    ? 'border-brand-500 bg-brand-50/50 hover:border-brand-600'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.highlight ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    <Crown className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">{plan.name}</p>
                                    <p className="text-xs font-medium text-slate-400">{plan.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-extrabold text-slate-800">{plan.price}</span>
                                {plan.period && <span className="text-xs font-bold text-slate-400">{plan.period}</span>}
                                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="px-6 pb-6 pt-2">
                    <p className="text-[11px] font-bold text-red-500 text-center leading-relaxed flex items-center justify-center gap-1.5 uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" /> Acesso bloqueado até a regularização.
                    </p>
                </div>
            </div>
        </div>
    )
}
