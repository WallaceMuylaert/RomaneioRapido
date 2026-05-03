import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Boxes,
    Check,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    LifeBuoy,
    Mail,
    Menu,
    MessageCircle,
    Package,
    ScanBarcode,
    ShieldCheck,
    Truck,
    X,
    Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import logo from '../assets/romaneiorapido_logo.png'
import { getWhatsAppLink } from '../constants/contacts'
import { PLANS } from '../constants/plans'

type IconType = ComponentType<{ className?: string }>

const fadeIn = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } }
}

const productStats = [
    { label: 'Produtos', value: '1.248', icon: Boxes, tone: 'text-brand-600 bg-brand-50 border-brand-100' },
    { label: 'Movimentos hoje', value: '42', icon: Truck, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Alertas', value: '3', icon: AlertTriangle, tone: 'text-orange-600 bg-orange-50 border-orange-100' }
]

const flowSteps = [
    {
        icon: ScanBarcode,
        title: 'Bipe ou busque o produto',
        desc: 'Use leitor USB, câmera ou busca rápida para montar saídas sem digitação repetida.'
    },
    {
        icon: ClipboardList,
        title: 'Monte o romaneio',
        desc: 'Inclua quantidades, cliente e observações em uma tela simples, rápida e pronta para operação.'
    },
    {
        icon: FileText,
        title: 'Envie e mantenha histórico',
        desc: 'Gere romaneios profissionais e preserve o histórico mesmo quando produtos forem editados depois.'
    }
]

const resources = [
    { icon: Boxes, title: 'Estoque sempre visível', desc: 'Produtos, categorias, unidades e mínimos organizados em um só painel.' },
    { icon: BarChart3, title: 'Dashboard de operação', desc: 'Entradas, saídas, saúde do estoque e itens críticos para decidir rápido.' },
    { icon: ShieldCheck, title: 'Histórico confiável', desc: 'Snapshots preservam dados do movimento para auditoria e conferência.' },
    { icon: Zap, title: 'Rotina mais ágil', desc: 'Fluxos pensados para quem precisa vender, separar e registrar sem travar.' },
    { icon: MessageCircle, title: 'Suporte pelo WhatsApp', desc: 'Um canal direto para tirar dúvidas e manter sua operação andando.' },
    { icon: Package, title: 'Cadastro completo', desc: 'Preço, foto, unidade, estoque mínimo e detalhes importantes por produto.' }
]

const assurances = [
    'Teste inicial sem compromisso',
    'Acesso 100% web',
    'Planos para operações pequenas e em crescimento'
]

export default function LandingPage() {
    const navigate = useNavigate()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [carouselIndex, setCarouselIndex] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    const isHovered = useRef(false)
    const visiblePlans = PLANS.filter((plan) => !plan.hidden)

    const scrollToPlan = useCallback((index: number) => {
        if (!scrollRef.current || !scrollRef.current.children[0]) return
        const safeIndex = (index + visiblePlans.length) % visiblePlans.length
        const cardWidth = (scrollRef.current.children[0] as HTMLElement).offsetWidth + 24
        scrollRef.current.scrollTo({ left: safeIndex * cardWidth, behavior: 'smooth' })
        setCarouselIndex(safeIndex)
    }, [visiblePlans.length])

    useEffect(() => {
        const interval = window.setInterval(() => {
            if (!isHovered.current && visiblePlans.length > 1) {
                scrollToPlan(carouselIndex + 1)
            }
        }, 6500)

        return () => window.clearInterval(interval)
    }, [carouselIndex, scrollToPlan, visiblePlans.length])

    const closeMenu = () => setIsMenuOpen(false)
    const start = () => navigate('/login')

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <a href="/" className="flex items-center gap-2" aria-label="Romaneio Rápido">
                        <img src={logo} alt="Romaneio Rápido" className="h-12 w-12 object-contain" />
                        <span className="text-base font-black tracking-tight text-slate-900">
                            Romaneio<span className="text-brand-600"> Rápido</span>
                        </span>
                    </a>

                    <nav className="hidden items-center gap-6 text-[13px] font-bold text-slate-500 md:flex">
                        <a href="#solucao" className="hover:text-brand-600 transition-colors">Solução</a>
                        <a href="#recursos" className="hover:text-brand-600 transition-colors">Recursos</a>
                        <a href="#planos" className="hover:text-brand-600 transition-colors">Planos</a>
                        <a href="#contato" className="hover:text-brand-600 transition-colors">Contato</a>
                    </nav>

                    <div className="hidden items-center gap-2 md:flex">
                        <a
                            href={getWhatsAppLink('Olá! Gostaria de tirar dúvidas sobre o Romaneio Rápido.')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:border-emerald-200 transition-colors"
                        >
                            <LifeBuoy className="h-4 w-4" />
                            Suporte
                        </a>
                        <button
                            onClick={() => navigate('/login')}
                            className="h-9 px-3 text-[13px] font-bold text-slate-600 hover:text-brand-600 transition-colors"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={start}
                            className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-black text-white hover:bg-brand-700 active:scale-[0.98] transition-all"
                        >
                            Começar
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
                        <nav className="grid gap-2 text-sm font-bold text-slate-600">
                            <a href="#solucao" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-slate-50">Solução</a>
                            <a href="#recursos" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-slate-50">Recursos</a>
                            <a href="#planos" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-slate-50">Planos</a>
                            <a href="#contato" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-slate-50">Contato</a>
                        </nav>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button onClick={() => navigate('/login')} className="h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">
                                Entrar
                            </button>
                            <button onClick={start} className="h-10 rounded-xl bg-brand-600 text-sm font-black text-white">
                                Começar
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main>
                <section className="relative overflow-hidden border-b border-slate-200 bg-white pt-24 sm:pt-28">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-10 py-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-16">
                            <motion.div initial="hidden" animate="visible" variants={fadeIn}>
                                <p className="mb-4 inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-brand-700">
                                    Gestão de estoque e romaneios
                                </p>
                                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem]">
                                    Controle estoque, vendas e romaneios em uma rotina mais clara.
                                </h1>
                                <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-500 sm:text-lg">
                                    O Romaneio Rápido organiza produtos, movimentações e separação de pedidos em uma plataforma web simples, rápida e feita para pequenas operações venderem com mais controle.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={start}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white hover:bg-brand-700 active:scale-[0.98] transition-all"
                                    >
                                        Começar teste
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <a
                                        href="#solucao"
                                        className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors"
                                    >
                                        Ver como funciona
                                    </a>
                                </div>

                                <div className="mt-7 flex flex-wrap gap-2">
                                    {assurances.map((item) => (
                                        <span key={item} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 18 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.1 }}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                                aria-label="Prévia do painel Romaneio Rápido"
                            >
                                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                                    <div className="flex items-center gap-3">
                                        <img src={logo} alt="" className="h-9 w-9 object-contain" />
                                        <div>
                                            <p className="text-sm font-black text-slate-900">Painel de estoque</p>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Visão geral da operação</p>
                                        </div>
                                    </div>
                                    <span className="hidden rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 sm:inline-flex">
                                        Online
                                    </span>
                                </div>

                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        {productStats.map((stat) => (
                                            <PreviewStat key={stat.label} {...stat} />
                                        ))}
                                    </div>

                                    <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <div className="mb-4 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">Romaneio em montagem</p>
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Separação para entrega</p>
                                                </div>
                                                <ScanBarcode className="h-5 w-5 text-brand-600" />
                                            </div>

                                            <div className="space-y-2">
                                                {[
                                                    { name: 'Cabo USB-C Premium', qty: '50 un', value: 'R$ 890,00' },
                                                    { name: 'Adaptador HDMI 4K', qty: '12 un', value: 'R$ 420,00' },
                                                    { name: 'Fonte 20W', qty: '24 un', value: 'R$ 1.080,00' }
                                                ].map((item) => (
                                                    <div key={item.name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
                                                            <Package className="h-4 w-4" />
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
                                                            <p className="text-[11px] font-bold text-slate-400">{item.qty}</p>
                                                        </div>
                                                        <p className="text-xs font-black text-brand-600">{item.value}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 p-4">
                                            <div className="mb-5 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900">Saúde do estoque</p>
                                                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Reposição guiada</p>
                                                </div>
                                                <BarChart3 className="h-5 w-5 text-emerald-600" />
                                            </div>

                                            <div className="space-y-4">
                                                <PreviewProgress label="Estoque ok" value="82%" color="bg-emerald-500" />
                                                <PreviewProgress label="Atenção" value="14%" color="bg-orange-500" />
                                                <PreviewProgress label="Sem estoque" value="4%" color="bg-rose-500" />
                                            </div>

                                            <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-3">
                                                <p className="text-xs font-black text-orange-700">3 produtos precisam de reposição</p>
                                                <p className="mt-1 text-[11px] font-semibold text-orange-600">Priorize os itens antes de finalizar novas saídas.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <section id="solucao" className="border-b border-slate-200 bg-slate-50/70 py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeader
                            label="Como funciona"
                            title="Da leitura do produto ao romaneio pronto, sem perder o fio da operação."
                            desc="A página deixa claro o que o sistema faz: organiza cadastro, estoque, movimentações e documentos de saída para quem precisa trabalhar com velocidade."
                        />

                        <div className="mt-10 grid gap-4 md:grid-cols-3">
                            {flowSteps.map((step, index) => (
                                <FeatureCard key={step.title} icon={step.icon} title={step.title} desc={step.desc} index={index + 1} />
                            ))}
                        </div>
                    </div>
                </section>

                <section id="recursos" className="border-b border-slate-200 bg-white py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeader
                            label="Recursos"
                            title="Profissional no visual, prático na rotina."
                            desc="Tudo fica direto: cadastre, movimente, acompanhe alertas, monte romaneios e fale com suporte quando precisar."
                        />

                        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {resources.map((resource) => (
                                <div key={resource.title} className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/20">
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                                        <resource.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900">{resource.title}</h3>
                                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{resource.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="planos" className="border-b border-slate-200 bg-slate-50/70 py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <SectionHeader
                            label="Planos"
                            title="Comece pequeno e evolua conforme sua operação cresce."
                            desc="Planos simples, com teste inicial e limites claros para você escolher sem ruído."
                        />

                        <div
                            className="relative mt-8"
                            role="region"
                            aria-label="Planos de assinatura"
                            onMouseEnter={() => { isHovered.current = true }}
                            onMouseLeave={() => { isHovered.current = false }}
                        >
                            <button
                                onClick={() => scrollToPlan(carouselIndex - 1)}
                                className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-600 lg:flex"
                                aria-label="Plano anterior"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>

                            <button
                                onClick={() => scrollToPlan(carouselIndex + 1)}
                                className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 translate-x-4 -translate-y-1/2 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:text-brand-600 lg:flex"
                                aria-label="Próximo plano"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>

                            <div
                                ref={scrollRef}
                                className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 pt-5 scroll-smooth"
                                role="list"
                                onScroll={(event) => {
                                    const target = event.currentTarget
                                    const firstCard = target.children[0] as HTMLElement | undefined
                                    if (!firstCard) return
                                    const cardWidth = firstCard.offsetWidth + 24
                                    const index = Math.round(target.scrollLeft / cardWidth)
                                    if (index !== carouselIndex) setCarouselIndex(index)
                                }}
                            >
                                {visiblePlans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        role="listitem"
                                        aria-label={`Plano ${plan.name}`}
                                        className={`relative flex w-[280px] shrink-0 snap-center flex-col rounded-2xl border bg-white p-5 sm:w-[320px] sm:p-6 ${plan.highlight ? 'border-brand-600 ring-1 ring-brand-100' : 'border-slate-200'}`}
                                    >
                                        {plan.highlight && (
                                            <span className="absolute right-4 top-4 rounded-xl bg-brand-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white">
                                                Mais escolhido
                                            </span>
                                        )}

                                        <div className="pr-20">
                                            <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                                            <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-slate-500">{plan.description}</p>
                                        </div>

                                        <div className="mt-6 flex items-baseline gap-1">
                                            <span className="text-3xl font-black tracking-tight text-slate-950">{plan.price}</span>
                                            {plan.period && <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-400">{plan.period}</span>}
                                        </div>

                                        <button
                                            onClick={start}
                                            className={`mt-6 h-11 rounded-xl text-sm font-black transition-all active:scale-[0.98] ${plan.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-900 text-white hover:bg-brand-600'}`}
                                        >
                                            Começar agora
                                        </button>

                                        <div className="mt-6 space-y-3">
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">Inclui</p>
                                            {plan.features.map((feature) => (
                                                <div key={feature} className="flex items-start gap-3">
                                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                                                        <Check className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="text-[13px] font-semibold leading-5 text-slate-600">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex justify-center gap-2">
                                {visiblePlans.map((plan, index) => (
                                    <button
                                        key={plan.id}
                                        aria-label={`Ver plano ${index + 1}`}
                                        aria-current={carouselIndex === index ? 'true' : 'false'}
                                        onClick={() => scrollToPlan(index)}
                                        className={`h-2 rounded-xl transition-all ${carouselIndex === index ? 'w-8 bg-brand-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white py-16 sm:py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-8 rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-300">Pronto para testar</p>
                                <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Dê uma cara mais organizada para sua operação ainda hoje.</h2>
                                <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
                                    Entre, cadastre seus primeiros produtos e veja como o fluxo de estoque e romaneio fica mais claro.
                                </p>
                            </div>
                            <button
                                onClick={start}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white hover:bg-brand-500 active:scale-[0.98] transition-all"
                            >
                                Acessar o sistema
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="contato" className="border-t border-slate-200 bg-white py-10">
                <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Romaneio Rápido" className="h-10 w-10 object-contain" />
                            <span className="text-sm font-black text-slate-900">Romaneio Rápido</span>
                        </div>
                        <p className="mt-3 max-w-sm text-xs font-semibold leading-5 text-slate-500">
                            Sistema web para gestão de estoque, movimentações e romaneios.
                        </p>
                    </div>

                    <div className="grid gap-8 text-xs font-bold text-slate-500 sm:grid-cols-3">
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-slate-900">Navegação</h3>
                            <div className="grid gap-2">
                                <a href="#solucao" className="hover:text-brand-600">Solução</a>
                                <a href="#recursos" className="hover:text-brand-600">Recursos</a>
                                <a href="#planos" className="hover:text-brand-600">Planos</a>
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-slate-900">Legal</h3>
                            <div className="grid gap-2">
                                <button onClick={() => navigate('/termos')} className="text-left hover:text-brand-600">Termos de Uso</button>
                                <button onClick={() => navigate('/privacidade')} className="text-left hover:text-brand-600">Privacidade</button>
                                <button onClick={() => navigate('/cookies')} className="text-left hover:text-brand-600">Cookies</button>
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-slate-900">Contato</h3>
                            <div className="grid gap-2">
                                <span className="inline-flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    romaneiorapido@gmail.com
                                </span>
                                <a
                                    href={getWhatsAppLink('Olá! Vim pela Landing Page e preciso de suporte.')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                                >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    WhatsApp Suporte
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-8 max-w-7xl border-t border-slate-200 px-4 pt-5 text-center text-[11px] font-bold text-slate-400 sm:px-6 lg:px-8">
                    © 2026 Romaneio Rápido
                </div>
            </footer>

            <motion.a
                href={getWhatsAppLink('Olá! Estou na Landing Page e gostaria de falar com o suporte.')}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                className="fixed bottom-5 right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                title="Falar com suporte"
            >
                <MessageCircle className="h-6 w-6" />
            </motion.a>
        </div>
    )
}

function PreviewStat({ label, value, icon: Icon, tone }: { label: string; value: string; icon: IconType; tone: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border ${tone}`}>
                <Icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-black leading-none text-slate-950 sm:text-2xl">{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
        </div>
    )
}

function PreviewProgress({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs font-black">
                <span className="text-slate-600">{label}</span>
                <span className="text-slate-900">{value}</span>
            </div>
            <div className="h-2 rounded-xl bg-slate-100">
                <div className={`h-full rounded-xl ${color}`} style={{ width: value }} />
            </div>
        </div>
    )
}

function SectionHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
    return (
        <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-600">{label}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 sm:text-base">{desc}</p>
        </div>
    )
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: IconType; title: string; desc: string; index: number }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-slate-300">0{index}</span>
            </div>
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{desc}</p>
        </div>
    )
}
