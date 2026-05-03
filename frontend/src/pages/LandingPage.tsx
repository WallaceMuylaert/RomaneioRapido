import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    Check,
    ClipboardList,
    FileText,
    Mail,
    Menu,
    MessageCircle,
    ScanBarcode,
    Truck,
    X
} from 'lucide-react'
import logo from '../assets/romaneiorapido_logo.png'
import heroTeamImage from '../assets/two-business-partners-working-together-office-computer.jpg'
import operationImage from '../assets/colleagues-discussing-their-work-laptop.jpg'
import personOne from '../assets/pessoas/pexels-claudio-emanuel-709239809-18935832.jpg'
import personTwo from '../assets/pessoas/pexels-ilayda0700-36593091.jpg'
import personThree from '../assets/pessoas/pexels-josepheulo-nyc-12311550.jpg'
import personFour from '../assets/pessoas/pexels-leonardodourado-14059688.jpg'
import personFive from '../assets/pessoas/pexels-marina-endzhirgli-725723515-31510092.jpg'
import personSix from '../assets/pessoas/pexels-olly-3778603.jpg'
import personSeven from '../assets/pessoas/pexels-sandro-tavares-260503371-15728334.jpg'
import personEight from '../assets/pessoas/pexels-silverkblack-36713164.jpg'
import { getWhatsAppLink } from '../constants/contacts'
import { PLANS } from '../constants/plans'

type IconType = ComponentType<{ className?: string }>

const productStats = [
    { label: 'Produtos', value: '1.248', icon: Boxes, tone: 'text-primary bg-brand-50 border-brand-100' },
    { label: 'Saídas hoje', value: '42', icon: Truck, tone: 'text-success bg-success/10 border-success/20' },
    { label: 'Alertas', value: '3', icon: AlertTriangle, tone: 'text-warning bg-warning/10 border-warning/20' }
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
    { title: 'Controle de Estoque em Tempo Real', desc: 'Produtos, categorias, unidades e mínimos sempre visíveis em um painel direto para acompanhar o estoque disponível.' },
    { title: 'Dashboard de Operação', desc: 'Entradas, saídas, saúde do estoque e itens críticos reunidos para decisões rápidas no dia a dia.' },
    { title: 'Histórico Confiável', desc: 'Snapshots preservam os dados de cada movimento para auditoria, conferência e rastreabilidade.' },
    { title: 'Rotina Mais Ágil', desc: 'Fluxos pensados para vender, separar e registrar sem travar a operação ou repetir digitação.' },
    { title: 'Suporte pelo WhatsApp', desc: 'Um canal direto para tirar dúvidas e manter sua operação andando quando precisar.' },
    { title: 'Cadastro Completo', desc: 'Preço, foto, unidade, estoque mínimo e detalhes importantes organizados por produto.' }
]

const assurances = [
    'Teste inicial sem compromisso',
    'Acesso 100% web',
    'Planos para operações pequenas e em crescimento'
]

const userPhotos = [
    personOne,
    personTwo,
    personThree,
    personFour,
    personFive,
    personSix,
    personSeven,
    personEight
]

