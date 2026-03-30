import { useState, type FormEvent, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
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

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.', { id: 'auth-toast' })
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
            const errorMsg = (err.response?.data?.detail || 'Erro ao redefinir senha. O link pode ter expirado.').replace('Value error, ', '')
            toast.error(errorMsg, { id: 'auth-toast' })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50/30 p-6">
            {isLoading && <LoadingOverlay message="Redefinindo senha..." />}

            <div className="w-full max-w-sm animate-slide-up">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-500/20">
                        <Package className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-3">
                        Nova Senha.
                    </h2>
                    <p className="text-slate-500 font-semibold italic text-sm">
                        Crie uma senha forte e segura para sua conta.
                    </p>
                </div>

                {!isSuccess ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full h-14 pl-12 pr-14 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-600 p-2 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirme a Nova Senha</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    required
                                    className="w-full h-14 pl-12 pr-14 bg-white border-2 border-slate-100 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-sm shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-600 p-2 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
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
                                    <span>Atualizando Senha...</span>
                                </>
                            ) : (
                                <span>Redefinir Senha</span>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-300">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                        <div>
                            <p className="text-emerald-900 font-black text-lg">Sucesso!</p>
                            <p className="text-emerald-700 font-bold text-sm mt-1">
                                Sua senha foi redefinida com sucesso. Redirecionando para o login...
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
