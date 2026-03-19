import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    PartyPopper, 
    Layers, 
    Boxes, 
    FileText, 
    ChevronRight, 
    ChevronLeft, 
    CheckCircle2,
    Zap,
    Sparkles,
    LayoutDashboard,
    Plus,
    TrendingUp,
    User,
    ArrowRight,
    X
} from 'lucide-react'

// --- Mini Components for Visual Examples ---

const WelcomeVisual = () => (
    <div className="relative w-full h-full flex items-center justify-center animate-fade-in transition-all">
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 sm:w-64 h-48 sm:h-64 bg-brand-500/10 rounded-full animate-ping opacity-30" />
            <div className="absolute w-36 sm:w-48 h-36 sm:h-48 bg-brand-500/20 rounded-full animate-ping opacity-20" style={{ animationDelay: '500ms' }} />
        </div>
        <div className="relative z-10 bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl shadow-brand-200 border border-brand-100 flex flex-col items-center animate-scale-pulse">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="text-center font-black text-slate-900 text-lg sm:text-xl">Plano Ativado</div>
            <div className="text-slate-500 font-bold text-xs sm:text-sm">Acesso Total Liberado</div>
        </div>
    </div>
)

const CategoriesVisual = () => (
    <div className="w-full max-w-sm space-y-3 sm:space-y-4 animate-slide-up transition-all">
        <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suas Categorias</div>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm">
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
        </div>
        {[
            { name: 'Moda Masculina', icons: <User className="w-4 h-4" />, count: 12, color: 'text-blue-600', bg: 'bg-blue-50' },
            { name: 'Acessórios Premium', icons: <Sparkles className="w-4 h-4" />, count: 45, color: 'text-amber-600', bg: 'bg-amber-50' },
            { name: 'Coleção Inverno', icons: <TrendingUp className="w-4 h-4" />, count: 8, color: 'text-indigo-600', bg: 'bg-indigo-50' }
        ].map((cat, i) => (
            <div key={i} className="bg-white/80 backdrop-blur p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm hover:translate-x-2 transition-transform cursor-pointer group" style={{ animationDelay: `${i * 150}ms` }}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl ${cat.bg} ${cat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        {cat.icons}
                    </div>
                    <div>
                        <div className="text-xs sm:text-sm font-bold text-slate-800">{cat.name}</div>
                        <div className="text-[9px] sm:text-[10px] font-medium text-slate-400">{cat.count} Itens</div>
                    </div>
                </div>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300" />
            </div>
        ))}
    </div>
)

const ProductsVisual = () => (
    <div className="w-full max-w-sm animate-scale-pulse transition-all">
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200 border border-slate-100 group">
            <div className="h-32 sm:h-48 bg-slate-50 relative overflow-hidden flex items-center justify-center">
                <img 
                    src="/onboarding-preview.png" 
                    alt="Produto Exemplo" 
                    className="w-full h-full object-cover mix-blend-multiply opacity-90 transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 px-2 sm:px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[8px] sm:text-[10px] font-black text-emerald-600 shadow-sm border border-white uppercase tracking-widest">Estoque OK</div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
            </div>
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <div>
                        <h4 className="text-[10px] sm:text-sm font-black text-slate-900 uppercase">Camiseta Oversized Blue</h4>
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">Moda Masculina</p>
                    </div>
                    <div className="text-sm sm:text-lg font-black text-brand-600">R$ 89,90</div>
                </div>
                <div className="h-1 w-full bg-slate-100 rounded-full mt-3 sm:mt-4 flex items-center gap-1 overflow-hidden">
                    <div className="h-full w-[85%] bg-brand-500 rounded-full" />
                </div>
                <div className="flex justify-between items-center mt-2">
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saldo Disponível</span>
                    <span className="text-xs font-black text-slate-800">124 unid.</span>
                </div>
            </div>
        </div>
    </div>
)

const RomaneioVisual = () => (
    <div className="w-full max-w-sm space-y-3 sm:space-y-4 animate-slide-up transition-all">
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-slate-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-widest">Romaneio #2024</div>
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-200/50 flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 rotate-[-45deg]" />
                </div>
            </div>
            <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                {[
                    { item: 'Over. Blue', q: 2, p: 'R$ 179,80' },
                    { item: 'Short. Black', q: 1, p: 'R$ 65,00' }
                ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <div className="text-[10px] sm:text-xs font-bold text-slate-700">{item.q}x {item.item}</div>
                        <div className="text-[10px] sm:text-xs font-black text-indigo-600">{item.p}</div>
                    </div>
                ))}
                <div className="pt-2 flex justify-between items-center">
                    <div className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-widest">Total</div>
                    <div className="text-base sm:text-lg font-black text-indigo-700">R$ 244,80</div>
                </div>
            </div>
            <div className="p-3 sm:p-4 bg-indigo-50 flex items-center justify-center gap-4">
                 <div className="text-[9px] sm:text-[10px] font-black text-indigo-600 flex items-center gap-2 tracking-widest">
                    <FileText className="w-3 h-3" /> PDF PRONTO
                 </div>
            </div>
        </div>
    </div>
)

