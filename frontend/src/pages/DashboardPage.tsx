import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingOverlay from '../components/LoadingOverlay'
import { Plus, Boxes, ArrowRightLeft, AlertTriangle } from 'lucide-react'

interface Stats {
    totalProducts: number
    todayMovements: number
    lowStockCount: number
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [stats, setStats] = useState<Stats>({ totalProducts: 0, todayMovements: 0, lowStockCount: 0 })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const res = await api.get('/inventory/dashboard-summary')
                const data = res.data
                setStats({
                    totalProducts: data.total_products,
                    todayMovements: data.today_movements,
                    lowStockCount: data.low_stock_count,
                })
            } catch (err) {
                console.error('Erro ao buscar dados do dashboard:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [])



    if (loading) {
        return (
            <>
                <LoadingOverlay message="Sincronizando Dados..." />
                <div className="max-w-7xl mx-auto space-y-8 animate-pulse">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="h-8 w-48 bg-slate-200 rounded-lg" />
                            <div className="h-4 w-64 bg-slate-100 rounded-md" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-40 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                        ))}
                    </div>
                    <div className="h-96 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                </div>
            </>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Painel</h1>
                    <p className="text-sm font-semibold text-slate-400">
                        Bem-vindo de volta, <span className="text-brand-600">{user?.full_name.split(' ')[0]}</span>! Aqui está um resumo do seu estoque.
                    </p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                    <p className="text-xs font-black text-brand-600 uppercase tracking-[0.2em]">Visão Geral</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
                    </p>
                </div>
            </div>

            {/* 3 Main Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="glass-card rounded-[2rem] p-8 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm ring-1 ring-brand-100/50">
                            <Boxes className="w-6 h-6 text-brand-600" />
                        </div>
                    </div>
                    <p className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {stats.totalProducts}
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Produtos Registrados</p>
                </div>

                <div
                    onClick={() => navigate('/movimentacoes')}
                    className="glass-card rounded-[2rem] p-8 relative overflow-hidden group cursor-pointer hover:border-brand-200 hover:shadow-lg transition-all"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl group-hover:bg-brand-500/10 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm ring-1 ring-brand-100/50">
                            <ArrowRightLeft className="w-6 h-6 text-brand-600" />
                        </div>
                    </div>
                    <p className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {stats.todayMovements}
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Movimentações Hoje</p>
                </div>

                <div
                    onClick={() => navigate('/produtos')}
                    className="glass-card rounded-[2rem] p-8 relative overflow-hidden group cursor-pointer hover:border-orange-200 hover:shadow-lg transition-all"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shadow-sm ring-1 ring-orange-100/50">
                            <AlertTriangle className="w-6 h-6 text-orange-500" />
                        </div>
                    </div>
                    <p className="text-4xl font-black text-slate-900 mb-1 tracking-tighter">
                        {stats.lowStockCount}
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alertas de Estoque</p>
                </div>
            </div>

            {/* Ações Rápidas */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => navigate('/romaneio')}
                    className="flex-1 min-w-[200px] h-20 bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:border-brand-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/10 transition-colors" />
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all shrink-0">
                        <ArrowRightLeft className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-slate-900 leading-tight">Montar Romaneio</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saída Rápida</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/clientes')}
                    className="flex-1 min-w-[200px] h-20 bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                        <Plus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-slate-900 leading-tight">Novo Cliente</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro Ágil</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/produtos')}
                    className="flex-1 min-w-[200px] h-20 bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4 hover:border-blue-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition-colors" />
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        <Boxes className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-black text-slate-900 leading-tight">Produtos</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerenciar Estoque</p>
                    </div>
                </button>
            </div>


        </div>
    )
}
