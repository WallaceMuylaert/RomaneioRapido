import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
    Package,
    LayoutDashboard,
    Boxes,
    Tags,
    ClipboardList,
    LogOut,
    Menu,
    X,
    Users,
    ChevronLeft,
    ChevronRight,
    ArrowRightLeft,
    Clock
} from 'lucide-react'
import { useState } from 'react'
import TrialExpiredBanner from './TrialExpiredBanner'

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/romaneio', label: 'Romaneio', icon: ClipboardList },
    { to: '/movimentacoes', label: 'Movimentações', icon: ArrowRightLeft },
    { to: '/produtos', label: 'Produtos', icon: Boxes },
    { to: '/categorias', label: 'Categorias', icon: Tags },
    { to: '/clientes', label: 'Clientes', icon: Users },
]

export default function AppLayout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [isCollapsed, setIsCollapsed] = useState(false)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-slate-50/50 flex transition-colors duration-500">
            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white/80 backdrop-blur-xl border-r border-slate-100 flex flex-col
        shadow-[20px_0_40px_rgba(0,0,0,0.02)]
        transform transition-all duration-300 ease-in-out md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
                {/* Collapse Toggle Button (Desktop) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-100 rounded-full items-center justify-center text-slate-400 hover:text-brand-600 shadow-sm z-[60] transition-colors"
                    title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                    {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>

                {/* Logo */}
                <div className={`h-16 flex items-center border-b border-slate-100/50 group cursor-pointer transition-all ${isCollapsed ? 'justify-center px-0' : 'px-6 gap-3'}`} onClick={() => navigate('/dashboard')}>
                    <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-brand-500/20 shrink-0">
                        <Package className="w-4 h-4 text-white" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap animate-in fade-in duration-300">
                            Romaneio<span className="text-brand-600">Rapido</span>
                        </span>
                    )}
                    <button className="md:hidden ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" onClick={() => setSidebarOpen(false)}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav */}
                <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setSidebarOpen(false)}
                            title={isCollapsed ? item.label : ""}
                            className={({ isActive }) =>
                                `flex items-center rounded-xl text-[14px] font-semibold transition-all duration-200 group ${isCollapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'} ${isActive
                                    ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100/50'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
                                }`
                            }
                        >
                            <item.icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${sidebarOpen ? 'animate-in fade-in slide-in-from-left-2' : ''}`} />
                            {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">{item.label}</span>}
                        </NavLink>
                    ))}
                </nav>

                {/* Trial Badge */}
                {user?.plan_id === 'trial' && !user?.trial_expired && (
                    <div className={`mx-3 mb-2 ${isCollapsed ? 'px-1' : 'px-3'}`}>
                        <div className={`flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-700 ${isCollapsed ? 'justify-center p-2' : 'px-3 py-2'}`}>
                            <Clock className="w-4 h-4 shrink-0" />
                            {!isCollapsed && (
                                <span className="text-xs font-bold whitespace-nowrap">
                                    Trial: {user.trial_days_remaining ?? 0} {(user.trial_days_remaining ?? 0) === 1 ? 'dia' : 'dias'}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* User */}
                <div className={`py-5 border-t border-slate-100/50 bg-slate-50/30 transition-all ${isCollapsed ? 'px-2' : 'px-4'}`}>
                    <div
                        onClick={() => { navigate('/perfil'); setSidebarOpen(false) }}
                        title={isCollapsed ? "Meu Perfil" : ""}
                        className={`flex items-center mb-4 cursor-pointer group transition-all rounded-xl hover:bg-white border border-transparent hover:border-brand-100 hover:shadow-sm ${isCollapsed ? 'justify-center px-0 p-2' : 'gap-3 px-3 py-2'}`}
                    >
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-600 overflow-hidden shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                            {user?.photo_base64 ? <img src={user.photo_base64} alt="Avatar" className="w-full h-full object-cover" /> : user?.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                                <p className="text-sm font-bold text-slate-800 truncate leading-none mb-1 group-hover:text-brand-600 transition-colors">{user?.full_name}</p>
                                <p className="text-[11px] font-medium text-slate-400 truncate uppercase tracking-wider">{user?.email}</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Sair" : ""}
                        className={`flex items-center w-full text-[13px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-xl transition-all border border-transparent hover:border-red-100 ${isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}`}
                    >
                        <LogOut className="w-4 h-4 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap animate-in fade-in duration-300">Sair</span>}
                    </button>
                </div>
            </aside >

            {/* Overlay mobile */}
            {
                sidebarOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300" onClick={() => setSidebarOpen(false)} />
                )
            }

            {/* Main */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                {/* Top bar mobile */}
                <header className="md:hidden h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-2.5 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all shadow-md shadow-brand-500/20">
                            <Package className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">Romaneio<span className="text-brand-600">Rapido</span></span>
                    </div>
                    <div className="w-10"></div> {/* Spacer for symmetry */}
                </header>

                <main className="flex-1 p-4 md:p-8 lg:p-10 animate-slide-up">
                    <Outlet />
                </main>
            </div>

            {/* Trial Expired Banner (overlay) */}
            <TrialExpiredBanner />
        </div >
    )
}
