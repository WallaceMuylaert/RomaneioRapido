import { useAuth } from '@/context/AuthContext'
import { AlertTriangle, CreditCard, X } from 'lucide-react'
import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'

export default function PaymentFailedBanner() {
    const { user } = useAuth()
    const { handleManageSubscription } = useSubscription()
    const [dismissed, setDismissed] = useState(false)

    // Só mostra se o usuário tem assinatura com pagamento pendente (past_due)
    const subscriptionStatus = user?.subscription_status || 'active'
    if (!user || subscriptionStatus !== 'past_due' || dismissed) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-500">
            <div className="bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 text-card px-4 py-3 shadow-lg shadow-amber-500/25">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-card/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4.5 h-4.5 text-card" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold leading-tight">
                                Pagamento Pendente
                            </p>
                            <p className="text-xs font-medium text-amber-100 leading-tight hidden sm:block">
                                Seu último pagamento não foi processado. Atualize seu método de pagamento para evitar a suspensão do serviço.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleManageSubscription}
                            className="h-8 px-4 bg-card text-warning rounded-lg text-xs font-bold hover:bg-warning/10 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Atualizar Pagamento</span>
                            <span className="sm:hidden">Pagar</span>
                        </button>
                        <button
                            onClick={() => setDismissed(true)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-card/60 hover:text-card hover:bg-card/10 transition-all"
                            title="Fechar aviso"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
