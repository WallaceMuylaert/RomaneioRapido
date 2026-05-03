import { useState } from 'react'
import api from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'
import { translateError } from '@/utils/errors'

export function useSubscription() {
    const { user } = useAuth()
    const [isSubscribing, setIsSubscribing] = useState<string | null>(null)

    const handleSubscribe = async (planId: string) => {
        if (planId === user?.plan_id) return
        setIsSubscribing(planId)
        try {
            // Planos pagos: redirecionar para Stripe Checkout
            if (['basic', 'plus', 'pro', 'api'].includes(planId)) {
                const res = await api.post('/plans/checkout', { plan_id: planId })
                window.location.href = res.data.checkout_url
                return
            }
            // Fallback para planos sem pagamento
            await api.patch('/plans/subscribe', { plan_id: planId })
            toast.success('Plano atualizado com sucesso!')
            setTimeout(() => {
                window.location.reload()
            }, 1000)
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao atualizar assinatura')
        } finally {
            setIsSubscribing(null)
        }
    }

    const handleManageSubscription = async () => {
        try {
            const res = await api.post('/plans/portal')
            window.location.href = res.data.portal_url
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao abrir portal de assinatura')
        }
    }

    return {
        isSubscribing,
        handleSubscribe,
        handleManageSubscription
    }
}
