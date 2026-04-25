import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import logo from '../assets/romaneiorapido_logo.png'
import {
    Package,
    BarChart3,
    ScanBarcode,
    ArrowRight,
    Menu,
    X,
    Boxes,
    ClipboardList,
    Truck,
    Mail,
    Shield,
    Zap,
    Globe,
    Star,
    Check,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    MessageCircle
} from 'lucide-react'
import { getWhatsAppLink } from '../constants/contacts'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { PLANS } from '../constants/plans'

export default function LandingPage() {
    const navigate = useNavigate()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [carouselIndex, setCarouselIndex] = useState(0)

    const scrollRef = useRef<HTMLDivElement>(null)
    const visiblePlans = PLANS.filter(p => !p.hidden)

    const nextPlan = () => {
        if (!scrollRef.current || !scrollRef.current.children[0]) return
        const nextIndex = (carouselIndex + 1) % visiblePlans.length
        const cardWidth = (scrollRef.current.children[0] as HTMLElement).offsetWidth + 24
        scrollRef.current.scrollTo({ left: nextIndex * cardWidth, behavior: 'smooth' })
        setCarouselIndex(nextIndex)
    }

    const prevPlan = () => {
        if (!scrollRef.current || !scrollRef.current.children[0]) return
        const prevIndex = (carouselIndex - 1 + visiblePlans.length) % visiblePlans.length
        const cardWidth = (scrollRef.current.children[0] as HTMLElement).offsetWidth + 24
        scrollRef.current.scrollTo({ left: prevIndex * cardWidth, behavior: 'smooth' })
        setCarouselIndex(prevIndex)
    }

    const isHovered = useRef(false)

    // Auto-play (All screens)
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isHovered.current) {
                nextPlan()
            }
        }, 5000)
        return () => clearInterval(interval)
    }, [carouselIndex, visiblePlans.length])


    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)

    const springConfig = { damping: 25, stiffness: 100 }
    const springX = useSpring(mouseX, springConfig)
    const springY = useSpring(mouseY, springConfig)

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e
            const { innerWidth, innerHeight } = window
            mouseX.set((clientX / innerWidth) - 0.5)
            mouseY.set((clientY / innerHeight) - 0.5)
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    }

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden relative">
            
            {/* Background Animated Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div 
                    style={{ x: useTransform(springX, [-0.5, 0.5], [-50, 50]), y: useTransform(springY, [-0.5, 0.5], [-50, 50]) }}
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-blue-100/40 rounded-full blur-[120px]" 
                />
                <motion.div 
                    style={{ x: useTransform(springX, [-0.5, 0.5], [50, -50]), y: useTransform(springY, [-0.5, 0.5], [50, -50]) }}
                    animate={{ 
                        scale: [1.2, 1, 1.2],
                        rotate: [90, 0, 90]
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[20%] -right-[10%] w-[45%] h-[45%] bg-teal-50/50 rounded-full blur-[100px]" 
                />
                <motion.div 
                    style={{ x: useTransform(springX, [-0.5, 0.5], [-30, 30]), y: useTransform(springY, [-0.5, 0.5], [30, -30]) }}
                    animate={{ 
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-indigo-50/40 rounded-full blur-[110px]" 
                />
            </div>

            <div className="relative z-10">
                {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2.5 group">
                        <div className="h-8 flex items-center justify-center">
                            <img src={logo} alt="Logo" className="h-7 object-contain" />
                        </div>
                        <span className="text-lg font-bold text-gray-900">Romaneio<span className="text-blue-600">Rapido</span></span>
                    </a>

                    <div className="hidden md:flex items-center gap-8">
                        <nav className="flex gap-6 text-[13px] font-medium text-gray-500">
                            <a href="#solucao" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-300">Solução</a>
                            <a href="#recursos" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-300">Recursos</a>
                            <a href="#planos" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-300">Planos</a>
                            <a href="#contato" className="hover:text-blue-600 hover:-translate-y-0.5 transition-all duration-300">Contato</a>
                            <a 
                                href={getWhatsAppLink('Olá! Gostaria de tirar algumas dúvidas sobre o Romaneio Rápido.')} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 transition-colors font-bold"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Suporte
                            </a>
                        </nav>
                        <button
                            onClick={() => navigate('/login')}
                            className="text-[13px] font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            Login
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="h-9 px-5 text-[13px] font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                            Experimentar
                        </button>
                    </div>

                    <button className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {isMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <nav className="flex flex-col gap-3 text-sm font-medium text-gray-600">
                            <a href="#solucao" className="active:text-blue-600" onClick={() => setIsMenuOpen(false)}>Solução</a>
                            <a href="#recursos" className="active:text-blue-600" onClick={() => setIsMenuOpen(false)}>Recursos</a>
                            <a href="#planos" className="active:text-blue-600" onClick={() => setIsMenuOpen(false)}>Planos</a>
                            <a href="#contato" className="active:text-blue-600" onClick={() => setIsMenuOpen(false)}>Contato</a>
                        </nav>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => navigate('/login')} className="flex-1 h-10 text-sm font-medium border border-gray-200 rounded-lg text-gray-700 active:bg-gray-50 transition-colors">Login</button>
                            <button onClick={() => navigate('/cadastro')} className="flex-1 h-10 text-sm font-semibold bg-blue-600 text-white rounded-lg active:scale-95 transition-all">Experimentar</button>
                        </div>
                    </div>
                )}
            </header>

            <main>
                {/* Hero - Split Layout */}
                <section className="pt-32 pb-20 md:pt-40 md:pb-28">
                    <div className="max-w-6xl mx-auto px-5">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            {/* Texto */}
                            <motion.div 
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: 0.2 }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6 hover:-translate-y-1 transition-transform cursor-default"
                                >
                                    <Star className="w-3 h-3 fill-blue-600 animate-pulse" />
                                    Sistema ERP para Estoque
                                </motion.div>

                                <motion.h1 
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: 0.3 }}
                                    className="text-4xl md:text-[3.25rem] font-extrabold text-gray-900 leading-[1.15] mb-5 tracking-tight"
                                >
                                    Gerencie seu estoque
                                    <br />
                                    <span className="text-blue-600 inline-block">sem complicação</span>
                                </motion.h1>

                                <motion.p 
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: 0.4 }}
                                    className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md"
                                >
                                    Controle total do inventário com leitura de código de barras,
                                    interface rápida como planilha e relatórios em tempo real.
                                </motion.p>

                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.8, delay: 0.5 }}
                                    className="flex flex-col sm:flex-row gap-3 mb-8"
                                >
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="group h-12 px-7 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:scale-105 transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2"
                                    >
                                        Acessar Sistema <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                    <a
                                        href="#planos"
                                        className="h-12 px-7 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        Ver Planos e Preços
                                    </a>
                                </motion.div>

                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    whileInView={{ opacity: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                    className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-400 font-medium"
                                >
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> 100% Web
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-75"></div> Sem instalação
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150"></div> Código de barras
                                    </span>
                                </motion.div>
                            </motion.div>

                            {/* Mockup Visual - Mais Premium */}
                            <div className="relative group animate-in fade-in zoom-in-95 duration-1000 delay-500 fill-mode-both">
                                <div className="absolute -inset-10 bg-blue-500/10 rounded-full blur-[120px] -z-10 group-hover:bg-blue-500/20 transition-all duration-700"></div>
                                <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl border border-slate-800 transform group-hover:rotate-1 group-hover:scale-[1.02] transition-all duration-700 hover:shadow-blue-500/20">
                                    <div className="bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden">
                                        {/* Interface Header */}
                                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 flex items-center justify-center">
                                                    <img src={logo} alt="Logo" className="h-8 object-contain" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-gray-900 block leading-tight">Painel Principal</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Romaneio v2.4</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>)}
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Stats Premium */}
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { label: 'Estoque', value: '1.2k', icon: Boxes, color: 'text-blue-600' },
                                                    { label: 'Hoje', value: '+42', icon: Truck, color: 'text-emerald-600' },
                                                    { label: 'Alertas', value: '3', icon: AlertTriangle, color: 'text-orange-500' },
                                                ].map((s, i) => (
                                                    <div key={i} className="bg-gray-50 rounded-2xl p-4 border border-transparent hover:border-gray-200 transition-all cursor-default">
                                                        <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                                                        <p className="text-xl font-black text-gray-900 leading-tight">{s.value}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Carrinho Mockup */}
                                            <div className="space-y-3">
                                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] ml-1">Último Romaneio</p>
                                                {[
                                                    { n: 'Cabo USB-C Premium', q: '50un', p: 'R$ 890,00', s: 'ok' },
                                                    { n: 'Adaptador HDMI 4K', q: '12un', p: 'R$ 420,00', s: 'low' },
                                                ].map((r, i) => (
                                                    <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                                <Package className="w-5 h-5 text-gray-300" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-gray-900">{r.n}</p>
                                                                <p className="text-[10px] font-bold text-gray-400">{r.q}</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-black text-blue-600">{r.p}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Solução - Features Reais */}
                <section id="solucao" className="py-24 bg-gray-50/60 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
                    <div className="max-w-6xl mx-auto px-5">
                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            className="text-center mb-20"
                        >
                            <motion.h2 variants={itemVariants} className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">A Experiência RomaneioRapido</motion.h2>
                            <motion.h3 variants={itemVariants} className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Tudo o que você precisa para <span className="text-blue-600">vender mais rápido</span>
                            </motion.h3>
                        </motion.div>

                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.3 }}
                            className="grid md:grid-cols-2 gap-8"
                        >
                            {[
                                {
                                    icon: ScanBarcode,
                                    title: 'Bipou, Vendeu.',
                                    desc: 'Suporte nativo para leitores de código de barras USB e Câmera. Agilidade extrema na hora de montar seus pedidos de saída.',
                                    accent: 'bg-blue-50 text-blue-600'
                                },
                                {
                                    icon: ClipboardList,
                                    title: 'Romaneio Inteligente',
                                    desc: 'Gere romaneios profissionais em segundos. Exporte para WhatsApp ou PDF e mantenha seus clientes informados com um clique.',
                                    accent: 'bg-emerald-50 text-emerald-600'
                                },
                                {
                                    icon: Boxes,
                                    title: 'Histórico Imutável',
                                    desc: 'Nossa tecnologia de "Snapshots" garante que seu histórico de vendas não mude, mesmo se você alterar o nome ou preço do produto depois.',
                                    accent: 'bg-indigo-50 text-indigo-600'
                                },
                                {
                                    icon: BarChart3,
                                    title: 'Gestão de Estoque Vivo',
                                    desc: 'Alertas automáticos de estoque baixo e visão clara de entradas e saídas. Controle total para nunca deixar faltar mercadoria.',
                                    accent: 'bg-amber-50 text-amber-600'
                                },
                            ].map((item, i) => (
                                <motion.div
                                    key={i}
                                    variants={itemVariants}
                                    className="bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-10 hover:shadow-2xl hover:shadow-blue-600/5 hover:-translate-y-1 transition-all duration-500 group"
                                >
                                    <div className={`w-16 h-16 rounded-3xl ${item.accent} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                                        <item.icon className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 mb-4">{item.title}</h4>
                                    <p className="text-gray-500 leading-relaxed text-lg">{item.desc}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </section>

                {/* Recursos - Grid Moderno */}
                <section id="recursos" className="py-24 bg-white relative overflow-hidden">
                    <div className="max-w-6xl mx-auto px-5">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Potência total em cada detalhe</h2>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                { icon: ScanBarcode, title: 'BIP USB & Câmera', desc: 'Compatível com qualquer leitor' },
                                { icon: ClipboardList, title: 'Cadastro Inteligente', desc: 'Fichas técnicas completas' },
                                { icon: Truck, title: 'Movimentação Ágil', desc: 'Entradas e saídas sem fricção' },
                                { icon: BarChart3, title: 'Dashboard Premium', desc: 'Dados visuais de alta carga' },
                                { icon: Shield, title: 'Snapshots Imutáveis', desc: 'Segurança total no histórico' },
                                { icon: Globe, title: 'Acesso Nuvem', desc: 'Sincronização em tempo real' },
                                { icon: Zap, title: 'Performance 60FPS', desc: 'Interface fluida e responsiva' },
                                { icon: Boxes, title: 'Multi-Categorias', desc: 'Organização estruturada' },
                                { icon: Star, title: 'UX de Elite', desc: 'Focado na experiência do usuário' },
                            ].map((r, i) => (
                                <div
                                    key={i}
                                    className="p-6 rounded-3xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all duration-300 group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-4 transition-all duration-300">
                                        <r.icon className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 mb-1">{r.title}</h4>
                                    <p className="text-xs text-gray-400 font-medium leading-relaxed">{r.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>


                {/* Planos */}
                <section id="planos" className="py-24 bg-white">
                    <div className="max-w-6xl mx-auto px-5">
                        <div className="text-center mb-16">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Preços</p>
                            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
                                Escolha o plano ideal para você
                            </h2>
                            <p className="text-gray-500 max-w-2xl mx-auto">
                                Sem taxas escondidas. Cancele quando quiser ou comece com nosso teste limitado.
                            </p>
                        </div>

                        {/* Unified Carousel for all screens */}
                        <div 
                            className="relative group/carousel px-4 md:px-0" 
                            role="region" 
                            aria-label="Planos de Assinatura"
                            onMouseEnter={() => isHovered.current = true}
                            onMouseLeave={() => isHovered.current = false}
                        >
                            {/* Navigation Arrows - Desktop/Premium Only */}
                            <button
                                onClick={prevPlan}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-12 z-30 w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 shadow-xl transition-all opacity-0 group-hover/carousel:opacity-100 active:scale-90"
                                aria-label="Plano anterior"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>

                            <button
                                onClick={nextPlan}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-12 z-30 w-12 h-12 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 shadow-xl transition-all opacity-0 group-hover/carousel:opacity-100 active:scale-90"
                                aria-label="Próximo plano"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>

                            <div 
                                ref={scrollRef}
                                className="flex overflow-x-auto gap-6 pt-10 pb-12 snap-x snap-mandatory scroll-smooth no-scrollbar"
                                role="list"
                                onScroll={(e) => {
                                    const target = e.currentTarget;
                                    const firstCard = target.children[0] as HTMLElement;
                                    if (firstCard) {
                                        const cardWidth = firstCard.offsetWidth + 24;
                                        const index = Math.round(target.scrollLeft / cardWidth);
                                        if (index !== carouselIndex) setCarouselIndex(index);
                                    }
                                }}
                            >
                                {visiblePlans.map((plan, i) => (
                                    <div
                                        key={i}
                                        role="listitem"
                                        aria-label={`Plano ${plan.name}`}
                                        className={`relative w-[280px] md:w-[320px] p-6 md:p-10 rounded-[32px] border transition-all duration-300 flex-shrink-0 snap-center flex flex-col h-full ${plan.highlight
                                            ? 'border-blue-600 shadow-xl shadow-blue-600/10 z-10 bg-white ring-1 ring-blue-100'
                                            : 'border-slate-100 bg-gray-50/40 hover:bg-white hover:border-blue-200 hover:shadow-lg'
                                            }`}
                                    >
                                        {plan.highlight && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-blue-600/30 whitespace-nowrap z-20">
                                                Destaque
                                            </div>
                                        )}

                                        <div className="mb-8">
                                            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{plan.name}</h3>
                                            <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[48px]">{plan.description}</p>
                                        </div>

                                        <div className="flex items-baseline gap-1.5 mb-10">
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                                            {plan.period && <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest">{plan.period}</span>}
                                        </div>

                                        <button
                                            onClick={() => navigate('/cadastro')}
                                            className={`w-full py-4.5 rounded-2xl font-black text-sm transition-all duration-300 mb-10 active:scale-95 ${plan.highlight
                                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-600/30'
                                                : 'bg-slate-900 text-white hover:bg-blue-600 shadow-lg shadow-slate-200'
                                                }`}
                                        >
                                            Começar Agora
                                        </button>

                                        <div className="space-y-4.5 mt-auto">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Recursos inclusos:</p>
                                            {plan.features.map((feature, j) => (
                                                <div key={j} className="flex items-start gap-3.5 group/feat">
                                                    <div className="w-5.5 h-5.5 rounded-full bg-blue-50/50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover/feat:bg-blue-600 transition-colors">
                                                        <Check className="w-3 h-3 text-blue-600 group-hover/feat:text-white" />
                                                    </div>
                                                    <span className="text-[13px] text-slate-600 font-semibold leading-snug group-hover/feat:text-slate-900 transition-colors">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Enhanced Dots Indicator */}
                            <div className="flex justify-center items-center gap-3 mt-6">
                                {visiblePlans.map((_, i) => (
                                    <button 
                                        key={i}
                                        aria-label={`Ver plano ${i + 1}`}
                                        aria-current={carouselIndex === i ? 'true' : 'false'}
                                        onClick={() => {
                                            if (scrollRef.current && scrollRef.current.children[0]) {
                                                const cardWidth = (scrollRef.current.children[0] as HTMLElement).offsetWidth + 24;
                                                scrollRef.current?.scrollTo({ left: i * cardWidth, behavior: 'smooth' });
                                            }
                                        }}
                                        className={`h-2 rounded-full transition-all duration-500 ${carouselIndex === i ? 'w-10 bg-blue-600 shadow-lg shadow-blue-600/20' : 'w-2 bg-slate-200 hover:bg-slate-300'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA - Premium Dark Section */}
                <section className="py-24 bg-white">
                    <div className="max-w-5xl mx-auto px-5">
                        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden shadow-2xl shadow-blue-900/20">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>

                            <div className="relative z-10 text-center">
                                <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">
                                    Simplifique seu estoque <span className="text-blue-500">agora mesmo</span>
                                </h2>
                                <p className="text-slate-400 mb-10 max-w-lg mx-auto text-lg font-medium leading-relaxed">
                                    Junte-se a centenas de empresas que já transformaram sua logística com o RomaneioRapido.
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                    <button
                                        onClick={() => navigate('/cadastro')}
                                        className="w-full sm:w-auto h-14 px-10 text-base font-black bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/40 flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        Começar Gratuitamente <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer id="contato" className="border-t border-gray-100 py-12">
                    <div className="max-w-6xl mx-auto px-5">
                        <div className="flex flex-col md:flex-row justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-2.5 mb-3">
                                    <div className="h-7 flex items-center justify-center">
                                        <img src={logo} alt="Logo" className="h-6 object-contain" />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">RomaneioRapido</span>
                                </div>
                                <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                                    Sistema de gestão de estoque para empresas que querem crescer com organização e eficiência.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-12">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Navegação</h4>
                                    <ul className="space-y-2 text-xs text-gray-400">
                                        <li><a href="#solucao" className="hover:text-gray-700 transition-colors">Solução</a></li>
                                        <li><a href="#recursos" className="hover:text-gray-700 transition-colors">Recursos</a></li>
                                        <li><button onClick={() => navigate('/login')} className="hover:text-gray-700 transition-colors">Entrar</button></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Termos e Políticas</h4>
                                    <ul className="space-y-2 text-xs text-gray-400">
                                        <li><button onClick={() => navigate('/termos')} className="hover:text-gray-700 transition-colors">Termos de Uso</button></li>
                                        <li><button onClick={() => navigate('/privacidade')} className="hover:text-gray-700 transition-colors">Política de Privacidade</button></li>
                                        <li><button onClick={() => navigate('/cookies')} className="hover:text-gray-700 transition-colors">Cookies</button></li>
                                    </ul>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>romaneiorapido@gmail.com</span>
                                    </div>
                                    <a 
                                        href={getWhatsAppLink('Olá! Vim pela Landing Page e preciso de suporte.')}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
                                    >
                                        <MessageCircle className="w-3.5 h-3.5" />
                                        <span>WhatsApp Suporte</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 pt-6 border-t border-gray-100 text-[11px] text-gray-300 text-center">
                            © 2026 RomaneioRapido
                        </div>
                    </div>
                </footer>
            </main>
            </div>

            {/* Floating WhatsApp Button */}
            <motion.a
                href={getWhatsAppLink('Olá! Estou na Landing Page e gostaria de falar com o suporte.')}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.9 }}
                className="fixed bottom-6 right-6 z-[100] w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 border-2 border-white hover:bg-emerald-600 transition-colors group"
                title="Falar com Suporte"
            >
                <MessageCircle className="w-7 h-7" />
                <span className="absolute right-full mr-4 px-4 py-2 bg-white text-slate-800 text-xs font-black rounded-xl shadow-xl border border-slate-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest">
                    Suporte WhatsApp
                </span>
            </motion.a>
        </div>
    )
}
