import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Mail, ArrowLeft, Loader2, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'

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
        <div className="min-h-screen flex items-center justify-center bg-slate-50/30 p-6">
            {isLoading && <LoadingOverlay message="Processando solicitação..." />}

            <div className="w-full max-w-sm animate-slide-up">
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all text-xs font-bold mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Voltar para o login</span>
                </button>

                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">
                        Recupere sua senha.
                    </h2>
                    <p className="text-slate-500 font-semibold italic text-sm">
                        {isSent
                            ? 'Verifique sua caixa de entrada para continuar.'
                            : 'Insira seu e-mail para receber um link de recuperação.'}
                    </p>
                </div>

                {!isSent ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço de Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="exemplo@email.com"
                                    required
                                    className="w-full h-14 pl-12 pr-6 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-sm shadow-sm"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-brand-600 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4 text-sm tracking-tight"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Processando...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>Enviar Link de Recuperação</span>
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl text-center">
                        <p className="text-emerald-800 font-bold text-sm">
                            Um e-mail foi enviado para <strong>{email}</strong> com as instruções para redefinir sua senha.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-6 text-brand-600 font-black text-xs uppercase tracking-widest hover:underline"
                        >
                            Voltar para o Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
