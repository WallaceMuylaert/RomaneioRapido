import { useEffect, useState } from 'react'
import { CheckCircle2, Mail, Send, Shield, X } from 'lucide-react'

interface BulkEmailPayload {
    subject: string
    message: string
    recipient_scope: 'all' | 'active' | 'inactive'
    plan_id?: string
    exclude_admins: boolean
}

interface BulkEmailModalProps {
    isOpen: boolean
    onClose: () => void
    onSend: (payload: BulkEmailPayload) => Promise<void>
    sending: boolean
    totalCount: number
    plans: string[]
    planTranslations: Record<string, string>
}

export default function BulkEmailModal({
    isOpen,
    onClose,
    onSend,
    sending,
    totalCount,
    plans,
    planTranslations
}: BulkEmailModalProps) {
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [recipientScope, setRecipientScope] = useState<'all' | 'active' | 'inactive'>('active')
    const [planId, setPlanId] = useState('all')
    const [excludeAdmins, setExcludeAdmins] = useState(true)

    useEffect(() => {
        if (isOpen) {
            setSubject('')
            setMessage('')
            setRecipientScope('active')
            setPlanId('all')
            setExcludeAdmins(true)
        }
    }, [isOpen])

    if (!isOpen) return null

    const canSend = subject.trim().length >= 3 && message.trim().length >= 10 && !sending

    const handleSubmit = async () => {
        if (!canSend) return

        await onSend({
            subject: subject.trim(),
            message: message.trim(),
            recipient_scope: recipientScope,
            plan_id: planId === 'all' ? undefined : planId,
            exclude_admins: excludeAdmins
        })
    }

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                <div
                    className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />

                <div className="bg-card rounded-[2.5rem] w-full max-w-3xl relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-border overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600">
                                <Mail className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-text-primary tracking-tight">Enviar E-mail em Massa</h3>
                                <p className="text-xs font-semibold text-text-secondary">Base atual: {totalCount} usuários cadastrados</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-border/50 text-text-secondary transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-7">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                { value: 'active', label: 'Ativos' },
                                { value: 'all', label: 'Todos' },
                                { value: 'inactive', label: 'Bloqueados' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setRecipientScope(option.value as BulkEmailPayload['recipient_scope'])}
                                    disabled={sending}
                                    className={`h-12 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                                        recipientScope === option.value
                                            ? 'bg-brand-600 text-card border-brand-600 shadow-lg shadow-primary/20'
                                            : 'bg-card text-text-secondary border-border hover:border-brand-200'
                                    }`}
                                >
                                    {recipientScope === option.value && <CheckCircle2 className="w-4 h-4" />}
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Plano</label>
                                <select
                                    value={planId}
                                    onChange={(e) => setPlanId(e.target.value)}
                                    disabled={sending}
                                    className="w-full h-12 bg-background border border-border rounded-2xl px-4 text-sm font-bold text-text-secondary focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all"
                                >
                                    <option value="all">Todos os planos</option>
                                    {plans.map((plan) => (
                                        <option key={plan} value={plan}>
                                            {planTranslations[plan] || plan}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={() => setExcludeAdmins(!excludeAdmins)}
                                disabled={sending}
                                className={`h-12 px-5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                    excludeAdmins
                                        ? 'bg-orange-50 text-orange-700 border-orange-100'
                                        : 'bg-background text-text-secondary border-border'
                                }`}
                            >
                                <Shield className="w-4 h-4" />
                                {excludeAdmins ? 'Sem admins' : 'Com admins'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Assunto</label>
                            <input
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                maxLength={120}
                                disabled={sending}
                                placeholder="Assunto do e-mail"
                                className="w-full h-12 bg-background border border-border rounded-2xl px-4 text-sm font-bold text-text-primary focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Mensagem</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                maxLength={10000}
                                disabled={sending}
                                placeholder="Escreva a mensagem para os usuários"
                                className="w-full min-h-56 bg-background border border-border rounded-3xl p-5 text-sm font-semibold text-text-secondary leading-7 resize-y focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 transition-all"
                            />
                        </div>
                    </div>

                    <div className="px-8 py-6 bg-background flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border">
                        <button
                            onClick={onClose}
                            disabled={sending}
                            className="px-6 h-12 rounded-2xl font-bold text-text-secondary hover:text-text-primary transition-all"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={!canSend}
                            className={`px-8 h-12 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                                canSend
                                    ? 'bg-brand-600 text-card shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95'
                                    : 'bg-border text-text-secondary cursor-not-allowed'
                            }`}
                        >
                            {sending ? (
                                <div className="w-5 h-5 border-2 border-card/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {sending ? 'Enviando...' : 'Enviar Agora'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