export default function LandingPage() {
    const navigate = useNavigate()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [carouselIndex, setCarouselIndex] = useState(0)
    const [isLoaderVisible, setIsLoaderVisible] = useState(true)
    const [isLoaderLeaving, setIsLoaderLeaving] = useState(false)
    const [loaderStep, setLoaderStep] = useState<'fast' | 'welcome'>('fast')

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
            if (!isHovered.current && visiblePlans.length > 1 && window.innerWidth < 1024) {
                scrollToPlan(carouselIndex + 1)
            }
        }, 6500)

        return () => window.clearInterval(interval)
    }, [carouselIndex, scrollToPlan, visiblePlans.length])

    useEffect(() => {
        const welcomeTimer = window.setTimeout(() => setLoaderStep('welcome'), 420)
        const leaveTimer = window.setTimeout(() => setIsLoaderLeaving(true), 1450)
        const hideTimer = window.setTimeout(() => setIsLoaderVisible(false), 1220)

        return () => {
            window.clearTimeout(welcomeTimer)
            window.clearTimeout(leaveTimer)
            window.clearTimeout(hideTimer)
        }
    }, [])

    const closeMenu = () => setIsMenuOpen(false)
    const start = () => navigate('/login')

    return (
        <div className="min-h-screen overflow-x-hidden bg-background font-sans text-text-primary selection:bg-brand-100 selection:text-brand-900">
            {isLoaderVisible && <LandingWelcomeLoader step={loaderStep} isLeaving={isLoaderLeaving} />}

            <header
                className="fixed left-3 right-3 top-3 z-50 mx-auto max-w-[90rem] rounded-2xl border border-border bg-card/95 backdrop-blur-md sm:left-4 sm:right-4"
            >
                <div className="mx-auto flex h-14 items-center justify-between px-3 sm:px-5 lg:h-16 lg:px-6">
                    <a href="/" className="flex items-center gap-2" aria-label="Romaneio Rápido">
                        <img src={logo} alt="Romaneio Rápido" className="h-10 w-10 object-contain lg:h-12 lg:w-12" />
                        <span className="text-base font-black tracking-tight text-text-primary lg:text-lg">
                            Romaneio<span className="text-primary"> Rápido</span>
                        </span>
                    </a>

                    <nav className="hidden items-center gap-5 text-[13px] font-bold text-text-secondary md:flex lg:gap-6">
                        <a href="#solucao" className="hover:text-primary transition-colors">Como funciona</a>
                        <a href="#recursos" className="hover:text-primary transition-colors">Recursos</a>
                        <a href="#planos" className="hover:text-primary transition-colors">Planos</a>
                        <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
                    </nav>

                    <div className="hidden items-center gap-2 md:flex">
                        <button
                            onClick={() => navigate('/login')}
                            className="h-8 px-3 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors lg:h-9"
                        >
                            Entrar
                        </button>
                        <button
                            onClick={start}
                            className="inline-flex h-8 items-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-black text-card hover:bg-primary-dark active:scale-[0.98] transition-all lg:h-9 lg:px-5"
                        >
                            Começar
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-text-secondary hover:bg-border/45 md:hidden"
                        onClick={() => setIsMenuOpen((open) => !open)}
                        aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                    >
                        {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="border-t border-border bg-card px-4 py-4 md:hidden">
                        <nav className="grid gap-2 text-sm font-bold text-text-secondary">
                            <a href="#solucao" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-background">Como funciona</a>
                            <a href="#recursos" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-background">Recursos</a>
                            <a href="#planos" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-background">Planos</a>
                            <a href="#contato" onClick={closeMenu} className="rounded-xl px-3 py-2 hover:bg-background">Contato</a>
                        </nav>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button onClick={() => navigate('/login')} className="h-10 rounded-xl border border-border text-sm font-bold text-text-secondary">
                                Entrar
                            </button>
                            <button onClick={start} className="h-10 rounded-xl bg-primary text-sm font-black text-card">
                                Começar
                            </button>
                        </div>
                    </div>
                )}
            </header>

            <main>
                <section className="relative overflow-hidden border-b border-border bg-card pt-24 sm:pt-28">
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_42%,#eef6ff_100%)]" />
                    <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-10 py-12 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:py-16">
                            <div>
                                <p className="relative mb-2 inline-flex items-center rounded-2xl border border-brand-100 bg-card px-5 py-2.5 text-sm font-black text-primary-dark">
                                    Planos a partir de R$99
                                    <span className="absolute -bottom-1 left-6 h-2.5 w-2.5 rotate-45 border-b border-r border-brand-100 bg-card" />
                                </p>
                                <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-text-primary sm:text-4xl lg:text-[2.9rem]">
                                    <span className="text-primary">Romaneio Rápido</span> para uma operação mais clara.
                                </h1>
                                <p className="mt-5 max-w-xl text-sm font-semibold leading-7 text-text-secondary sm:text-base">
                                    Organize produtos, movimentações e separação de pedidos em uma plataforma web simples, ágil e feita para pequenos negócios venderem com mais controle.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <button
                                        onClick={start}
                                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-card hover:bg-primary-dark active:scale-[0.98] transition-all"
                                    >
                                        Começar teste
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                    <a
                                        href="#solucao"
                                        className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-black text-text-secondary hover:border-brand-200 hover:text-primary-dark transition-colors"
                                    >
                                        Ver como funciona
                                    </a>
                                </div>

                                <div className="mt-7 flex flex-wrap gap-2">
                                    {assurances.map((item) => (
                                        <span key={item} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-text-secondary">
                                            <Check className="h-3.5 w-3.5 text-success" />
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="relative rounded-2xl sm:bg-card sm:pb-10" aria-label="Demonstração do Romaneio Rápido">
                                <div className="relative flex justify-center sm:block rounded-2xl sm:border sm:border-border sm:bg-card sm:[perspective:1100px]">
                                    <img
                                        src={heroTeamImage}
                                        alt="Profissionais conferindo informações no computador"
                                        className="hidden h-full w-full rounded-2xl object-cover sm:block sm:min-h-[460px]"
                                    />
                                    <RomaneioImagePreview />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    className="border-b border-primary-dark bg-primary py-6 sm:py-8 text-card"
                >
                    <div className="mx-auto grid max-w-[90rem] gap-4 sm:gap-6 px-4 sm:px-6 lg:grid-cols-[auto_1fr] lg:items-center lg:px-8">
                        <div className="flex justify-center lg:justify-start">
                            <div className="flex -space-x-2 sm:-space-x-3">
                                {userPhotos.map((photo, index) => (
                                    <div
                                        key={photo}
                                        className="h-10 w-10 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-full border-2 sm:border-[3px] border-primary bg-brand-50"
                                        style={{ zIndex: userPhotos.length - index }}
                                    >
                                        <img
                                            src={photo}
                                            alt=""
                                            aria-hidden="true"
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                ))}
                                <div className="flex h-10 w-10 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-full border-2 sm:border-[3px] border-primary bg-card text-xl sm:text-3xl font-black text-primary">
                                    +
                                </div>
                            </div>
                        </div>

                        <div className="text-center lg:text-left">
                            <p className="text-xl font-black tracking-tight sm:text-3xl">
                                +1.500 usuários organizam estoque e romaneios com o Romaneio Rápido
                            </p>
                            <p className="mt-1 sm:mt-2 text-xs sm:text-sm font-bold text-brand-50/90">
                                Uma rotina mais clara para cadastrar produtos, separar pedidos e registrar saídas sem complicação.
                            </p>
                        </div>
                    </div>
                </section>

                <section
                    id="solucao"
                    className="border-b border-border bg-background py-16 sm:py-20"
                >
                    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                        <div>
                            <SectionHeader
                                label="Como funciona"
                                title="Do produto lido ao romaneio pronto, sem perder o ritmo."
                                desc="O sistema organiza cadastro, estoque, movimentações e documentos de saída para quem precisa trabalhar com velocidade."
                            />
                        </div>

                        <div className="mt-10 grid gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:items-stretch">
                            <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                                <img
                                    src={operationImage}
                                    alt="Parceiros de negócio revisando pedidos no computador"
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full min-h-[320px] w-full object-cover"
                                />
                                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-card/60 bg-card/95 p-4 backdrop-blur">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <p className="text-sm font-black text-text-primary">Romaneio #2481</p>
                                        <span className="rounded-xl bg-success/10 px-2.5 py-1 text-[10px] font-black text-success">Pronto</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {productStats.map((stat) => (
                                            <PreviewStat key={stat.label} {...stat} compact />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                                {flowSteps.map((step, index) => (
                                    <div key={step.title}>
                                        <FeatureCard icon={step.icon} title={step.title} desc={step.desc} index={index + 1} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    id="recursos"
                    className="border-b border-border bg-card py-12 sm:py-16"
                >
                    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                        <div
                            className="mb-8 flex items-center gap-4 sm:mb-10"
                        >
                            <span className="h-8 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                            <h2 className="text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
                                <span className="text-primary">Nossos</span> Recursos
                            </h2>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[0.62fr_0.38fr] lg:items-center">
                            <h3
                                className="max-w-xl text-3xl font-black leading-tight tracking-tight text-text-primary sm:text-4xl"
                            >
                                Recursos que transformam seu estoque.
                            </h3>
                        </div>

                        <div className="mt-10 border-y border-border sm:mt-12">
                            {resources.map((resource, index) => (
                                <div
                                    key={resource.title}
                                    className="grid gap-4 border-b border-border py-6 last:border-b-0 sm:grid-cols-[0.15fr_0.45fr_0.4fr] sm:items-center lg:py-8 hover:bg-background/50 transition-colors"
                                >
                                    <span className="text-5xl font-black leading-none tracking-tight text-brand-200 sm:text-6xl lg:text-7xl">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h4 className="text-xl font-black leading-tight tracking-tight text-text-primary">
                                        {resource.title}
                                    </h4>
                                    <p className="text-sm font-semibold leading-6 text-text-secondary sm:text-base">
                                        {resource.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section
                    id="planos"
                    className="border-b border-border bg-background py-16 sm:py-20"
                >
                    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                        <div>
                            <SectionHeader
                                label="Planos"
                                title="Comece pequeno e evolua conforme sua operação cresce."
                                desc="Planos simples, com teste inicial e limites claros para você escolher sem ruído."
                            />
                        </div>

                        <div
                            className="relative mt-8"
                            role="region"
                            aria-label="Planos de assinatura"
                            onMouseEnter={() => { isHovered.current = true }}
                            onMouseLeave={() => { isHovered.current = false }}
                        >
                            <div
                                ref={scrollRef}
                                className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto pb-3 pt-5 scroll-smooth lg:grid lg:grid-cols-4 lg:overflow-visible lg:snap-none"
                                role="list"
                                onScroll={(event) => {
                                    if (window.innerWidth >= 1024) return;
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
                                        className={`relative flex w-[280px] shrink-0 snap-center flex-col rounded-2xl border bg-card p-5 sm:w-[320px] sm:p-6 lg:h-full lg:w-auto lg:shrink lg:snap-align-none ${plan.highlight ? 'border-primary ring-1 ring-brand-100' : 'border-border'}`}
                                    >
                                        {plan.highlight && (
                                            <span className="absolute right-4 top-4 rounded-xl bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-card">
                                                Mais escolhido
                                            </span>
                                        )}

                                        <div className="pr-20">
                                            <h3 className="text-xl font-black text-text-primary">{plan.name}</h3>
                                            <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-text-secondary">{plan.description}</p>
                                        </div>

                                        <div className="mt-6 flex items-baseline gap-1">
                                            <span className="text-3xl font-black tracking-tight text-text-primary">{plan.price}</span>
                                            {plan.period && <span className="text-xs font-black uppercase tracking-[0.08em] text-text-secondary/70">{plan.period}</span>}
                                        </div>

                                        <button
                                            onClick={start}
                                            className={`mt-6 h-11 rounded-xl text-sm font-black transition-all active:scale-[0.98] ${plan.highlight ? 'bg-primary text-card hover:bg-primary-dark' : 'bg-text-primary text-card hover:bg-primary'}`}
                                        >
                                            Começar agora
                                        </button>

                                        <div className="mt-6 space-y-3 flex-1">
                                            <p className="text-[11px] font-black uppercase tracking-[0.08em] text-text-secondary/70">Inclui</p>
                                            {plan.features.map((feature) => (
                                                <div key={feature} className="flex items-start gap-3">
                                                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-primary">
                                                        <Check className="h-3.5 w-3.5" />
                                                    </span>
                                                    <span className="text-[13px] font-semibold leading-5 text-text-secondary">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex justify-center gap-2 lg:hidden">
                                {visiblePlans.map((plan, index) => (
                                    <button
                                        key={plan.id}
                                        aria-label={`Ver plano ${index + 1}`}
                                        aria-current={carouselIndex === index ? 'true' : 'false'}
                                        onClick={() => scrollToPlan(index)}
                                        className={`h-2 rounded-xl transition-all ${carouselIndex === index ? 'w-8 bg-primary' : 'w-2 bg-text-secondary/40 hover:bg-text-secondary/45'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    className="relative overflow-hidden border-y border-text-primary/90 bg-text-primary py-16 text-card sm:py-20"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(37,99,235,0.22),transparent_42%,rgba(14,165,233,0.14))]" />
                    <div className="absolute inset-x-0 top-0 h-px bg-brand-400/50" />
                    <div className="relative mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-8">
                        <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-center">
                            <div className="max-w-4xl">
                                <p className="text-xs font-black uppercase tracking-[0.08em] text-brand-300">Pronto para testar</p>
                                <h2 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                                    Dê uma operação mais organizada para sua empresa ainda hoje.
                                </h2>
                                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-text-secondary/50 sm:text-base">
                                    Entre, cadastre seus primeiros produtos e veja como o fluxo de estoque, separação e romaneio fica mais claro desde o primeiro uso.
                                </p>

                                <div className="mt-8 grid gap-3 text-sm font-bold text-card/70 sm:grid-cols-3">
                                    {['Configuração rápida', 'Rotina 100% web', 'Suporte pelo WhatsApp'].map((item) => (
                                        <div key={item} className="flex items-center gap-3 border-l border-brand-400/40 pl-3">
                                            <Check className="h-4 w-4 text-success" />
                                            <span>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 lg:items-end">
                                <button
                                    onClick={start}
                                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-black text-card hover:bg-primary active:scale-[0.98] transition-all sm:w-auto lg:min-w-64"
                                >
                                    Acessar o sistema
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                                <p className="max-w-xs text-center text-xs font-bold leading-5 text-text-secondary/70 lg:text-right">
                                    Comece pelo login e monte seu primeiro romaneio em poucos minutos.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer id="contato" className="border-t border-border bg-card py-10">
                <div className="mx-auto flex max-w-[90rem] flex-col gap-8 px-4 sm:px-6 md:flex-row md:items-start md:justify-between lg:px-8">
                    <div>
                        <div className="flex items-center gap-2">
                            <img src={logo} alt="Romaneio Rápido" className="h-10 w-10 object-contain" />
                            <span className="text-sm font-black text-text-primary">Romaneio Rápido</span>
                        </div>
                        <p className="mt-3 max-w-sm text-xs font-semibold leading-5 text-text-secondary">
                            Sistema web para gestão de estoque, movimentações e romaneios.
                        </p>
                    </div>

                    <div className="grid gap-8 text-xs font-bold text-text-secondary sm:grid-cols-3">
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-text-primary">Navegação</h3>
                            <div className="grid gap-2">
                                <a href="#solucao" className="hover:text-primary">Como funciona</a>
                                <a href="#recursos" className="hover:text-primary">Recursos</a>
                                <a href="#planos" className="hover:text-primary">Planos</a>
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-text-primary">Legal</h3>
                            <div className="grid gap-2">
                                <button onClick={() => navigate('/termos')} className="text-left hover:text-primary">Termos de Uso</button>
                                <button onClick={() => navigate('/privacidade')} className="text-left hover:text-primary">Privacidade</button>
                                <button onClick={() => navigate('/cookies')} className="text-left hover:text-primary">Cookies</button>
                            </div>
                        </div>
                        <div>
                            <h3 className="mb-3 font-black uppercase tracking-[0.08em] text-text-primary">Contato</h3>
                            <div className="grid gap-2">
                                <span className="inline-flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" />
                                    romaneiorapido@gmail.com
                                </span>
                                <a
                                    href={getWhatsAppLink('Olá! Vim pela Landing Page e preciso de suporte.')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-success hover:text-success"
                                >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    WhatsApp Suporte
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto mt-8 max-w-[90rem] border-t border-border px-4 pt-5 text-center text-[11px] font-bold text-text-secondary/70 sm:px-6 lg:px-8">
                    © 2026 Romaneio Rápido
                </div>
            </footer>

            <a
                href={getWhatsAppLink('Olá! Estou na Landing Page e gostaria de falar com o suporte.')}
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-5 right-5 z-[100] inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-success/30 bg-success px-4 text-sm font-black text-card hover:bg-success transition-colors"
                title="Falar com suporte"
            >
                <MessageCircle className="h-5 w-5" />
                Suporte
            </a>
        </div>
    )
}

function LandingWelcomeLoader({ step, isLeaving }: { step: 'fast' | 'welcome'; isLeaving: boolean }) {
    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-card transition-all duration-500 ease-out ${isLeaving ? 'pointer-events-none opacity-0 scale-[1.01]' : 'opacity-100 scale-100'}`}
            role="status"
            aria-live="polite"
            aria-label="Carregando landing page"
        >
            <div className="relative z-10 h-[16rem] w-[min(34rem,90vw)]">
                <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-all duration-500 ${step === 'fast' ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-95 -translate-y-3'}`}>
                    <img src={logo} alt="" className="mb-6 h-14 w-14 object-contain" />
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-text-secondary">Carregando</p>
                    <div className="landing-loader-pass mt-5 h-1 w-full max-w-64 overflow-hidden rounded-xl bg-brand-50" aria-hidden="true">
                        <span className="landing-loader-pass-bar block h-full rounded-xl bg-primary" />
                    </div>
                </div>

                <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center transition-all duration-500 ${step === 'welcome' ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-105 translate-y-4'}`}>
                    <p className="text-[11px] font-black uppercase tracking-[0.08em] text-primary">Romaneio Rapido</p>
                    <h2 className="mt-4 text-5xl font-black leading-none tracking-tight text-text-primary sm:text-7xl">Bem vindo</h2>
                    <span className="mt-7 h-1 w-16 rounded-xl bg-primary" aria-hidden="true" />
                </div>
            </div>
        </div>
    )
}

function RomaneioImagePreview() {
    return (
        <div className="relative mx-auto w-full max-w-[300px] rounded-2xl border border-card/80 bg-card/95 p-3 shadow-[0_24px_55px_rgba(15,23,42,0.18),0_8px_18px_rgba(37,99,235,0.12)] sm:absolute sm:-bottom-8 sm:right-5 sm:w-[20.5rem] sm:max-w-none sm:origin-bottom-right sm:rotate-[0.2deg] sm:backdrop-blur-md sm:shadow-[0_24px_55px_rgba(15,23,42,0.28),0_8px_18px_rgba(37,99,235,0.16)] sm:[transform:translateZ(34px)_rotateX(5deg)_rotateY(-8deg)]">
            <div className="pointer-events-none absolute -inset-2 -z-10 rounded-2xl bg-primary/10 blur-xl" />
            <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-primary shadow-[0_8px_16px_rgba(37,99,235,0.14)]">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black text-text-primary">Romaneio #2481</p>
                        <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-text-secondary/70">Cliente Comercial Alves</p>
                    </div>
                </div>
                <span className="shrink-0 rounded-xl border border-success/20 bg-success/10 px-2 py-1 text-[10px] font-black text-success">
                    Pronto
                </span>
            </div>

            <div className="space-y-1.5">
                {[
                    ['Kit Escritório', '86 un.'],
                    ['Suporte Premium', '24 un.'],
                    ['Caixa Organizadora', '9 un.']
                ].map(([name, quantity]) => (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-2.5 py-2">
                        <span className="truncate text-[11px] font-black text-text-primary">{name}</span>
                        <span className="shrink-0 text-[11px] font-black text-text-primary">{quantity}</span>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-text-secondary/70">Total</span>
                <span className="text-sm font-black text-success">R$ 1.842,00</span>
            </div>
        </div>
    )
}

function PreviewStat({ label, value, icon: Icon, tone, compact = false }: { label: string; value: string; icon: IconType; tone: string; compact?: boolean }) {
    return (
        <div className={`rounded-2xl border border-border bg-card ${compact ? 'p-2.5' : 'p-3 sm:p-4'}`}>
            <div className={`mb-2 flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} items-center justify-center rounded-xl border ${tone}`}>
                <Icon className="h-4 w-4" />
            </div>
            <p className={`${compact ? 'text-base' : 'text-xl sm:text-2xl'} font-black leading-none text-text-primary`}>{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-text-secondary/70">{label}</p>
        </div>
    )
}

function SectionHeader({ label, title, desc }: { label: string; title: string; desc: string }) {
    return (
        <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.08em] text-primary">{label}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{title}</h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-text-secondary sm:text-base">{desc}</p>
        </div>
    )
}

function FeatureCard({ icon: Icon, title, desc, index }: { icon: IconType; title: string; desc: string; index: number }) {
    return (
        <div className="h-full rounded-2xl border border-border bg-card p-5 transition-colors hover:border-brand-200">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-primary">
                    <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-black text-text-secondary/50">0{index}</span>
            </div>
            <h3 className="text-base font-black text-text-primary">{title}</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-text-secondary">{desc}</p>
        </div>
    )
}



