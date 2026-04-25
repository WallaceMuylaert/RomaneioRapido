import { PartyPopper, Check, X, Sparkles, Loader2, AlertCircle, Clock, LifeBuoy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getWhatsAppLink } from '../constants/contacts'

export type PaymentStatus = 'processing' | 'success' | 'failed' | 'pending'

interface PaymentStatusModalProps {
    status: PaymentStatus
    isOpen: boolean
    onClose: () => void
    planName?: string
    error?: string
}

export default function PaymentStatusModal({ status, isOpen, onClose, planName = 'Premium', error }: PaymentStatusModalProps) {
    const [animate, setAnimate] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setAnimate(true), 100)
            return () => clearTimeout(timer)
        } else {
            setAnimate(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const isProcessing = status === 'processing'
    const isSuccess = status === 'success'
    const isFailed = status === 'failed'
    const isPending = status === 'pending'

    return (
        <div
            className="fixed inset-0 z-[1000] overflow-y-auto no-scrollbar"
            onClick={isProcessing ? undefined : onClose}
        >
            <div className={`fixed inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-700 ${animate ? 'opacity-100' : 'opacity-0'}`} />

            <div className={`fixed inset-0 pointer-events-none transition-opacity duration-1000 ${animate ? 'opacity-100' : 'opacity-0'}`}>
                {isSuccess && [...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-ping"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][i % 5],
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    />
                ))}
            </div>

            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 sm:py-12 pointer-events-none">
                <div
                    onClick={(e) => e.stopPropagation()}
                    className={`relative w-full max-w-lg bg-white rounded-3xl sm:rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-700 transform pointer-events-auto ${animate ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-10 opacity-0'}`}
                >

                    {/* Top Section */}
                    <div className={`p-8 sm:p-12 text-center relative transition-colors duration-500 ${isSuccess ? 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600' :
                            isFailed ? 'bg-gradient-to-br from-red-400 via-red-500 to-rose-600' :
                                isProcessing ? 'bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600' :
                                    'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600'
                        }`}>
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white rounded-full blur-3xl" />
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/30 rounded-full blur-3xl" />
                        </div>

                        {!isProcessing && (
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}

                        <div className="relative inline-block">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-xl rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 mx-auto shadow-2xl">
                                {isProcessing && <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-spin" />}
                                {isSuccess && <PartyPopper className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-bounce-slow" />}
                                {isFailed && <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-white" />}
                                {isPending && <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-white" />}
                            </div>
                            {isSuccess && <Sparkles className="absolute -top-2 -right-2 w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-pulse" />}
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
                            {isProcessing ? 'Processando...' :
                                isSuccess ? 'Parabéns! 🎉' :
                                    isFailed ? 'Ops! Algo deu errado' :
                                        'Quase lá...'}
                        </h2>
                        <p className="text-white/90 font-bold text-base sm:text-lg max-w-xs mx-auto">
                            {isProcessing ? 'Estamos verificando seu pagamento.' :
                                isSuccess ? 'Sua assinatura foi confirmada!' :
                                    isFailed ? 'Não conseguimos processar o pagamento.' :
                                        'Seu pagamento ainda está sendo processado.'}
                        </p>
                    </div>

                    {/* Content Section */}
                    <div className="p-8 sm:p-10 text-center">
                        <div className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed mb-8 px-2">
                            {isProcessing ? (
                                <p>Por favor, não feche esta página. Isso levará apenas alguns segundos enquanto atualizamos sua conta.</p>
                            ) : isSuccess ? (
                                <p>Estamos muito felizes em ter você no plano <span className="text-brand-600 font-extrabold">{planName}</span>! Agora você tem acesso total aos recursos exclusivos.</p>
                            ) : isFailed ? (
                                <p className="text-red-500 font-bold">{error || 'Houve um problema ao processar seu pagamento. Por favor, tente novamente ou entre em contato com o suporte.'}</p>
                            ) : (
                                <p>Seu pagamento foi iniciado, mas ainda não foi confirmado pelo seu banco. Assim que recebermos a confirmação, seu plano será atualizado automaticamente.</p>
                            )}
                        </div>

                        {isSuccess && (
                            <div className="bg-emerald-50 rounded-2xl sm:rounded-[1.5rem] p-4 sm:p-6 mb-8 flex items-center gap-4 text-left border border-emerald-100">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
                                    <Check className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-900 text-sm sm:text-base">Tudo Pronto!</h4>
                                    <p className="text-emerald-700/70 text-xs sm:text-sm font-medium">Seu acesso já foi liberado e está pronto para uso.</p>
                                </div>
                            </div>
                        )}

                        {!isProcessing && (
                            <button
                                onClick={() => {
                                    if (isSuccess) {
                                        navigate('/onboarding')
                                    }
                                    onClose()
                                }}
                                className={`w-full h-12 sm:h-14 rounded-xl sm:rounded-[1.25rem] font-black text-base sm:text-lg transition-all shadow-xl active:scale-[0.98] ${isFailed ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-100' :
                                        'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200'
                                    }`}
                            >
                                {isSuccess ? 'Vamos lá! 🚀' : isFailed ? 'Tentar Novamente' : 'Fechar'}
                            </button>
                        )}

                        {isFailed && (
                            <a
                                href={getWhatsAppLink('Olá! Tive um problema com o pagamento da minha assinatura no Romaneio Rápido.')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors"
                            >
                                <LifeBuoy className="w-4 h-4" />
                                Falar com Suporte no WhatsApp
                            </a>
                        )}

                        <p className="text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest">RomaneioRapido</p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
