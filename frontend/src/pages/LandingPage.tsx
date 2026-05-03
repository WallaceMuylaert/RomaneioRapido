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
    Sparkles,
    Truck,
    X,
    Zap
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import logo from '../assets/romaneiorapido_logo.png'
import heroTeamImage from '../assets/two-business-partners-working-together-office-computer.jpg'
import operationImage from '../assets/colleagues-discussing-their-work-laptop.jpg'
import supportImage from '../assets/cheerful-young-caucasian-businessman-chatting-by-mobile-phone.jpg'
import { getWhatsAppLink } from '../constants/contacts'
import { PLANS } from '../constants/plans'

type IconType = ComponentType<{ className?: string }>

const softEase = [0.22, 1, 0.36, 1] as const

const pageVariants = {
    hidden: { opacity: 0, y: 18, filter: 'blur(10px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.78, ease: softEase, staggerChildren: 0.08 }
    }
}

const liftIn = {
    hidden: { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: softEase } }
}

const scrollIn = {
    hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.72, ease: softEase } }
}

const sideIn = {
    hidden: { opacity: 0, x: -26 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.72, ease: softEase } }
}

const cardIn = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.52, ease: softEase } }
}

const staggerIn = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
}

const productStats = [
    { label: 'Produtos', value: '1.248', icon: Boxes, tone: 'text-brand-600 bg-brand-50 border-brand-100' },
    { label: 'Saídas hoje', value: '42', icon: Truck, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'Alertas', value: '3', icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 border-amber-100' }
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
        desc: 'Inclua quantidades, cliente e observações em uma tela simples, rápida e pronta para a operação.'
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
    const reduceMotion = useReducedMotion()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [introVisible, setIntroVisible] = useState(!reduceMotion)

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
        if (reduceMotion) {
            setIntroVisible(false)
            return
        }

        const timeout = window.setTimeout(() => setIntroVisible(false), 1800)
        return () => window.clearTimeout(timeout)
    }, [reduceMotion])

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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
            <AnimatePresence>
                {introVisible && <IntroOverlay />}
            </AnimatePresence>

            <motion.header
                initial={reduceMotion ? false : { opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: softEase, delay: 0.15 }}
                className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-7xl rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md sm:left-4 sm:right-4"
            >
                <div className="mx-auto flex h-14 items-center justify-between px-3 sm:px-5 lg:h-16 lg:px-6">
                    <a href="/" className="flex items-center gap-2" aria-label="Romaneio Rápido">
                        <img src={logo} alt="Romaneio Rápido" className="h-10 w-10 object-contain lg:h-12 lg:w-12" />
                        <span className="text-base font-black tracking-tight text-slate-900 lg:text-lg">
                            Romaneio<span className="text-brand-600"> Rápido</span>
                        </span>
                    </a>

                    <nav className="hidden items-center gap-5 text-[13px] font-bold text-slate-500 md:flex lg:gap-6">
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
                            className="inline-flex h-8 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-700 hover:border-emerald-200 transition-colors lg:h-9"
                        >
                            <LifeBuoy className="h-4 w-4" />
                            Suporte
                        </a>
                        <button
                            onClick={() => navigate('/login')}
                            className="h-8 px-3 text-[13px] font-bold text-slate-600 hover:text-brand-600 transition-colors lg:h-9"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={start}
                            className="inline-flex h-8 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-black text-white hover:bg-brand-700 active:scale-[0.98] transition-all lg:h-9 lg:px-5"
                        >
                            Começar
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
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
            </motion.header>

            <motion.main initial="hidden" animate="visible" variants={pageVariants}>
                <section className="relative overflow-hidden border-b border-slate-200 bg-white pt-24 sm:pt-28">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#eef6ff_100%)]" />
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:py-16">
                            <motion.div variants={liftIn}>
                                <p className="mb-4 inline-flex items-center gap-2 rounded-xl border border-brand-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-brand-700">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Gestão de estoque e romaneios
                                </p>
                                <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-[2.9rem]">
                                    Romaneio Rápido para uma operação mais clara.
                                </h1>
                                <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-slate-500 sm:text-base">
                                    Organize produtos, movimentações e separação de pedidos em uma plataforma web simples, ágil e feita para pequenos negócios venderem com mais controle.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <motion.button
                                        onClick={start}
                                        whileHover={reduceMotion ? undefined : { y: -2 }}
                                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white hover:bg-brand-700 active:scale-[0.98] transition-all"
                                    >
                                        Começar teste
                                        <ArrowRight className="h-4 w-4" />
                                    </motion.button>
                                    <motion.a
                                        href="#solucao"
                                        whileHover={reduceMotion ? undefined : { y: -2 }}
                                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                        className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-700 hover:border-brand-200 hover:text-brand-700 transition-colors"
                                    >
                                        Ver como funciona
                                    </motion.a>
                                </div>

                                <div className="mt-7 flex flex-wrap gap-2">
                                    {assurances.map((item) => (
                                        <span key={item} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div variants={liftIn} className="relative rounded-2xl bg-white pb-8 sm:pb-10" aria-label="Profissionais usando o Romaneio Rápido">
                                <div className="relative rounded-2xl border border-slate-200 bg-white [perspective:1100px]">
                                    <img
                                        src={heroTeamImage}
                                        alt="Profissionais conferindo informações no computador"
                                        className="h-full min-h-[340px] w-full rounded-2xl object-cover sm:min-h-[460px]"
                                    />
                                    <RomaneioImagePreview />
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <motion.section
                    className="border-b border-emerald-700 bg-emerald-600 py-8 text-white"
                    initial={reduceMotion ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.55 }}
                    variants={scrollIn}
                >
                    <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-center lg:px-8">
                        <div className="flex justify-center lg:justify-start">
                            <div className="flex -space-x-3">
                                {['MA', 'JR', 'LT', 'AS', 'CM', 'VB', 'RF', 'PN', 'DG'].map((initials, index) => (
                                    <div
                                        key={initials}
                                        className={`flex h-14 w-14 items-center justify-center rounded-full border-3 border-white bg-white text-sm font-black text-emerald-700 ${index % 3 === 0 ? 'bg-brand-50' : index % 3 === 1 ? 'bg-emerald-50' : 'bg-slate-50'}`}
                                    >
                                        {initials}
                                    </div>
                                ))}
                                <div className="flex h-14 w-14 items-center justify-center rounded-full border-3 border-white bg-white text-3xl font-black text-emerald-600">
                                    +
                                </div>
                            </div>
                        </div>

                        <div className="text-center lg:text-left">
                            <p className="text-2xl font-black tracking-tight sm:text-3xl">
                                +1.500 usuários organizam estoque e romaneios com o Romaneio Rápido
                            </p>
                            <p className="mt-2 text-sm font-bold text-emerald-50/90">
                                Uma rotina mais clara para cadastrar produtos, separar pedidos e registrar saídas sem complicação.
                            </p>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    id="solucao"
                    className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
                    initial={reduceMotion ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.22 }}
                    variants={staggerIn}
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <motion.div variants={scrollIn}>
                            <SectionHeader
                                label="Como funciona"
                                title="Do produto lido ao romaneio pronto, sem perder o ritmo."
                                desc="O sistema organiza cadastro, estoque, movimentações e documentos de saída para quem precisa trabalhar com velocidade."
                            />
                        </motion.div>

                        <div className="mt-10 grid gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:items-stretch">
                            <motion.div variants={sideIn} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <img
                                    src={operationImage}
                                    alt="Parceiros de negócio revisando pedidos no computador"
                                    className="h-full min-h-[320px] w-full object-cover"
                                />
                                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-white/95 p-4 backdrop-blur">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-sm font-black text-slate-900">Romaneio #2481</p>
                                        <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">Pronto</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {productStats.map((stat) => (
                                            <PreviewStat key={stat.label} {...stat} compact />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                                {flowSteps.map((step, index) => (
                                    <motion.div
                                        key={step.title}
                                        variants={cardIn}
                                        whileHover={reduceMotion ? undefined : { x: 4 }}
                                        transition={{ duration: 0.22, ease: softEase }}
                                    >
                                        <FeatureCard icon={step.icon} title={step.title} desc={step.desc} index={index + 1} />
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.section>

                <motion.section
                    id="recursos"
                    className="border-b border-slate-200 bg-white py-16 sm:py-20"
                    initial={reduceMotion ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={staggerIn}
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                            <motion.div variants={scrollIn}>
                                <SectionHeader
                                    label="Recursos"
                                    title="Profissional no visual, prático na rotina."
                                    desc="Tudo fica direto: cadastre, movimente, acompanhe alertas, monte romaneios e fale com suporte quando precisar."
                                />
                            </motion.div>
                            <motion.div variants={scrollIn} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                                <img
                                    src={supportImage}
                                    alt="Profissional atendendo cliente pelo telefone"
                                    className="h-64 w-full object-cover sm:h-72 lg:h-80"
                                />
                                <div className="absolute left-4 top-4 rounded-2xl border border-white/60 bg-white/95 p-4 backdrop-blur">
                                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">Suporte</p>
                                    <p className="mt-1 text-sm font-black text-slate-900">Atendimento ativo</p>
                                </div>
                                <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                                    <MessageCircle className="h-4 w-4" />
                                    WhatsApp
                                </div>
                            </motion.div>
                        </div>

                        <motion.div variants={staggerIn} className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {resources.map((resource) => (
                                <motion.div
                                    key={resource.title}
                                    variants={cardIn}
                                    whileHover={reduceMotion ? undefined : { y: -4 }}
                                    transition={{ duration: 0.22, ease: softEase }}
                                    className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/20"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                                        <resource.icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-900">{resource.title}</h3>
                                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{resource.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </motion.section>

                <motion.section
                    id="planos"
                    className="border-b border-slate-200 bg-slate-50 py-16 sm:py-20"
                    initial={reduceMotion ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.18 }}
                    variants={staggerIn}
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <motion.div variants={scrollIn}>
                            <SectionHeader
                                label="Planos"
                                title="Comece pequeno e evolua conforme sua operação cresce."
                                desc="Planos simples, com teste inicial e limites claros para você escolher sem ruído."
                            />
                        </motion.div>

                        <motion.div
                            variants={scrollIn}
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
                                    <motion.div
                                        key={plan.id}
                                        role="listitem"
                                        aria-label={`Plano ${plan.name}`}
                                        whileHover={reduceMotion ? undefined : { y: -5 }}
                                        transition={{ duration: 0.22, ease: softEase }}
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

                                        <motion.button
                                            onClick={start}
                                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                            className={`mt-6 h-11 rounded-xl text-sm font-black transition-all active:scale-[0.98] ${plan.highlight ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-900 text-white hover:bg-brand-600'}`}
                                        >
                                            Começar agora
                                        </motion.button>

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
                                    </motion.div>
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
                        </motion.div>
                    </div>
                </motion.section>

                <motion.section
                    className="relative overflow-hidden border-y border-slate-800 bg-slate-950 py-16 text-white sm:py-20"
                    initial={reduceMotion ? false : 'hidden'}
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.35 }}
                    variants={scrollIn}
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(37,99,235,0.22),transparent_42%,rgba(14,165,233,0.14))]" />
                    <div className="absolute inset-x-0 top-0 h-px bg-brand-400/50" />
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <motion.div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
                            <div className="max-w-4xl">
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-300">Pronto para testar</p>
                                <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                                    Dê uma operação mais organizada para sua empresa ainda hoje.
                                </h2>
                                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">
                                    Entre, cadastre seus primeiros produtos e veja como o fluxo de estoque, separação e romaneio fica mais claro desde o primeiro uso.
                                </p>

                                <div className="mt-8 grid gap-3 text-sm font-bold text-slate-200 sm:grid-cols-3">
                                    {['Configuração rápida', 'Rotina 100% web', 'Suporte pelo WhatsApp'].map((item) => (
                                        <div key={item} className="flex items-center gap-3 border-l border-brand-400/40 pl-3">
                                            <Check className="h-4 w-4 text-emerald-400" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 lg:items-end">
                                <motion.button
                                    onClick={start}
                                    whileHover={reduceMotion ? undefined : { y: -2 }}
                                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-black text-white hover:bg-brand-500 active:scale-[0.98] transition-all sm:w-auto lg:min-w-64"
                                >
                                    Acessar o sistema
                                    <ArrowRight className="h-4 w-4" />
                                </motion.button>
                                <p className="max-w-xs text-center text-xs font-bold leading-5 text-slate-400 lg:text-right">
                                    Comece pelo login e monte seu primeiro romaneio em poucos minutos.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                </motion.section>
            </motion.main>

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

function IntroOverlay() {
    return (
        <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)', transition: { duration: 0.5, ease: softEase } }}
        >
            <motion.div
                initial={{ opacity: 0, x: -28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 28 }}
                transition={{ duration: 0.28, ease: softEase }}
                className="relative flex min-h-40 w-full max-w-sm flex-col items-center justify-center overflow-hidden px-6"
            >
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={{ opacity: 0, x: 80 }}
                    transition={{ delay: 0.52, duration: 0.22, ease: softEase }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                >
                    <img src={logo} alt="Romaneio Rápido" className="h-16 w-16 object-contain" />
                    <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                            className="h-full rounded-full bg-brand-600"
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ duration: 0.48, ease: softEase }}
                        />
                    </div>
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">
                        Carregando
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: -96 }}
                    animate={{ opacity: [0, 1, 1], x: [-96, 0, 0] }}
                    transition={{ delay: 0.68, duration: 0.62, ease: softEase, times: [0, 0.65, 1] }}
                    className="flex flex-col items-center text-center"
                >
                    <p className="text-2xl font-black tracking-tight text-slate-950">Tudo pronto</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">Bem-vindo ao Romaneio Rápido</p>
                </motion.div>
            </motion.div>
        </motion.div>
    )
}

function RomaneioImagePreview() {
    return (
        <div className="absolute -bottom-7 right-3 w-[min(82%,330px)] origin-bottom-right rotate-[0.2deg] rounded-2xl border border-white/80 bg-white/95 p-3 backdrop-blur-md shadow-[0_24px_55px_rgba(15,23,42,0.28),0_8px_18px_rgba(37,99,235,0.16)] [transform:translateZ(34px)_rotateX(5deg)_rotateY(-8deg)] sm:-bottom-8 sm:right-5 sm:w-[20.5rem]">
            <div className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl bg-brand-600/10 blur-xl" />
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600 shadow-[0_8px_16px_rgba(37,99,235,0.14)]">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-950">Romaneio #2481</p>
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Cliente Comercial Alves</p>
                    </div>
                </div>
                <span className="shrink-0 rounded-xl border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
                    Pronto
                </span>
            </div>

            <div className="space-y-1.5">
                {[
                    ['Kit Escritório', '86 un.'],
                    ['Suporte Premium', '24 un.'],
                    ['Caixa Organizadora', '9 un.']
                ].map(([name, quantity]) => (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <span className="truncate text-[11px] font-black text-slate-800">{name}</span>
                        <span className="shrink-0 text-[11px] font-black text-slate-950">{quantity}</span>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">Total</span>
                <span className="text-sm font-black text-emerald-600">R$ 1.842,00</span>
            </div>
        </div>
    )
}

function PreviewStat({ label, value, icon: Icon, tone, compact = false }: { label: string; value: string; icon: IconType; tone: string; compact?: boolean }) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
            <div className={`mb-2 flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} items-center justify-center rounded-xl border ${tone}`}>
                <Icon className="h-4 w-4" />
            </div>
            <p className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-black leading-none text-slate-950`}>{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
        </div>
    )
}

function SectionHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
    return (
        <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-600">{label}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 sm:text-base">{desc}</p>
        </div>
    )
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: IconType; title: string; desc: string; index: number }) {
    return (
        <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-brand-200">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-600">
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-slate-300">0{index}</span>
            </div>
            <h3 className="text-base font-black text-slate-900">{title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{desc}</p>
        </div>
    )
}
