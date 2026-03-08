import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
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
    AlertTriangle
} from 'lucide-react'
import { PLANS } from '../constants/plans'

export default function LandingPage() {
    const navigate = useNavigate()
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">

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
                            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-6 animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-both hover:-translate-y-1 transition-transform cursor-default">
                                    <Star className="w-3 h-3 fill-blue-600 animate-pulse" />
                                    Sistema ERP para Estoque
                                </div>

                                <h1 className="text-4xl md:text-[3.25rem] font-extrabold text-gray-900 leading-[1.15] mb-5 tracking-tight">
                                    Gerencie seu estoque
                                    <br />
                                    <span className="text-blue-600 inline-block animate-in fade-in slide-in-from-left-4 duration-1000 delay-500 fill-mode-both">sem complicação</span>
                                </h1>

                                <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md animate-in fade-in duration-1000 delay-700 fill-mode-both">
                                    Controle total do inventário com leitura de código de barras,
                                    interface rápida como planilha e relatórios em tempo real.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000 fill-mode-both">
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
                                </div>

                                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-400 font-medium animate-in fade-in duration-1000 delay-1000 fill-mode-both">
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> 100% Web
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse delay-75"></div> Sem instalação
                                    </span>
                                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-150"></div> Código de barras
                                    </span>
                                </div>
                            </div>

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
                        <div className="text-center mb-20">
                            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">A Experiência RomaneioRapido</h2>
                            <h3 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Tudo o que você precisa para <span className="text-blue-600">vender mais rápido</span>
                            </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
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
                                <div
                                    key={i}
                                    className="bg-white rounded-[2.5rem] border border-gray-100 p-8 md:p-10 hover:shadow-2xl hover:shadow-blue-600/5 hover:-translate-y-1 transition-all duration-500 group"
                                >
                                    <div className={`w-16 h-16 rounded-3xl ${item.accent} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                                        <item.icon className="w-8 h-8" />
                                    </div>
                                    <h4 className="text-2xl font-black text-gray-900 mb-4">{item.title}</h4>
                                    <p className="text-gray-500 leading-relaxed text-lg">{item.desc}</p>
                                </div>
                            ))}
                        </div>
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

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {PLANS.filter(p => !p.hidden).map((plan, i) => (
                                <div
                                    key={i}
                                    className={`relative p-8 rounded-[24px] border transition-all duration-300 ${plan.highlight
                                        ? 'border-blue-600 shadow-xl shadow-blue-600/10 scale-105 z-10 bg-white'
                                        : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                                        }`}
                                >
                                    {plan.highlight && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                            Mais Popular
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed min-h-[40px]">{plan.description}</p>
                                    </div>

                                    <div className="flex items-baseline gap-1 mb-8">
                                        <span className="text-4xl font-extrabold text-gray-900">{plan.price}</span>
                                        {plan.period && <span className="text-gray-400 font-medium">{plan.period}</span>}
                                    </div>

                                    <button
                                        onClick={() => navigate('/cadastro')}
                                        className={`w-full py-4 rounded-[10px] font-bold text-sm transition-all duration-200 mb-8 ${plan.highlight
                                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                                            : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        Começar Agora
                                    </button>

                                    <div className="space-y-4">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">O que está incluso:</p>
                                        {plan.features.map((feature, j) => (
                                            <div key={j} className="flex items-center gap-3">
                                                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-3 h-3 text-blue-600" />
                                                </div>
                                                <span className="text-sm text-gray-600">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
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

                            <div className="flex gap-12">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Navegação</h4>
                                    <ul className="space-y-2 text-xs text-gray-400">
                                        <li><a href="#solucao" className="hover:text-gray-700 transition-colors">Solução</a></li>
                                        <li><a href="#recursos" className="hover:text-gray-700 transition-colors">Recursos</a></li>
                                        <li><button onClick={() => navigate('/login')} className="hover:text-gray-700 transition-colors">Entrar</button></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Contato</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>contato@romaneiorapido.com.br</span>
                                    </div>
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
    )
}
