import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { translateError } from '../utils/errors'
import { useSubscription } from '../hooks/useSubscription'
import PlansGrid from '../components/PlansGrid'
import {
    Camera,
    Loader2,
    User as UserIcon,
    Crown,
    ShieldCheck,
    CreditCard,
    Check,
    AlertCircle,
    Store,
    Phone,
    Mail,
    Key,
    Zap,
    Eye,
    EyeOff,
    Copy,
    Plus,
    Trash2,
    KeyRound,
    ArrowUpRight,
    ShieldAlert,
    CheckCircle2
} from 'lucide-react'
import ImageCropper from '../components/ImageCropper'
import { PLANS } from '../constants/plans'
import LoadingOverlay from '../components/LoadingOverlay'
import { maskPhone } from '../utils/masks'
import PaymentStatusModal from '../components/PaymentStatusModal'
import type { PaymentStatus } from '../components/PaymentStatusModal'

interface ApiKeyItem {
    id: number
    name: string
    key_prefix: string
    is_active: boolean
    created_at: string | null
    last_used_at: string | null
    expires_at: string | null
}

const calculatePasswordStrength = (password: string): { score: number, color: string, label: string } => {
    if (!password) return { score: 0, color: 'bg-slate-200', label: '' }

    let score = 0
    if (password.length > 5) score += 1
    if (password.length >= 8) score += 1
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score < 2) return { score: 25, color: 'bg-red-500', label: 'Fraca' }
    if (score < 4) return { score: 60, color: 'bg-amber-400', label: 'Razoável' }
    return { score: 100, color: 'bg-emerald-500', label: 'Forte' }
}