// --- Main Page Component ---

interface Step {
    title: string
    description: string
    icon: React.ReactNode
    color: string
    bg: string
    details: string[]
    visual: React.ReactNode
}

const STEPS: Step[] = [
    {
        title: 'Bem-vindo ao Próximo Nível!',
        description: 'Sua assinatura foi confirmada. Agora você tem acesso total a todas as ferramentas para escalar seu negócio.',
        icon: <PartyPopper className="w-12 h-12" />,
        color: 'text-brand-600',
        bg: 'bg-brand-50',
        details: [
            'Limite de produtos expandido',
            'Gestão de categorias ilimitada',
            'Relatórios detallhados da sua evolução',
            'Suporte prioritário via WhatsApp'
        ],
        visual: <WelcomeVisual />
    },
    {
        title: 'Organize com Categorias',
        description: 'O primeiro passo para um estoque eficiente é a organização. Crie categorias para agrupar seus produtos.',
        icon: <Layers className="w-12 h-12" />,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        details: [
            'Agrupe por tipo, coleção ou estação',
            'Facilite a busca ao gerar pedidos',
            'Visualize o saldo total por setor',
            'Sincronização instantânea'
        ],
        visual: <CategoriesVisual />
    },
    {
        title: 'Cadastre seus Produtos',
        description: 'Adicione seus itens com fotos, preços e estoque inicial. Tudo muito rápido e simples.',
        icon: <Boxes className="w-12 h-12" />,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        details: [
            'Fotos integradas para fácil identificação',
            'Gestão de preços de venda e atacado',
            'Alertas de estoque baixo automáticos',
            'Controle por SKU ou Referência'
        ],
        visual: <ProductsVisual />
    },
    {
        title: 'Domine o Romaneio',
        description: 'Crie folhas de saída profissionais em segundos. Envie para seus clientes via WhatsApp.',
        icon: <FileText className="w-12 h-12" />,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        details: [
            'Seleção ultrarrápida no carrinho',
            'Geração de PDF com sua marca',
            'Envio direto com um clique',
            'Histórico vitalício de saídas'
        ],
        visual: <RomaneioVisual />
    }
]

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0)
    const navigate = useNavigate()
    const step = STEPS[currentStep]

    const next = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(s => s + 1)
        } else {
            navigate('/dashboard')
        }
    }

    const prev = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1)
        }
    }

    const skip = () => {
        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans no-scrollbar">
            
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-brand-200 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-200 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border-[60px] border-white/40 rounded-full" />
            </div>

            {/* Header / Logo / Skip */}
            <header className="relative z-20 pt-8 sm:pt-12 px-6 sm:px-12 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-brand-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Zap className="w-4 h-4 sm:w-6 sm:h-6 text-white fill-current" />
                    </div>
                    <span className="text-base sm:text-xl font-black text-slate-900 tracking-tighter uppercase">Romaneio<span className="text-brand-600">Rapido</span></span>
                </div>
                
                <button 
                    onClick={skip}
                    className="group px-4 py-2 sm:px-6 sm:py-2.5 bg-white/60 hover:bg-white text-slate-500 hover:text-slate-800 rounded-full border border-white/80 shadow-sm transition-all flex items-center gap-2 active:scale-95"
                >
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Pular Guia</span>
                    <X className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
                </button>
            </header>

            <main className="flex-1 relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-12 py-8 sm:py-12 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">
                
                {/* Left Side: Content Box */}
                <div className="w-full md:w-1/2 space-y-8 sm:space-y-10 animate-fade-in order-2 md:order-1">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                             <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${step.bg} ${step.color} flex items-center justify-center shadow-xl shadow-slate-200 transition-transform duration-500`}>
                                {step.icon}
                            </div>
                            <div className="h-1 w-20 sm:w-24 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-brand-600 transition-all duration-700" 
                                    style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4 text-center md:text-left">
                            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] md:min-h-[140px]">
                                {step.title}
                            </h2>
                            <p className="text-base sm:text-xl text-slate-500 font-medium leading-relaxed max-w-lg mx-auto md:mx-0">
                                {step.description}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-white/40 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-white/60 shadow-inner">
                        {step.details.map((detail, idx) => (
                            <div key={idx} className="flex items-start gap-3 sm:gap-4 p-1 sm:p-2">
                                <div className="mt-0.5 sm:mt-1 shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </div>
                                <span className="text-slate-700 font-bold text-xs sm:text-base leading-tight">{detail}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 pt-2">
                        {currentStep > 0 && (
                            <button 
                                onClick={prev}
                                className="h-14 sm:h-16 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-white border border-slate-200 text-slate-400 font-bold hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm active:scale-95 flex items-center justify-center"
                            >
                                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                            </button>
                        )}
                        <button 
                            onClick={next}
                            className="h-14 sm:h-16 flex-1 bg-slate-900 text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-2xl shadow-slate-300 hover:bg-brand-600 hover:shadow-brand-500/20 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 group"
                        >
                            {currentStep === STEPS.length - 1 ? (
                                <>
                                    Finalizar e Começar
                                    <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                                </>
                            ) : (
                                <>
                                    Próximo Passo
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Side: Visual Mockup (Desktop) */}
                <div className="hidden md:flex w-full md:w-1/2 h-[400px] lg:h-[500px] items-center justify-center bg-white/40 backdrop-blur-md rounded-[4rem] border border-white shadow-2xl shadow-indigo-100/50 relative group order-1 md:order-2">
                    <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
                    
                    <div className="w-full h-full flex items-center justify-center p-8 lg:p-12 transition-all duration-700">
                        {step.visual}
                    </div>

                    {/* Desktop Progress Labels */}
                    <div className="absolute bottom-8 left-10 right-10 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 border-t border-slate-100 pt-6">
                         <div className="flex gap-4">
                            {STEPS.map((_, i) => (
                                <div key={i} className={`w-8 h-1 rounded-full transition-all duration-500 ${i === currentStep ? 'bg-brand-600' : 'bg-slate-200'}`} />
                            ))}
                         </div>
                         <span>PASSO {currentStep + 1} DE {STEPS.length}</span>
                    </div>
                </div>

                {/* Mobile Visual Mockup (Always shown on top of content on mobile) */}
                <div className="md:hidden w-full bg-white/60 p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-xl border border-white flex justify-center order-1 min-h-[220px] items-center">
                    {step.visual}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-20 py-8 px-6 sm:px-12 flex flex-col sm:flex-row justify-between items-center max-w-7xl mx-auto w-full gap-4 text-center sm:text-left mt-auto">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300" />
                            </div>
                        ))}
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">+500 lojistas ativos</span>
                </div>
                <div className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                    Romaneio Rapido &bull; Premium Experience
                </div>
            </footer>
        </div>
    )
}
