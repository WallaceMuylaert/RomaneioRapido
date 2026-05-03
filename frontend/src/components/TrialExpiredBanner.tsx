import { useAuth } from '@/context/AuthContext'
import { PLANS } from '@/constants/plans'
import { Crown, ArrowUpRight, Clock, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TrialExpiredBanner() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const isSubscriptionPage = window.location.pathname === '/perfil' && window.location.search.includes('tab=subscription')

    if (!user || user.plan_id !== 'trial' || !user.trial_expired || isSubscriptionPage) return null

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <div className="relative bg-card rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                {/* Gradient header */}
                <div className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 px-6 sm:px-8 py-8 sm:py-10 text-center shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_70%)]" />
                    <div className="relative">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-card/20 backdrop-blur-sm rounded-[1.25rem] flex items-center justify-center mb-4 shadow-lg shadow-brand-700/30">
                            <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-card" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-card tracking-tight leading-tight">
                            Seu teste gratuito terminou
                        </h2>
                        <p className="text-brand-100 font-medium mt-2 text-xs sm:text-sm leading-relaxed max-w-[240px] sm:max-w-xs mx-auto">
                            Seus 7 dias de teste acabaram. Escolha um plano para continuar usando todas as funcionalidades.
                        </p>
                    </div>
                </div>

                {/* Plans quick view - Scrollable on very small heights */}
                <div className="p-4 sm:p-6 space-y-3 overflow-y-auto no-scrollbar">
                    {PLANS.filter(p => !p.hidden).map(plan => (
                        <button
                            key={plan.id}
                            onClick={() => navigate('/perfil?tab=subscription')}
                            className={`w-full flex flex-row items-center justify-between p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 text-left group hover:shadow-md ${plan.highlight
                                    ? 'border-brand-500 bg-brand-50/50 hover:border-brand-600'
                                    : 'border-border bg-card hover:border-border'
                                }`}
                        >
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${plan.highlight ? 'bg-brand-100 text-brand-600' : 'bg-border/50 text-text-secondary'
                                    }`}>
                                    <Crown className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                                </div>
                                <div className="min-w-0 pr-2">
                                    <p className="text-sm font-bold text-text-primary truncate">{plan.name}</p>
                                    <p className="text-[10px] sm:text-xs font-medium text-text-secondary truncate hidden sm:block">{plan.description}</p>
                                    {/* Mobile price row internal for compact feel if needed, but flex-row justify-between usually wins */}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                <span className="text-base sm:text-lg font-extrabold text-text-primary whitespace-nowrap">{plan.price}</span>
                                {plan.period && <span className="text-[10px] sm:text-xs font-bold text-text-secondary uppercase tracking-tighter sm:tracking-normal">{plan.period.replace('/mês', '')}</span>}
                                <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 h-4 text-text-secondary/60 group-hover:text-brand-500 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="px-6 pb-6 pt-2 shrink-0">
                    <p className="text-[10px] sm:text-[11px] font-bold text-error text-center leading-relaxed flex items-center justify-center gap-1.5 uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" /> Acesso bloqueado até a regularização.
                    </p>
                </div>
            </div>
        </div>
    )
}