export default function ProfilePage() {
    const { user, refreshUser } = useAuth()
    const [activeTab, setActiveTab] = useState<'general' | 'subscription' | 'security'>('general')

    const [saving, setSaving] = useState(false)
    const [isLoadingUsage, setIsLoadingUsage] = useState(false)
    const { isSubscribing, handleSubscribe, handleManageSubscription } = useSubscription()
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [usage, setUsage] = useState({
        products: { used: 0, limit: 10 },
        categories: { used: 0, limit: 2 },
        plan_id: user?.plan_id || 'trial'
    })

    const [form, setForm] = useState({
        full_name: '',
        email: '',
        phone: '',
        store_name: '',
        photo_base64: '',
        pix_key: '',
        password: '',
        confirm_password: ''
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // API Keys state
    const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([])
    const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(false)
    const [isCreatingApiKey, setIsCreatingApiKey] = useState(false)
    const [apiKeyName, setApiKeyName] = useState('')
    const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
    const [keyCopied, setKeyCopied] = useState(false)
    const [revokingKeyId, setRevokingKeyId] = useState<number | null>(null)
    const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null)

    // Estados para verificação de pagamento
    const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('processing')
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentError, setPaymentError] = useState<string | undefined>(undefined)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const tabParam = params.get('tab')
        if (tabParam === 'subscription') {
            setActiveTab('subscription')
        } else if (user?.plan_id === 'trial' && user?.trial_expired && !user?.is_admin) {
            setActiveTab('subscription')
        }

        if (user) {
            setForm(prev => ({
                ...prev,
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                store_name: user.store_name || '',
                photo_base64: user.photo_base64 || '',
                pix_key: user.pix_key || ''
            }))
            setImagePreview(user.photo_base64 || null)
        }
    }, [user])

    // Tratar retorno do Stripe Checkout com Polling Realista
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const sessionId = params.get('session_id')
        const checkoutStatus = params.get('checkout')

        if (sessionId) {
            setShowPaymentModal(true)
            setPaymentStatus('processing')
            setActiveTab('subscription')

            let isMounted = true
            const maxAttempts = 15 // ~30 segundos de polling
            let pollTimer: any
            let attempts = 0

            const checkStatus = async () => {
                if (!isMounted) return
                attempts++
                try {
                    const response = await api.get(`/plans/session-status/${sessionId}`)
                    const { status, payment_status, plan_updated } = response.data

                    if (status === 'complete' && payment_status === 'paid' && plan_updated) {
                        setPaymentStatus('success')
                        // Atualizar contexto do usuário e dados de uso
                        await refreshUser()
                        await fetchUsageData()
                        // Limpar parâmetros da URL após sucesso
                        window.history.replaceState({}, '', window.location.pathname)
                    } else if (status === 'expired' || payment_status === 'failed') {
                        setPaymentStatus('failed')
                        setPaymentError('O pagamento expirou ou foi recusado pela sua instituição financeira.')
                    } else if (attempts >= maxAttempts) {
                        setPaymentStatus('pending')
                    } else {
                        // Continuar tentando se ainda estiver processando ou o webhook não bateu
                        pollTimer = setTimeout(checkStatus, 2000)
                    }
                } catch (err) {
                    if (!isMounted) return
                    console.error("Erro ao verificar status do pagamento:", err)
                    if (attempts >= maxAttempts) {
                        setPaymentStatus('failed')
                        setPaymentError('Não conseguimos verificar o status do seu pagamento. Verifique seu e-mail ou entre em contato.')
                    } else {
                        // Tentar novamente mesmo em caso de erro
                        pollTimer = setTimeout(checkStatus, 2000)
                    }
                }
            }

            checkStatus()
            return () => {
                isMounted = false
                clearTimeout(pollTimer)
            }
        } else if (checkoutStatus === 'cancel') {
            toast('Checkout cancelado.', { icon: '⚠️' })
            setActiveTab('subscription')
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, []) // Rodar apenas uma vez na montagem, o polling é controlado internamente por setTimeout

    const fetchUsageData = async () => {
        setIsLoadingUsage(true)
        try {
            const res = await api.get('/plans/usage')
            setUsage(res.data)
        } catch (err) {
            console.error('Erro ao buscar uso dos planos:', err)
        } finally {
            setIsLoadingUsage(false)
        }
    }

    const canUseApiKeys = ['plus', 'pro', 'enterprise'].includes(user?.plan_id || 'trial')

    const fetchApiKeys = async () => {
        if (!canUseApiKeys) return
        setIsLoadingApiKeys(true)
        try {
            const res = await api.get('/api-keys')
            setApiKeys(res.data)
        } catch (err) {
            console.error('Erro ao buscar API Keys:', err)
        } finally {
            setIsLoadingApiKeys(false)
        }
    }

    const handleCreateApiKey = async () => {
        if (!apiKeyName.trim()) {
            toast.error('Informe um nome para a chave.')
            return
        }
        setIsCreatingApiKey(true)
        try {
            const res = await api.post('/api-keys', { name: apiKeyName.trim() })
            setNewlyCreatedKey(res.data.full_key)
            setApiKeyName('')
            setKeyCopied(false)
            fetchApiKeys()
            toast.success('Chave de API criada com sucesso!')
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao criar chave de API')
        } finally {
            setIsCreatingApiKey(false)
        }
    }

    const handleRevokeApiKey = async (keyId: number) => {
        setRevokingKeyId(keyId)
        try {
            await api.delete(`/api-keys/${keyId}`)
            toast.success('Chave revogada com sucesso.')
            setConfirmRevokeId(null)
            fetchApiKeys()
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao revogar chave')
        } finally {
            setRevokingKeyId(null)
        }
    }

    const handleCopyKey = async (key: string) => {
        try {
            await navigator.clipboard.writeText(key)
            setKeyCopied(true)
            toast.success('Chave copiada!')
            setTimeout(() => setKeyCopied(false), 3000)
        } catch {
            toast.error('Falha ao copiar.')
        }
    }

    useEffect(() => {
        fetchUsageData()
    }, [])

    useEffect(() => {
        if (activeTab === 'subscription') {
            fetchUsageData()
        }
        if (activeTab === 'security' && canUseApiKeys) {
            fetchApiKeys()
        }
    }, [activeTab])

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const reader = new FileReader()
            reader.onload = () => {
                setCropImageSrc(reader.result as string)
            }
            reader.readAsDataURL(file)
            e.target.value = ''
        }
    }

    const handleCropComplete = (blob: Blob) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64String = reader.result as string
            setForm(prev => ({ ...prev, photo_base64: base64String }))
            setImagePreview(base64String)
        }
        reader.readAsDataURL(blob)
        setCropImageSrc(null)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (activeTab === 'security' && form.password && form.password !== form.confirm_password) {
            toast.error('As senhas não coincidem.')
            return
        }

        setSaving(true)
        try {
            const payload: any = {
                full_name: form.full_name,
                email: form.email,
                phone: form.phone || null,
                store_name: form.store_name || null,
                photo_base64: form.photo_base64 || null,
                pix_key: form.pix_key || null
            }

            if (form.password) {
                payload.password = form.password
            }

            await api.put('/auth/me', payload)
            toast.success('Perfil atualizado com sucesso!')

            setTimeout(() => {
                window.location.reload()
            }, 1000)

        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao atualizar perfil')
        } finally {
            setSaving(false)
        }
    }


    const calculateProgress = (used: number, limit: number) => {
        if (limit >= 999999) return 0
        return Math.min((used / limit) * 100, 100)
    }

    const currentPlan = PLANS.find(p => p.id === (user?.plan_id || usage.plan_id)) || PLANS[0]
    const effectivePlanId = user?.plan_id === 'enterprise' ? 'pro' : (user?.plan_id || 'trial');

    return (
        <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 relative">

            {/* Subtle Brand Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-64 bg-brand-100/40 rounded-[100%] blur-[100px] pointer-events-none -z-10" />

            <div className="pt-8 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Configurações</h1>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">Gerencie suas preferências com facilidade</p>
                </div>

                {/* Refined Segmented Control - Mobile Responsive */}
                <div className="flex bg-white/80 backdrop-blur shadow-sm border border-slate-200/60 p-1 rounded-xl sm:rounded-2xl w-full sm:w-fit overflow-x-auto no-scrollbar">
                    <div className="flex min-w-full sm:min-w-0">
                        {(['general', 'subscription', 'security'] as const).map((tab) => {
                            const isLocked = user?.plan_id === 'trial' && user?.trial_expired && !user?.is_admin
                            const isDisabled = isLocked && tab !== 'subscription'

                            return (
                                <button
                                    key={tab}
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && setActiveTab(tab)}
                                    className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-[10px] text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-now-row flex-1 sm:flex-initial ${activeTab === tab
                                        ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100/50'
                                        : isDisabled
                                            ? 'text-slate-300 cursor-not-allowed opacity-50'
                                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab === 'general' && <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                    {tab === 'subscription' && <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                    {tab === 'security' && <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                    <span>{tab === 'general' ? 'Geral' : tab === 'subscription' ? 'Assinatura' : 'Segurança'}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-3xl sm:rounded-[2.5rem] overflow-hidden">
                <div className="p-6 sm:p-12">
                    {activeTab === 'general' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Profile Header (Avatar + Name) */}
                            <div className="flex flex-col sm:flex-row items-center gap-8 mb-12 relative group/header">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-32 h-32 rounded-[2rem] bg-brand-50 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-xl shadow-brand-500/10 transition-transform duration-500 group-hover:scale-[1.02]">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Avatar" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <span className="text-5xl font-black text-brand-200">
                                                {user?.full_name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-brand-900/40 backdrop-blur-[2px] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-white">
                                        <Camera className="w-8 h-8 mb-1 animate-bounce-slow" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
                                    </div>
                                </div>

                                <div className="text-center sm:text-left">
                                    <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{user?.full_name}</h2>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold mt-2">
                                        <Zap className="w-3 h-3 fill-current" />
                                        Membro Ativo
                                    </div>
                                </div>

                                <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                                    <div className="sm:col-span-2 group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Nome Completo</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <UserIcon className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                required
                                                value={form.full_name}
                                                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                                className="w-full h-12 pl-12 pr-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2 group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Nome da Loja</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Store className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                value={form.store_name}
                                                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                                                className="w-full h-12 pl-12 pr-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">E-mail</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                required
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                className="w-full h-12 pl-12 pr-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Telefone</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                value={form.phone}
                                                onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                                                className="w-full h-12 pl-12 pr-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                                placeholder="(00) 00000-0000"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-2 group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Chave Pìx (Para Recebimento)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Zap className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                value={form.pix_key}
                                                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                                                className="w-full h-12 pl-12 pr-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                                placeholder="CPF, E-mail, Celular ou Chave Aleatória"
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 ml-1">Esta chave será impressa no PDF do romaneio para facilitar o pagamento via QR Code.</p>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="h-12 px-8 font-bold bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'subscription' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative max-w-4xl mx-auto">
                            {isLoadingUsage && <LoadingOverlay message="Caregando métricas..." />}

                            <div className="flex flex-col gap-10 mb-8">
                                {/* Current Plan Status - Prominent Top Card */}
                                <div className="w-full">
                                    <div className="bg-white border border-brand-100 rounded-[2.5rem] p-8 sm:p-10 shadow-xl shadow-brand-100/50 relative overflow-hidden group/plan">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-[80px] -mr-20 -mt-20 transition-transform duration-1000 group-hover/plan:scale-125" />

                                        <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-12 items-center justify-between">
                                            <div className="flex-1 text-center md:text-left space-y-4">
                                                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center md:justify-start">
                                                    <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">{currentPlan.name}</h4>
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100/50 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-sm">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Ativo
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-sm font-medium max-w-sm mx-auto md:mx-0 leading-relaxed">{currentPlan.description}</p>
                                                
                                                {/* Gerenciar Assinatura Button */}
                                                {user?.plan_id && !['trial'].includes(user.plan_id) && (
                                                    <div className="pt-2 flex justify-center md:justify-start">
                                                        <button
                                                            onClick={handleManageSubscription}
                                                            className="h-11 px-5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-brand-600 transition-all shadow-lg shadow-slate-200 flex items-center gap-2 active:scale-95 group/btn"
                                                        >
                                                            <CreditCard className="w-4 h-4 text-slate-400 group-hover/btn:text-white transition-colors" />
                                                            Gerenciar Assinatura
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Progress Meters */}
                                            <div className="w-full md:w-80 lg:w-96 flex-shrink-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4 lg:gap-6 bg-slate-50/80 p-5 lg:p-8 rounded-[2rem] border border-slate-100/50 shadow-inner">
                                                <div className="group/progress">
                                                    <div className="flex justify-between items-end mb-2 px-0.5">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produtos</span>
                                                        <span className="text-xs lg:text-sm font-black text-slate-700">
                                                            <span className="text-brand-600 text-lg lg:text-xl">{usage.products.used}</span>
                                                            <span className="text-slate-300 mx-1 font-light">/</span>
                                                            {usage.products.limit >= 999999 ? '∞' : usage.products.limit}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-1000 shadow-sm relative"
                                                            style={{ width: `${calculateProgress(usage.products.used, usage.products.limit)}%` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="group/progress">
                                                    <div className="flex justify-between items-end mb-2 px-0.5">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categorias</span>
                                                        <span className="text-xs lg:text-sm font-black text-slate-700">
                                                            <span className="text-brand-600 text-lg lg:text-xl">{usage.categories.used}</span>
                                                            <span className="text-slate-300 mx-1 font-light">/</span>
                                                            {usage.categories.limit >= 999999 ? '∞' : usage.categories.limit}
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-200/50 rounded-full overflow-hidden p-0.5 shadow-inner">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-brand-500 to-indigo-600 rounded-full transition-all duration-1000 shadow-sm relative"
                                                            style={{ width: `${calculateProgress(usage.categories.used, usage.categories.limit)}%` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botão Gerenciar Assinatura (Stripe Portal) */}
                                    {user?.plan_id && !['trial'].includes(user.plan_id) && (
                                        <div className="mt-6 flex justify-center md:justify-start">
                                            <button
                                                onClick={handleManageSubscription}
                                                className="h-12 px-6 font-bold bg-slate-100 text-slate-700 rounded-2xl hover:bg-brand-600 hover:text-white transition-all shadow-sm flex items-center gap-2 active:scale-95"
                                            >
                                                <CreditCard className="w-5 h-5" />
                                                Gerenciar Assinatura
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Upgrades List */}
                                <div className="w-full mt-4">
                                    <div className="mb-8 text-center md:text-left pl-2">
                                        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Evolua seu plano</h3>
                                        <p className="text-slate-500 font-medium mt-1 text-sm">Escolha a melhor opção para o tamanho do seu negócio.</p>
                                    </div>

                                    <PlansGrid
                                        effectivePlanId={effectivePlanId}
                                        isSubscribing={isSubscribing}
                                        handleSubscribe={handleSubscribe}
                                    />
                                    <div className="mt-10 flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6 bg-brand-50 border border-brand-100/50 rounded-[2rem] text-sm font-medium text-brand-800 shadow-sm max-w-3xl mx-auto text-center sm:text-left transition-all hover:bg-white hover:shadow-md">
                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                                            <AlertCircle className="w-6 h-6 text-brand-500" />
                                        </div>
                                        <p className="leading-relaxed mt-1">Nossos planos são flexíveis. Você pode alterar seu plano a qualquer momento sem burocracia, e o ajuste no valor ocorre automaticamente na próxima fatura.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

                            <div className="mb-10 max-w-2xl">
                                <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Segurança da Conta</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">Atualize sua senha para manter o acesso restrito e protegido.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
                                <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200/60 mb-8 flex items-start gap-4">
                                    <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-900 mb-1">Dica de Segurança</p>
                                        <p className="text-xs font-medium text-amber-700/80 leading-relaxed">
                                            Recomendamos usar uma combinação de letras maiúsculas, minúsculas, números e símbolos para criar uma senha forte e inquebrável.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Nova Senha</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={form.password}
                                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                className="w-full h-12 pl-12 pr-12 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        {/* Password Strength Indicator */}
                                        {form.password && (
                                            <div className="mt-3 px-1 animate-in fade-in zoom-in-95 duration-300">
                                                <div className="flex justify-between items-center mb-1.5">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Força da Senha</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${calculatePasswordStrength(form.password).color.replace('bg-', 'text-')}`}>
                                                        {calculatePasswordStrength(form.password).label}
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${calculatePasswordStrength(form.password).color}`}
                                                        style={{ width: `${calculatePasswordStrength(form.password).score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="group/input">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Confirme a Nova Senha</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                                <Key className="h-5 w-5 text-slate-300 group-focus-within/input:text-brand-500 transition-colors" />
                                            </div>
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={form.confirm_password}
                                                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                                className="w-full h-12 pl-12 pr-12 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white hover:bg-slate-50 transition-all duration-300 shadow-sm"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-start">
                                    <button
                                        type="submit"
                                        disabled={saving || !form.password}
                                        className="h-12 px-8 font-bold bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-slate-300 flex items-center gap-2 active:scale-95 disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                        Atualizar Senha
                                    </button>
                                </div>
                            </form>

                            {/* ═══════ API KEYS SECTION ═══════ */}
                            <div className="mt-16 pt-12 border-t-2 border-slate-100/80">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center">
                                        <KeyRound className="w-5 h-5 text-brand-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Chaves de API</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-0.5">Integre com sistemas externos usando suas chaves pessoais.</p>
                                    </div>
                                </div>

                                {!canUseApiKeys ? (
                                    /* Banner de upgrade para planos inferiores */
                                    <div className="mt-8 p-8 bg-gradient-to-br from-brand-50 via-white to-brand-50/30 rounded-[2rem] border border-brand-100/60 shadow-lg shadow-brand-100/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-40 h-40 bg-brand-100 rounded-full blur-[60px] -mr-10 -mt-10 opacity-40" />
                                        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                                            <div className="w-16 h-16 rounded-[1.5rem] bg-brand-100 flex items-center justify-center shrink-0 shadow-sm">
                                                <ShieldAlert className="w-8 h-8 text-brand-600" />
                                            </div>
                                            <div className="flex-1 text-center sm:text-left">
                                                <h4 className="text-lg font-extrabold text-slate-800 mb-1">Recurso exclusivo do plano Plus</h4>
                                                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                                    Gere chaves de API para integrar o RomaneioRapido com outros sistemas. Faça upgrade para desbloquear esse recurso.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('subscription')}
                                                className="h-12 px-6 font-bold bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 shrink-0"
                                            >
                                                <ArrowUpRight className="w-5 h-5" />
                                                Ver Planos
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-8 space-y-8">
                                        {/* Modal de chave recém-criada */}
                                        {newlyCreatedKey && (
                                            <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-200 shadow-lg shadow-emerald-100/50 animate-in fade-in zoom-in-95 duration-300">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                                    <h4 className="text-lg font-extrabold text-emerald-900">Chave criada com sucesso!</h4>
                                                </div>
                                                <div className="p-4 bg-white rounded-2xl border border-emerald-100 shadow-inner mb-4">
                                                    <code className="text-sm font-mono font-bold text-slate-700 break-all select-all">{newlyCreatedKey}</code>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                                    <button
                                                        onClick={() => handleCopyKey(newlyCreatedKey)}
                                                        className={`h-10 px-5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${keyCopied
                                                            ? 'bg-emerald-600 text-white'
                                                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                            }`}
                                                    >
                                                        {keyCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        {keyCopied ? 'Copiada!' : 'Copiar Chave'}
                                                    </button>
                                                    <button
                                                        onClick={() => setNewlyCreatedKey(null)}
                                                        className="h-10 px-5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                                    >
                                                        Fechar
                                                    </button>
                                                </div>
                                                <p className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl mt-4 flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    Guarde esta chave em local seguro. Ela não será exibida novamente.
                                                </p>
                                            </div>
                                        )}

                                        {/* Formulário de criação */}
                                        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Nova Chave</span>
                                                <span className="text-xs font-bold text-slate-400">
                                                    {apiKeys.filter(k => k.is_active).length} / {currentPlan.limit_api_keys} ativas
                                                </span>
                                            </div>
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <input
                                                    value={apiKeyName}
                                                    onChange={e => setApiKeyName(e.target.value)}
                                                    placeholder="Ex: Integração ERP, App Mobile..."
                                                    maxLength={100}
                                                    className="flex-1 h-12 px-5 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all shadow-sm"
                                                />
                                                <button
                                                    onClick={handleCreateApiKey}
                                                    disabled={isCreatingApiKey || !apiKeyName.trim()}
                                                    className="h-12 px-6 font-bold bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-60 shrink-0"
                                                >
                                                    {isCreatingApiKey ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                                    Gerar Chave
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lista de chaves */}
                                        {isLoadingApiKeys ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                            </div>
                                        ) : apiKeys.length === 0 ? (
                                            <div className="text-center py-12">
                                                <KeyRound className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                                <p className="text-sm font-bold text-slate-400">Nenhuma chave de API criada.</p>
                                                <p className="text-xs font-medium text-slate-300 mt-1">Crie sua primeira chave para começar a integrar.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {apiKeys.map(k => (
                                                    <div
                                                        key={k.id}
                                                        className={`group p-5 rounded-2xl border transition-all duration-300 ${k.is_active
                                                            ? 'bg-white border-slate-200/80 hover:border-brand-200 hover:shadow-md'
                                                            : 'bg-slate-50/50 border-slate-100 opacity-60'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-4 min-w-0">
                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.is_active ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-400'
                                                                    }`}>
                                                                    <Key className="w-5 h-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-bold text-slate-800 truncate">{k.name}</span>
                                                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${k.is_active
                                                                            ? 'bg-emerald-50 text-emerald-600'
                                                                            : 'bg-red-50 text-red-500'
                                                                            }`}>
                                                                            {k.is_active ? 'Ativa' : 'Revogada'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-1">
                                                                        <code className="text-xs font-mono font-bold text-slate-400">{k.key_prefix}•••••••</code>
                                                                        {k.created_at && (
                                                                            <span className="text-[11px] font-medium text-slate-300">
                                                                                Criada em {new Date(k.created_at).toLocaleDateString('pt-BR')}
                                                                            </span>
                                                                        )}
                                                                        {k.last_used_at && (
                                                                            <span className="text-[11px] font-medium text-slate-300">
                                                                                · Último uso {new Date(k.last_used_at).toLocaleDateString('pt-BR')}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {k.is_active && (
                                                                <div className="shrink-0">
                                                                    {confirmRevokeId === k.id ? (
                                                                        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                                            <span className="text-xs font-bold text-red-600">Confirmar?</span>
                                                                            <button
                                                                                onClick={() => handleRevokeApiKey(k.id)}
                                                                                disabled={revokingKeyId === k.id}
                                                                                className="h-8 px-3 rounded-lg text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all flex items-center gap-1 disabled:opacity-60"
                                                                            >
                                                                                {revokingKeyId === k.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                                                Sim
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setConfirmRevokeId(null)}
                                                                                className="h-8 px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                                                                            >
                                                                                Não
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setConfirmRevokeId(k.id)}
                                                                            className="h-9 px-4 rounded-xl text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                            Revogar
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Info de rate limit */}
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <ShieldCheck className="w-5 h-5 text-slate-400 shrink-0" />
                                            <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                                Cada chave é autenticada via header <code className="px-1.5 py-0.5 bg-white rounded-md border border-slate-200 text-[11px] font-mono font-bold text-slate-600">X-API-Key</code>.
                                                Seu plano permite <strong>{currentPlan.api_rate_limit.replace('/minute', ' requisições/minuto')}</strong>.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {cropImageSrc && (
                <ImageCropper
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCropImageSrc(null)}
                />
            )}

            <PaymentStatusModal
                isOpen={showPaymentModal}
                status={paymentStatus}
                error={paymentError}
                onClose={() => {
                    setShowPaymentModal(false)
                    if (paymentStatus === 'success') {
                        fetchUsageData()
                    }
                }}
                planName={PLANS.find(p => p.id === (user?.plan_id || usage.plan_id))?.name}
            />
        </div>
    )
}
