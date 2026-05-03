import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'react-hot-toast'
import logo from '@/assets/romaneiorapido_logo.png'
import {
    LayoutDashboard,
    Boxes,
    Tags,
    ClipboardList,
    LogOut,
    Menu,
    X,
    Users,
    User,
    ChevronLeft,
    ChevronRight,
    ArrowRightLeft,
    Clock,
    ShieldCheck,
    AlertTriangle,
    LifeBuoy
} from 'lucide-react'
import { getWhatsAppLink } from '@/constants/contacts'
import { WhatsAppIcon } from '@/assets/WhatsAppIcon'
import { useState, useEffect } from 'react'
import TrialExpiredBanner from '@/components/TrialExpiredBanner'
import PaymentFailedBanner from '@/components/PaymentFailedBanner'
import { useSubscription } from '@/hooks/useSubscription'
import PlansGrid from '@/components/PlansGrid'

const navItems = [
    { to: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    { to: '/romaneio', label: 'Romaneio', icon: ClipboardList },
    { to: '/movimentacoes', label: 'Movimentações', icon: ArrowRightLeft },
    { to: '/produtos', label: 'Produtos', icon: Boxes },
    { to: '/categorias', label: 'Categorias', icon: Tags },
    { to: '/clientes', label: 'Clientes', icon: Users },
]

export default function AppLayout() {
    const { user, logout, refreshUser } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const { isSubscribing, handleSubscribe } = useSubscription()

    const subscriptionStatus = user?.subscription_status || 'active'
    
    // Bypass total para admin ou unlimited
    const hasFullAccess = user?.is_admin || user?.is_unlimited || user?.plan_id === 'unlimited'
    
    // Bypass para acesso manual (plano premium sem Stripe ID)
    const isManualPremium = user?.plan_id !== 'trial' && !user?.stripe_subscription_id

    const isTrialLocked = user?.plan_id === 'trial' && user?.trial_expired && !hasFullAccess
    const isUnpaidLocked = subscriptionStatus === 'unpaid' && !hasFullAccess && !isManualPremium
    
    const isLockEnabled = isTrialLocked || isUnpaidLocked

    // Bloqueio de navegação forçada e refresh de status
    useEffect(() => {
        // Refresh status para garantir que expirou mesmo
        refreshUser()

        if (isLockEnabled && window.location.pathname !== '/perfil') {
            navigate('/perfil?tab=subscription', { replace: true })
        }
    }, [isLockEnabled, navigate, window.location.pathname])

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const handleMobileMenuNavigate = (to: string) => {
        if (isLockEnabled && to !== '/perfil') {
            toast.error(
                isUnpaidLocked
                    ? 'Sua assinatura está suspensa. Regularize o pagamento.'
                    : 'Seu teste expirou. Assine um plano para continuar.'
            )
            return
        }
        navigate(to)
        setMobileMenuOpen(false)
    }

    return (
        <div className="min-h-screen bg-background flex transition-colors duration-500">
            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col
        transform transition-all duration-300 ease-in-out md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
                {/* Collapse Toggle Button (Desktop) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center text-text-secondary hover:text-brand-600 shadow-sm z-[60] transition-colors"
                    title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>

                {/* Logo */}
                <div 
                    className={`h-16 flex items-center group cursor-pointer transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6 gap-3'}`} 
                    onClick={() => {
                        if (isLockEnabled) {
                            navigate('/perfil?tab=subscription')
                        } else {
                            navigate('/dashboard')
                        }
                    }}
                >
                    <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-auto h-10'}`}>
                        <img
                            src={logo}
                            alt="RomaneioRápido"
                            className={`transition-all duration-300 object-contain ${isCollapsed ? 'h-12 w-12' : 'h-12'}`}
                        />
                    </div>
                    {!isCollapsed && (
                        <span className="text-base font-bold text-text-primary tracking-tight whitespace-nowrap animate-in fade-in duration-300">
                            Romaneio<span className="text-brand-600"> Rápido</span>
                        </span>
                    )}
                    <button className="md:hidden ml-auto p-2 text-text-secondary hover:text-text-secondary hover:bg-border/50 rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    {[
                        ...navItems,
                        ...(user?.is_admin ? [{ to: '/super-admin', label: 'Gerenciamento', icon: ShieldCheck }] : [])
                    ].map((item) => {
                        // Se o bloqueio estiver ativo, TUDO exceto perfil é desabilitado
                        const isDisabled = isLockEnabled && item.to !== '/perfil'
                        
                        return (
                            <NavLink
                                key={item.to}
                                to={isDisabled ? '#' : item.to}
                                onClick={(e) => {
                                    if (isDisabled) {
                                        e.preventDefault()
                                        toast.error(
                                            isUnpaidLocked
                                                ? 'Sua assinatura está suspensa. Regularize o pagamento.'
                                                : 'Seu teste expirou. Assine um plano para continuar.'
                                        )
                                        return
                                    }
                                    setSidebarOpen(false)
                                }}
                                title={isCollapsed ? item.label : ""}
                                className={({ isActive }) =>
                                    `flex items-center rounded-xl text-[14px] font-semibold transition-all duration-200 group ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} 
                                    ${isActive
                                        ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100/50'
                                        : isDisabled 
                                            ? 'text-text-secondary/60 cursor-not-allowed opacity-50' 
                                            : 'text-text-secondary hover:text-text-primary hover:bg-background/80'
                                    }`
                                }
                            >
                                <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${sidebarOpen ? 'animate-in fade-in slide-in-from-left-2' : ''}`} />
                                {!isCollapsed && (
                                    <div className="flex-1 flex items-center justify-between min-w-0">
                                        <span className="whitespace-nowrap animate-in fade-in duration-300 truncate">{item.label}</span>
                                        {isDisabled && <ShieldCheck className="w-3.5 h-3.5 text-text-secondary/60" />}
                                    </div>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Trial Badge/Lock */}
                {user?.plan_id === 'trial' && (
                    <div className={`mx-3 mb-2 ${isCollapsed ? 'px-1' : 'px-3'}`}>
                        <div className={`flex items-center gap-2 rounded-xl transition-all ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2'} ${user.trial_expired
                            ? 'bg-error/10 border border-error/30/60 text-error'
                            : 'bg-warning/10 border border-warning/30/60 text-warning'
                            }`}>
                            {user.trial_expired ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
                            {!isCollapsed && (
                                <span className="text-xs font-bold whitespace-nowrap">
                                    {user.trial_expired 
                                        ? 'Trial Expirado' 
                                        : `Teste: ${user.trial_days_remaining ?? 0} ${(user.trial_days_remaining ?? 0) === 1 ? 'dia' : 'dias'}`
                                    }
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Payment Pending Badge */}
                {subscriptionStatus === 'past_due' && (
                    <div className={`mx-3 mb-2 ${isCollapsed ? 'px-1' : 'px-3'}`}>
                        <div className={`flex items-center gap-2 rounded-xl transition-all ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2'} bg-warning/10 border border-warning/30/60 text-warning`}>
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            {!isCollapsed && (
                                <span className="text-xs font-bold whitespace-nowrap">Pgto. Pendente</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Unpaid Lock Badge */}
                {isUnpaidLocked && (
                    <div className={`mx-3 mb-2 ${isCollapsed ? 'px-1' : 'px-3'}`}>
                        <div className={`flex items-center gap-2 rounded-xl transition-all ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2'} bg-error/10 border border-error/30/60 text-error`}>
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            {!isCollapsed && (
                                <span className="text-xs font-bold whitespace-nowrap">Acesso Suspenso</span>
                            )}
                        </div>
                    </div>
                )}

                {/* User */}
                <div className={`py-5 border-t border-border/50 bg-background/30 transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    <div
                        onClick={() => { navigate('/perfil'); setSidebarOpen(false) }}
                        title={isCollapsed ? "Meu Perfil" : ""}
                        className={`flex items-center mb-4 cursor-pointer group transition-all rounded-xl hover:bg-card border border-transparent hover:border-brand-100 hover:shadow-sm ${isCollapsed ? 'justify-center px-0 p-2' : 'gap-3 px-3 py-2'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 overflow-hidden shrink-0 border-2 border-card shadow-sm group-hover:scale-105 transition-transform">
                            {user?.photo_base64 ? <img src={user.photo_base64} alt="Avatar" className="w-full h-full object-cover" /> : user?.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                                <p className="text-sm font-bold text-text-primary truncate leading-none mb-1 group-hover:text-brand-600 transition-colors">{user?.full_name}</p>
                                <p className="text-[11px] font-medium text-text-secondary truncate uppercase tracking-wider">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    <a
                        href={getWhatsAppLink('Olá! Preciso de suporte com o Romaneio Rápido.')}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isCollapsed ? "Suporte WhatsApp" : ""}
                        className={`flex items-center w-full text-[13px] font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-all border border-transparent hover:border-brand-100 mb-2 ${isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}`}
                    >
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">Suporte WhatsApp</span>}
                    </a>
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Sair" : ""}
                        className={`flex items-center w-full text-[13px] font-semibold text-error hover:text-error hover:bg-error/10/50 rounded-xl transition-all border border-transparent hover:border-error/20 ${isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}`}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">Sair</span>}
                    </button>
                </div>
            </aside >

            {/* Overlay mobile */}
            {
                sidebarOpen && (
                    <div className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
                )
            }

            {/* Main */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                {/* Top bar mobile */}
                <header className="md:hidden h-14 bg-card/90 backdrop-blur-md border border-border rounded-2xl mx-2 mt-2 px-2 flex items-center justify-between sticky top-3 z-30">
                    <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => {
                        if (isLockEnabled) {
                            navigate('/perfil?tab=subscription')
                        } else {
                            navigate('/dashboard')
                        }
                    }}>
                        <div className="h-8 flex items-center justify-center">
                            <img src={logo} alt="Logo" className="h-12 object-contain" />
                        </div>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="w-9 h-9 flex items-center justify-center text-text-secondary hover:bg-border/50 rounded-lg transition-colors"
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </header>

                {mobileMenuOpen && (
                    <div className="fixed inset-0 z-50 md:hidden">
                        <div
                            className="absolute inset-0 bg-text-primary/30"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <div className="absolute inset-x-3 top-20 bottom-auto max-h-[78vh] bg-card border border-border rounded-2xl overflow-visible flex flex-col z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 origin-top-right">
                            <div
                                className="absolute -top-1.5 right-4 w-3 h-3 bg-card border-t border-l border-border rotate-45 pointer-events-none"
                                aria-hidden="true"
                            />
                            <div className="rounded-2xl overflow-hidden flex flex-col bg-card">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-600 overflow-hidden shrink-0">
                                        {user?.photo_base64 ? (
                                            <img src={user.photo_base64} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            user?.full_name?.charAt(0)?.toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-bold text-text-primary truncate">{user?.full_name || 'Conta'}</p>
                                        <p className="text-[11px] font-semibold text-text-secondary truncate">Menu</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-9 h-9 flex items-center justify-center text-text-secondary hover:bg-border/50 rounded-lg transition-colors"
                                    aria-label="Fechar menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4 p-5 flex-1 content-start">
                                {navItems.map((item) => {
                                    const isDisabled = isLockEnabled && item.to !== '/perfil'
                                    return (
                                        <button
                                            key={item.to}
                                            onClick={() => handleMobileMenuNavigate(item.to)}
                                            disabled={isDisabled}
                                            className={`flex flex-col items-center gap-2 px-2 py-5 rounded-2xl border text-center transition-all min-h-[6.25rem] ${isDisabled
                                                ? 'border-border text-text-secondary/60'
                                                : 'border-border text-text-secondary hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50'
                                                }`}
                                        >
                                            <item.icon className="w-5 h-5" />
                                            <span className="text-[11px] font-semibold">{item.label}</span>
                                        </button>
                                    )
                                })}
                                <button
                                    onClick={() => handleMobileMenuNavigate('/perfil')}
                                    className="flex flex-col items-center gap-2 px-2 py-5 rounded-2xl border border-border text-text-secondary hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50 transition-all min-h-[6.25rem] col-start-2"
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-[11px] font-semibold">Perfil</span>
                                </button>
                            </div>

                            <div className="p-4 grid grid-cols-2 gap-2">
                                <a
                                    href={getWhatsAppLink('Olá! Preciso de suporte com o Romaneio Rápido.')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-border text-text-secondary hover:border-brand-200 hover:text-brand-700 hover:bg-brand-50/50 transition-all text-xs font-semibold"
                                >
                                    <LifeBuoy className="w-4 h-4" />
                                    Suporte
                                </a>
                                <button
                                    onClick={() => {
                                        setMobileMenuOpen(false)
                                        handleLogout()
                                    }}
                                    className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-error/20 bg-error/10/60 text-error hover:border-error/30 hover:text-error hover:bg-error/20/70 transition-all text-xs font-semibold"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sair
                                </button>
                            </div>
                            </div>
                        </div>
                    </div>
                )}

                <main className="flex-1 p-3 sm:p-4 md:p-8 lg:p-10">
                    {/* Bloqueio estrito de renderização de conteúdo se as condições de lock forem atendidas */}
                    {isLockEnabled && window.location.pathname !== '/perfil' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                             <div className="w-20 h-20 rounded-[2.5rem] bg-error/10 flex items-center justify-center text-error mb-4 border border-error/20 shadow-xl shadow-red-500/10">
                                <ShieldCheck className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-text-primary leading-tight">
                                {isUnpaidLocked ? 'Assinatura Suspensa' : 'Acesso Bloqueado'}
                            </h2>
                            <p className="text-text-secondary font-semibold max-w-sm">
                                {isUnpaidLocked 
                                    ? 'Sua assinatura foi suspensa por falta de pagamento. Atualize seu método de pagamento para restaurar o acesso.'
                                    : 'Seu período de teste gratuito expirou. Escolha um plano abaixo para continuar usando o RomaneioRápido sem interrupções.'
                                }
                            </p>
                            
                            <div className="w-full max-w-5xl mt-8 pb-12 overflow-y-auto no-scrollbar" style={{ maxHeight: '60vh' }}>
                                <PlansGrid 
                                    effectivePlanId={user?.plan_id || 'trial'}
                                    isSubscribing={isSubscribing}
                                    handleSubscribe={handleSubscribe}
                                />
                            </div>
                            <div className="w-12 h-1.5 bg-border/50 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-600 animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
                            </div>
                        </div>
                    ) : (
                        <Outlet />
                    )}
                </main>
            </div>

            {/* Payment Failed Banner (top bar for past_due) */}
            <PaymentFailedBanner />

            {/* Trial Expired Banner (overlay) */}
            <TrialExpiredBanner />
        </div >
    )
}
