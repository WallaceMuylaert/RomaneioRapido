import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingOverlay from '../components/LoadingOverlay'
import { Package, Eye, EyeOff, Loader2, ArrowLeft, Zap, BarChart3, ScanBarcode, User, Mail, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../services/api'
import AlertModal from '../components/AlertModal'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()

    // Estados Compartilhados
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    // Estado de Alternância (Login vs Cadastro)
    const [isRegistering, setIsRegistering] = useState(false)

    // Estados Exclusivos de Cadastro
    const [fullName, setFullName] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    // Estado de Erros por Campo
    const [errors, setErrors] = useState<{
        fullName?: string,
        email?: string,
        password?: string,
        confirmPassword?: string,
        general?: string
    }>({})

    // Estado do Modal de Alerta
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean,
        title: string,
        message: string,
        type: 'error' | 'warning' | 'success' | 'info'
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    })

    const validateForm = () => {
        const newErrors: typeof errors = {}

        if (isRegistering) {
            if (!fullName.trim()) newErrors.fullName = 'Nome é obrigatório.'
            if (password !== confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem.'
        }

        if (!email.trim()) {
            newErrors.email = 'Email é obrigatório.'
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Email inválido.'
        }

        if (!password) {
            newErrors.password = 'Senha é obrigatória.'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setErrors({})

        if (!validateForm()) return

        setIsLoading(true)
        const normalizedEmail = email.trim().toLowerCase()

        try {
            if (isRegistering) {
                // Fluxo de Cadastro
                await api.post('/users/', {
                    full_name: fullName,
                    email: normalizedEmail,
                    password: password
                })
                toast.success('Conta criada com sucesso!', { id: 'auth-toast' })

                // Login automático após cadastro
                await login(normalizedEmail, password)
                navigate('/dashboard')
            } else {
                // Fluxo de Login
                await login(normalizedEmail, password)
                navigate('/dashboard')
            }
        } catch (err: any) {
            const status = err.response?.status
            const detail = err.response?.data?.detail

            if (status === 429) {
                setAlertConfig({
                    isOpen: true,
                    title: 'Muitas Tentativas',
                    message: 'Detectamos muitas solicitações em um curto período. Por favor, aguarde alguns minutos antes de tentar novamente para sua segurança.',
                    type: 'warning'
                })
                return
            }

            if (status === 401) {
                // Por segurança, destacamos ambos os campos quando as credenciais falham
                setErrors({
                    email: !isRegistering ? 'Email ou senha incorretos' : undefined,
                    password: !isRegistering ? ' ' : undefined // Espaço para manter o layout/cor
                })
                toast.error('Credenciais inválidas.', { id: 'auth-toast' })
                return
            }

            if (detail === "O email já está em uso.") {
                setErrors({ email: detail })
                toast.error(detail, { id: 'auth-toast' })
            } else if (Array.isArray(detail)) {
                const serverErrors: any = {}
                detail.forEach((e: any) => {
                    const field = e.loc[e.loc.length - 1]
                    let msg = e.msg
                    if (msg.toLowerCase().includes('value error,')) {
                        msg = msg.replace(/value error, /i, '')
                    }
                    serverErrors[field] = msg
                })
                setErrors(serverErrors)
                toast.error('Verifique os campos destacados.', { id: 'auth-toast' })
            } else {
                let errorMessage = typeof detail === 'string' ? detail : (isRegistering ? 'Erro ao criar conta.' : 'Email ou senha incorretos.')

                // Sanitização de erros do Pydantic/Backend
                if (errorMessage.toLowerCase().includes('value error,')) {
                    errorMessage = errorMessage.replace(/value error, /i, '')
                }

                setErrors({ general: errorMessage })
                toast.error(errorMessage, { id: 'auth-toast' })
            }
        } finally {
            setIsLoading(false)
        }
    }

    const toggleMode = () => {
        setIsRegistering(!isRegistering)
        setFullName('')
        setConfirmPassword('')
        setErrors({})
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50/30 font-sans selection:bg-brand-500/30">
            {isLoading && <LoadingOverlay message={isRegistering ? "Criando sua conta..." : "Autenticando..."} />}

            {/* Seção Esquerda - Marketing (Oculta em Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative flex-col justify-between p-20 overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600/20 rounded-full blur-[120px] -mr-64 -mt-64" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] -ml-64 -mb-64" />

                {/* Botão Voltar */}
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 text-slate-400 hover:text-white transition-all text-sm font-bold w-fit group relative z-10 mb-16"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </div>
                    <span>Voltar para o início</span>
                </button>

                {/* Conteúdo Central */}
                <div className="max-w-md relative z-10">
                    <h1 className="text-5xl font-black text-white leading-[1.1] mb-8 tracking-tighter">
                        Controle seu estoque com <span className="text-brand-400">velocidade</span> máxima.
                    </h1>
                    <p className="text-slate-400 text-lg mb-12 font-medium leading-relaxed">
                        Gerencie movimentações, organize categorias e acompanhe relatórios em tempo real com elegância e eficiência.
                    </p>

                    <div className="space-y-8">
                        {[
                            { icon: ScanBarcode, text: 'Leitura rápida de código de barras', color: 'text-brand-400' },
                            { icon: Zap, text: 'Interface ultra-rápida sem delay', color: 'text-amber-400' },
                            { icon: BarChart3, text: 'Dashboards visuais e inteligentes', color: 'text-emerald-400' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-5 text-slate-300">
                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                                    <item.icon className={`w-6 h-6 ${item.color}`} />
                                </div>
                                <span className="text-base font-bold tracking-tight">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rodapé Visual */}
                <div className="flex items-center gap-6 text-slate-500 text-xs font-bold uppercase tracking-widest relative z-10 mt-auto pt-10">
                    <span>© 2026 Romaneio Rápido</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-600" />
                    <span>Segurança Bancária</span>
                </div>
            </div>

            {/* Seção Direita - Formulário */}
            <div className="flex-1 flex flex-col bg-white overflow-y-auto">
                {/* Mobile Header (Apenas em Mobile) */}
                <div className="lg:hidden p-6 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
                        <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Package className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-black text-slate-900 tracking-tight">Romaneio<span className="text-brand-600">Rapido</span></span>
                    </div>
                    <button onClick={() => navigate('/')} className="text-xs font-black text-brand-600 uppercase tracking-wider">
                        Voltar
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50/30">
                    <div className="w-full max-w-sm animate-slide-up">
                        {/* Boas vindas */}
                        <div className="mb-12 text-center lg:text-left">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">
                                {isRegistering ? 'Crie sua conta.' : 'Bem-vindo.'}
                            </h2>
                            <p className="text-slate-500 font-semibold italic text-sm">
                                {isRegistering
                                    ? 'Cadastre-se para começar a gerenciar seu estoque.'
                                    : 'Insira suas credenciais para acessar a plataforma.'}
                            </p>
                        </div>

                        {/* Formulário */}
                        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
                            {isRegistering && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <User className={`h-4 w-4 ${errors.fullName ? 'text-red-400' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            id="fullName"
                                            name="name"
                                            type="text"
                                            value={fullName}
                                            autoComplete="name"
                                            onChange={(e) => {
                                                setFullName(e.target.value)
                                                if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }))
                                            }}
                                            placeholder="João da Silva"
                                            required
                                            className={`w-full h-14 pl-12 pr-6 bg-white border-2 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 transition-all font-bold text-sm shadow-sm ${errors.fullName
                                                ? 'border-red-500 focus:ring-red-500/5 focus:border-red-500'
                                                : 'border-slate-100 focus:ring-brand-500/5 focus:border-brand-500'}`}
                                        />
                                    </div>
                                    {errors.fullName && <p className="text-[10px] font-black text-red-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">{errors.fullName}</p>}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço de Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <Mail className={`h-4 w-4 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} />
                                    </div>
                                    <input
                                        id="email"
                                        name="username"
                                        type="email"
                                        value={email}
                                        autoComplete="username"
                                        onChange={(e) => {
                                            setEmail(e.target.value)
                                            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                                        }}
                                        placeholder="exemplo@email.com"
                                        required
                                        className={`w-full h-14 pl-12 pr-6 bg-white border-2 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 transition-all font-bold text-sm shadow-sm ${errors.email
                                            ? 'border-red-500 focus:ring-red-500/5 focus:border-red-500'
                                            : 'border-slate-100 focus:ring-brand-500/5 focus:border-brand-500'}`}
                                    />
                                </div>
                                {errors.email && <p className="text-[10px] font-black text-red-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">{errors.email}</p>}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
                                    {!isRegistering && (
                                        <button
                                            type="button"
                                            onClick={() => navigate('/forgot-password')}
                                            className="text-[11px] font-black text-brand-600 hover:text-brand-700 tracking-tight"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                        <Lock className={`h-4 w-4 ${errors.password ? 'text-red-400' : 'text-slate-400'}`} />
                                    </div>
                                    <input
                                        key={isRegistering ? 'register-password' : 'login-password'}
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                        onChange={(e) => {
                                            setPassword(e.target.value)
                                            if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                                        }}
                                        placeholder="••••••••••••"
                                        required
                                        className={`w-full h-14 pl-12 pr-14 bg-white border-2 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 transition-all font-bold text-sm shadow-sm ${errors.password
                                            ? 'border-red-500 focus:ring-red-500/5 focus:border-red-500'
                                            : 'border-slate-100 focus:ring-brand-500/5 focus:border-brand-500'}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-600 p-2 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-[10px] font-black text-red-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">{errors.password}</p>}
                            </div>

                            {isRegistering && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirme a Senha</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <Lock className={`h-4 w-4 ${errors.confirmPassword ? 'text-red-400' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            autoComplete="new-password"
                                            onChange={(e) => {
                                                setConfirmPassword(e.target.value)
                                                if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: undefined }))
                                            }}
                                            placeholder="••••••••••••"
                                            required
                                            className={`w-full h-14 pl-12 pr-14 bg-white border-2 rounded-2xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 transition-all font-bold text-sm shadow-sm ${errors.confirmPassword
                                                ? 'border-red-500 focus:ring-red-500/5 focus:border-red-500'
                                                : 'border-slate-100 focus:ring-brand-500/5 focus:border-brand-500'}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-brand-600 p-2 transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && <p className="text-[10px] font-black text-red-500 ml-1 mt-1 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">{errors.confirmPassword}</p>}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-16 bg-brand-600 text-white font-black rounded-2xl shadow-xl shadow-brand-500/20 hover:bg-brand-700 hover:shadow-brand-500/30 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4 text-sm tracking-tight"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span>{isRegistering ? 'Criando Conta...' : 'Autenticando...'}</span>
                                    </>
                                ) : (
                                    isRegistering ? 'Criar Minha Conta' : 'Entrar no Sistema'
                                )}
                            </button>
                        </form>

                        <div className="mt-16 text-center">
                            <p className="text-xs text-slate-400 font-bold tracking-tight">
                                {isRegistering ? 'Já tem uma conta?' : 'Não tem uma conta ainda?'}
                                <button
                                    onClick={toggleMode}
                                    className="text-brand-600 font-black hover:underline px-1 ml-1"
                                >
                                    {isRegistering ? 'Faça login' : 'Cadastre-se agora'}
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Alerta Customizado */}
            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    )
}
