import { useState, useEffect } from 'react'
import { 
    X, 
    ShieldCheck, 
    CheckCircle2, 
    XCircle, 
    Key, 
    UserCog,
    ChevronRight,
    Lock,
    Calendar
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface User {
    id: number
    email: string
    full_name: string
    plan_id: string
    is_active: boolean
    is_admin: boolean
    is_unlimited: boolean
    trial_days?: number
    created_at?: string
}

interface UserManagementModalProps {
    isOpen: boolean
    onClose: () => void
    user: User
    onUpdate: (field: any, value: any) => Promise<void>
    updating: boolean
}

export default function UserManagementModal({ 
    isOpen, 
    onClose, 
    user, 
    onUpdate,
    updating 
}: UserManagementModalProps) {
    const [newPassword, setNewPassword] = useState('')
    const [isResettingPassword, setIsResettingPassword] = useState(false)
    
    // Local state for buffered changes
    const [localPlan, setLocalPlan] = useState(user.plan_id)
    const [localIsActive, setLocalIsActive] = useState(user.is_active)
    const [localIsAdmin, setLocalIsAdmin] = useState(user.is_admin)
    const [localIsUnlimited, setLocalIsUnlimited] = useState(user.is_unlimited)
    const [localTrialDays, setLocalTrialDays] = useState(user.trial_days || 7)

    // Reset local state when modal opens with a different user
    useEffect(() => {
        setLocalPlan(user.plan_id)
        setLocalIsActive(user.is_active)
        setLocalIsAdmin(user.is_admin)
        setLocalIsUnlimited(user.is_unlimited)
        setLocalTrialDays(user.trial_days || 7)
        setIsResettingPassword(false)
        setNewPassword('')
    }, [user.id, isOpen])

    if (!isOpen) return null

    const plans = ['trial', 'basic', 'plus', 'pro', 'enterprise', 'api', 'unlimited']
    const planTranslations: Record<string, string> = {
        trial: 'Teste Grátis',
        basic: 'Básico',
        plus: 'Plus',
        pro: 'Profissional',
        api: 'Acesso API',
        enterprise: 'Corporativo',
        unlimited: 'Ilimitado'
    }

    const hasChanges = 
        localPlan !== user.plan_id || 
        localIsActive !== user.is_active || 
        localIsAdmin !== user.is_admin || 
        localIsUnlimited !== user.is_unlimited ||
        localTrialDays !== (user.trial_days || 7)

    const handleSaveChanges = async () => {
        if (!hasChanges) return
        
        // Em um cenário ideal, o backend aceitaria um objeto completo. 
        // Aqui vamos disparar as atualizações necessárias.
        if (localPlan !== user.plan_id) await onUpdate('plan_id', localPlan)
        if (localIsActive !== user.is_active) await onUpdate('is_active', localIsActive)
        if (localIsAdmin !== user.is_admin) await onUpdate('is_admin', localIsAdmin)
        if (localIsUnlimited !== user.is_unlimited) await onUpdate('is_unlimited', localIsUnlimited)
        if (localTrialDays !== (user.trial_days || 7)) await onUpdate('trial_days', localTrialDays)
        
        toast.success('Alterações salvas com sucesso!')
    }

    const calculateExpiryDate = () => {
        if (!user.created_at) return null
        const created = new Date(user.created_at)
        created.setDate(created.getDate() + localTrialDays)
        return created
    }

    const expiryDate = calculateExpiryDate()

    const handlePasswordReset = async () => {
        if (newPassword.length < 8) {
            toast.error('A senha deve ter pelo menos 8 caracteres')
            return
        }
        await onUpdate('password', newPassword)
        setNewPassword('')
        setIsResettingPassword(false)
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
                    onClick={onClose} 
                />
                
                <div className="bg-white rounded-[2.5rem] w-full max-w-2xl relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* HEADER */}
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                            <UserCog className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Gerenciar Usuário</h3>
                            <p className="text-xs font-semibold text-slate-400">ID: #{user.id} • {user.email}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* USER INFO SECTION */}
                    <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-16 h-16 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-slate-500 font-black text-xl">
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-900">{user.full_name}</h4>
                            <p className="text-sm font-medium text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* PLAN SECTION */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plano da Conta</label>
                            <div className="grid grid-cols-1 gap-2">
                                {plans.map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => setLocalPlan(p)}
                                        disabled={updating}
                                        className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border ${
                                            localPlan === p 
                                            ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/20' 
                                            : 'bg-white text-slate-600 border-slate-100 hover:border-brand-200'
                                        }`}
                                    >
                                        <span className="uppercase">{planTranslations[p] || p}</span>
                                        {localPlan === p && <CheckCircle2 className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* STATUS TOGGLE */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Acesso</label>
                                <button
                                    onClick={() => setLocalIsActive(!localIsActive)}
                                    disabled={updating}
                                    className={`w-full p-4 rounded-3xl border transition-all flex items-center gap-4 ${
                                        localIsActive 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                        : 'bg-red-50 border-red-100 text-red-600'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${localIsActive ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {localIsActive ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black uppercase text-current">
                                            {localIsActive ? 'Conta Ativa' : 'Conta Bloqueada'}
                                        </p>
                                        <p className="text-[10px] font-medium opacity-70">
                                            {localIsActive ? 'O usuário possui acesso normal.' : 'O usuário não consegue fazer login.'}
                                        </p>
                                    </div>
                                </button>
                            </div>

                            {/* TRIAL DAYS SETTING */}
                            {localPlan === 'trial' && (
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dias de Teste (Trial)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="number"
                                                min="1"
                                                max="365"
                                                value={localTrialDays}
                                                onChange={(e) => setLocalTrialDays(parseInt(e.target.value) || 0)}
                                                disabled={updating}
                                                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all font-mono"
                                            />
                                        </div>
                                        <div className="px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-brand-100">
                                            Dias
                                        </div>
                                    </div>
                                    <p className="text-[9px] font-semibold text-slate-500 ml-1">
                                        {expiryDate && (
                                            <>Vencimento previsto: <span className="font-black text-brand-600">{expiryDate.toLocaleDateString('pt-BR')}</span></>
                                        )}
                                    </p>
                                </div>
                            )}

                            {/* ADMIN TOGGLE */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permissões Admin</label>
                                <button
                                    onClick={() => setLocalIsAdmin(!localIsAdmin)}
                                    disabled={updating}
                                    className={`w-full p-4 rounded-3xl border transition-all flex items-center gap-4 ${
                                        localIsAdmin 
                                        ? 'bg-orange-50 border-orange-100 text-orange-700' 
                                        : 'bg-slate-50 border-slate-100 text-slate-500'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${localIsAdmin ? 'bg-orange-500 text-white' : 'bg-slate-300 text-white'}`}>
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black uppercase text-current">
                                            {localIsAdmin ? 'Super Admin' : 'Usuário Comum'}
                                        </p>
                                        <p className="text-[10px] font-medium opacity-70">
                                            {localIsAdmin ? 'Acesso total às configurações.' : 'Acesso limitado ao painel operacional.'}
                                        </p>
                                    </div>
                                </button>
                            </div>
                            
                            {/* UNLIMITED TOGGLE */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acesso Ilimitado (VIP)</label>
                                <button
                                    onClick={() => setLocalIsUnlimited(!localIsUnlimited)}
                                    disabled={updating}
                                    className={`w-full p-4 rounded-3xl border transition-all flex items-center gap-4 ${
                                        localIsUnlimited 
                                        ? 'bg-blue-50 border-blue-100 text-blue-700' 
                                        : 'bg-slate-50 border-slate-100 text-slate-500'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${localIsUnlimited ? 'bg-blue-500 text-white' : 'bg-slate-300 text-white'}`}>
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black uppercase text-current">
                                            {localIsUnlimited ? 'Acesso Ilimitado' : 'Acesso Padrão'}
                                        </p>
                                        <p className="text-[10px] font-medium opacity-70">
                                            {localIsUnlimited ? 'Ignora bloqueios de Trial e Pagamento.' : 'Sujeito a regras de assinatura padrão.'}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PASSWORD SECTION */}
                    <div className="pt-4">
                        <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative">
                            <div className="relative z-10 flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                            <Key className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-wider">Segurança da Conta</p>
                                            <p className="text-[10px] text-slate-400 font-medium italic">Redefinir senha de acesso</p>
                                        </div>
                                    </div>
                                    {!isResettingPassword && (
                                        <button 
                                            onClick={() => setIsResettingPassword(true)}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-all rounded-xl text-xs font-bold flex items-center gap-2"
                                        >
                                            Resetar Senha
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {isResettingPassword && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                            <input 
                                                type="password"
                                                placeholder="Nova senha (mínimo 8 caracteres)"
                                                value={newPassword}
                                                autoComplete="new-password"
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:bg-white/10 transition-all"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => {
                                                    setIsResettingPassword(false)
                                                    setNewPassword('')
                                                }}
                                                className="flex-1 h-10 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handlePasswordReset}
                                                disabled={newPassword.length < 8 || updating}
                                                className="flex-1 h-10 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition-all"
                                            >
                                                {updating ? 'Salvando...' : 'Confirmar Nova Senha'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-brand-500/10 blur-3xl rounded-full" />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-8 py-6 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-6 h-12 rounded-2xl font-bold text-slate-500 hover:text-slate-800 transition-all"
                    >
                        Descartar
                    </button>

                    <button
                        onClick={handleSaveChanges}
                        disabled={!hasChanges || updating}
                        className={`px-10 h-12 rounded-2xl font-bold flex items-center gap-3 transition-all ${
                            hasChanges && !updating
                            ? 'bg-brand-600 text-white shadow-xl shadow-brand-500/20 hover:scale-[1.02] active:scale-95' 
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {updating ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        {updating ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    </div>
    )
}
