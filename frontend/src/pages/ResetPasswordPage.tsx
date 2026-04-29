import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'

export default function ResetPasswordPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [isLoading, setIsLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    useEffect(() => {
        if (!token) {
            toast.error('Token de recuperação ausente.', { id: 'auth-toast' })
            navigate('/login')
        }
    }, [token, navigate])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.', { id: 'auth-toast' })
            return
        }

        if (password.length < 8) {
            toast.error('A senha deve ter pelo menos 8 caracteres.', { id: 'auth-toast' })
            return
        }

        setIsLoading(true)

        try {
            await api.post('/auth/reset-password', {
                token,
                new_password: password
            })
            setIsSuccess(true)
            toast.success('Senha redefinida com sucesso!', { id: 'auth-toast' })
            setTimeout(() => navigate('/login'), 3000)
        } catch (err: any) {
            const detail = err.response?.data?.detail
            let errorMsg = 'Erro ao redefinir senha. O link pode ter expirado.'
            
            if (Array.isArray(detail)) {
                errorMsg = detail[0]?.msg || errorMsg
            } else if (typeof detail === 'string') {
                errorMsg = detail
            }
            
            errorMsg = errorMsg.replace(/Value error, /i, '')
            toast.error(errorMsg, { id: 'auth-toast' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-slate-900 overflow-hidden font-sans p-6 selection:bg-brand-500/30">
            {isLoading && <LoadingOverlay message="Gravando nova senha..." />}

            {/* Glowing Blobs */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-600/30 rounded-full blur-[120px] -ml-40 -mt-40 animate-pulse duration-10000" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] -mr-40 -mb-40 animate-pulse duration-7000" />

            <div className="w-full max-w-md relative z-10 bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-brand-900/50 animate-slide-up border border-white/10">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-tr from-brand-600 to-sky-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/30 transform hover:-rotate-6 transition-all">
                        <Lock className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">
                        Último passo.
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">
                        Defina uma senha ultra-segura para seu império.
                    </p>
                </div>

                {!isSuccess ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha Invicto</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400 group-focus-within/input:text-brand-500 transition-colors" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    autoComplete="new-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full h-14 pl-12 pr-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all font-bold text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 p-2 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirme a Senha</label>
                            <div className="relative group/input2">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400 group-focus-within/input2:text-brand-500 transition-colors" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    autoComplete="new-password"
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full h-14 pl-12 pr-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 focus:bg-white transition-all font-bold text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 p-2 transition-colors focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 bg-gradient-to-r from-brand-600 to-sky-600 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm tracking-tight mt-4"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Aplicando Blindagem...</span>
                                </>
                            ) : (
                                <span>Blindar Conta</span>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-100/50 p-8 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-500 shadow-inner">
                        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto drop-shadow-md" />
                        <div>
                            <p className="text-emerald-900 font-black text-xl tracking-tight mb-1">Missão Cumprida!</p>
                            <p className="text-emerald-700 font-medium text-sm">
                                Cofre fechado e senha atualizada. Estamos te levando de volta pra o login...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
