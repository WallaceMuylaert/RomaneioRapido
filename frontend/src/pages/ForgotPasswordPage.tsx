import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Mail, ArrowLeft, Loader2, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '@/services/api'

export default function ForgotPasswordPage() {
    const navigate = useNavigate()
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [isSent, setIsSent] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await api.post('/auth/forgot-password', { email })
            setIsSent(true)
            toast.success('Se o email existir, enviaremos as instruções.', { id: 'auth-toast' })
        } catch (err: any) {
            toast.error('Erro ao processar sua solicitação.', { id: 'auth-toast' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-text-primary overflow-hidden font-sans p-6 selection:bg-brand-500/30">
            {/* Glowing Blobs */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/30 rounded-full blur-[120px] -mr-40 -mt-40 animate-pulse duration-10000" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] -ml-40 -mb-40 animate-pulse duration-7000" />

            <div className="w-full max-w-md relative z-10 bg-card rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-brand-900/50 animate-slide-up border border-card/10">
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-text-secondary hover:text-brand-600 transition-all text-xs font-bold mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Voltar para o login</span>
                </button>

                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/30 transform hover:scale-105 transition-all">
                        <Package className="w-8 h-8 text-card" />
                    </div>
                    <h2 className="text-3xl font-black text-text-primary tracking-tighter mb-3">
                        Recupere o acesso.
                    </h2>
                    <p className="text-text-secondary font-medium text-sm">
                        {isSent
                            ? 'Verifique sua caixa de entrada para continuar.'
                            : 'Insira seu e-mail para receber um link mágico de recuperação.'}
                    </p>
                </div>

                {!isSent ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest ml-1">Endereço de Email</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-text-secondary group-focus-within:text-brand-500 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="exemplo@email.com"
                                    required
                                    className="w-full h-14 pl-12 pr-6 bg-background border-2 border-border rounded-2xl text-text-primary placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-card transition-all font-bold text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-gradient-to-r from-brand-600 to-indigo-600 text-card font-black rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-tight"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Enviando link...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Enviar Link Rápido</span>
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-100/50 p-8 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-500 shadow-inner">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Mail className="w-6 h-6 text-emerald-600" />
                        </div>
                        <p className="text-emerald-800 font-medium text-sm leading-relaxed">
                            Um e-mail mágico acabou de pousar em <strong>{email}</strong> com as instruções seguras.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-6 text-emerald-700 font-black text-xs uppercase tracking-widest hover:text-brand-600 transition-colors"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
