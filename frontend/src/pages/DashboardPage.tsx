import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import LoadingOverlay from '../components/LoadingOverlay'
import {
    Plus,
    Boxes,
    ArrowRightLeft,
    AlertTriangle,
    Activity,
    BarChart3,
    CheckCircle2,
    PackageCheck,
    PackageX,
    TrendingDown
} from 'lucide-react'

interface Stats {
    totalProducts: number
    todayMovements: number
    lowStockCount: number
}

interface StockLevel {
    product_id: number
    product_name: string
    stock_quantity: number
    min_stock: number
    unit: string
    price: number
    is_low_stock: boolean
}

interface Movement {
    id: number
    quantity: number
    movement_type: 'IN' | 'OUT' | 'ADJUSTMENT'
    notes: string | null
    created_at: string
    product_name: string | null
    product_name_snapshot?: string | null
    unit_snapshot?: string | null
    is_cancelled?: boolean
}

interface DailyMovement {
    label: string
    value: number
}

const formatQuantity = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)
}

const getMovementLabel = (type: Movement['movement_type']) => {
    if (type === 'IN') return 'Entrada'
    if (type === 'OUT') return 'Saida'
    return 'Ajuste'
}

const getMovementTone = (type: Movement['movement_type']) => {
    if (type === 'IN') return 'text-emerald-600 bg-emerald-50 border-emerald-100'
    if (type === 'OUT') return 'text-rose-600 bg-rose-50 border-rose-100'
    return 'text-slate-600 bg-slate-50 border-slate-200'
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [stats, setStats] = useState<Stats>({ totalProducts: 0, todayMovements: 0, lowStockCount: 0 })
    const [stockLevels, setStockLevels] = useState<StockLevel[]>([])
    const [recentMovements, setRecentMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summaryRes, stockRes, movementRes] = await Promise.all([
                    api.get('/inventory/dashboard-summary'),
                    api.get('/inventory/stock-levels', {
                        params: { limit: 100, sort_by: 'stock_quantity', order: 'asc' }
                    }),
                    api.get('/inventory/movements', {
                        params: { limit: 40 }
                    })
                ])

                const data = summaryRes.data
                setStats({
                    totalProducts: data.total_products,
                    todayMovements: data.today_movements,
                    lowStockCount: data.low_stock_count,
                })
                setStockLevels(stockRes.data.items || [])
                setRecentMovements((movementRes.data.items || []).filter((item: Movement) => !item.is_cancelled))
            } catch (err) {
                console.error('Erro ao buscar dados do dashboard:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [])

    const dailyMovements = useMemo<DailyMovement[]>(() => {
        const today = new Date()
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today)
            date.setDate(today.getDate() - (6 - index))
            return {
                key: date.toISOString().slice(0, 10),
                label: new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', ''),
                value: 0
            }
        })

        recentMovements.forEach((movement) => {
            const key = new Date(movement.created_at).toISOString().slice(0, 10)
            const day = days.find((item) => item.key === key)
            if (day) day.value += 1
        })

        return days.map(({ label, value }) => ({ label, value }))
    }, [recentMovements])

    const stockHealth = useMemo(() => {
        const outOfStock = stockLevels.filter((item) => item.stock_quantity <= 0).length
        const lowStock = stockLevels.filter((item) => item.stock_quantity > 0 && item.stock_quantity < item.min_stock).length
        const healthy = Math.max(stockLevels.length - lowStock - outOfStock, 0)
        const total = Math.max(stockLevels.length, 1)

        return {
            healthy,
            lowStock,
            outOfStock,
            healthyPercent: Math.round((healthy / total) * 100),
            lowStockPercent: Math.round((lowStock / total) * 100),
            outOfStockPercent: Math.round((outOfStock / total) * 100)
        }
    }, [stockLevels])

    const criticalProducts = useMemo(() => {
        return stockLevels
            .filter((item) => item.is_low_stock || item.stock_quantity <= 0)
            .slice(0, 5)
    }, [stockLevels])

    const maxDailyMovements = Math.max(...dailyMovements.map((item) => item.value), 1)

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
                    <div className="grid grid-cols-3 gap-2 sm:gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 sm:h-40 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-3 h-80 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                        <div className="lg:col-span-2 h-80 bg-white rounded-3xl border border-slate-100 shadow-sm" />
                    </div>
                </div>
            </>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Painel</h1>
                    <p className="text-xs sm:text-sm font-semibold text-slate-400">
                        Bem-vindo de volta, <span className="text-brand-600">{user?.full_name.split(' ')[0]}</span>! Aqui esta um resumo do seu estoque.
                    </p>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                    <p className="text-xs font-black text-brand-600 uppercase tracking-[0.2em]">Visao Geral</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date())}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-6">
                <button
                    onClick={() => navigate('/produtos')}
                    className="glass-card rounded-xl sm:rounded-[2rem] p-3 sm:p-8 text-left relative overflow-hidden group cursor-pointer hover:border-brand-200 hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-3 sm:mb-6">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm ring-1 ring-brand-100/50">
                            <Boxes className="w-4 h-4 sm:w-6 sm:h-6 text-brand-600" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">{stats.totalProducts}</p>
                    <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Produtos</p>
                </button>

                <button
                    onClick={() => navigate('/movimentacoes')}
                    className="glass-card rounded-xl sm:rounded-[2rem] p-3 sm:p-8 text-left relative overflow-hidden group cursor-pointer hover:border-brand-200 hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-3 sm:mb-6">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-50 flex items-center justify-center shadow-sm ring-1 ring-brand-100/50">
                            <ArrowRightLeft className="w-4 h-4 sm:w-6 sm:h-6 text-brand-600" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">{stats.todayMovements}</p>
                    <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Hoje</p>
                </button>

                <button
                    onClick={() => navigate('/produtos')}
                    className="glass-card rounded-xl sm:rounded-[2rem] p-3 sm:p-8 text-left relative overflow-hidden group cursor-pointer hover:border-orange-200 hover:shadow-lg transition-all"
                >
                    <div className="flex items-center justify-between mb-3 sm:mb-6">
                        <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-orange-50 flex items-center justify-center shadow-sm ring-1 ring-orange-100/50">
                            <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6 text-orange-500" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-4xl font-black text-slate-900 mb-1 tracking-tighter">{stats.lowStockCount}</p>
                    <p className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">Alertas</p>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
                <section className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <p className="text-sm font-black text-slate-900">Movimento dos ultimos 7 dias</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Entradas, saidas e ajustes</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="h-56 flex items-end gap-2 sm:gap-4">
                        {dailyMovements.map((item) => (
                            <div key={item.label} className="flex-1 min-w-0 flex flex-col items-center gap-2">
                                <div className="w-full h-44 flex items-end">
                                    <div
                                        className="w-full rounded-t-xl bg-brand-500/85 border border-brand-400/40 min-h-2 transition-all"
                                        style={{ height: `${Math.max((item.value / maxDailyMovements) * 100, item.value > 0 ? 10 : 2)}%` }}
                                    />
                                </div>
                                <p className="text-xs font-black text-slate-900">{item.value}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-6">
                        <div>
                            <p className="text-sm font-black text-slate-900">Saude do estoque</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{stockLevels.length} produtos analisados</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Activity className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center justify-between text-xs font-black mb-2">
                                <span className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="w-4 h-4" /> Estoque ok</span>
                                <span className="text-slate-900">{stockHealth.healthy}</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${stockHealth.healthyPercent}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-black mb-2">
                                <span className="flex items-center gap-2 text-orange-600"><TrendingDown className="w-4 h-4" /> Estoque baixo</span>
                                <span className="text-slate-900">{stockHealth.lowStock}</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500" style={{ width: `${stockHealth.lowStockPercent}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between text-xs font-black mb-2">
                                <span className="flex items-center gap-2 text-rose-600"><PackageX className="w-4 h-4" /> Sem estoque</span>
                                <span className="text-slate-900">{stockHealth.outOfStock}</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500" style={{ width: `${stockHealth.outOfStockPercent}%` }} />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <p className="text-sm font-black text-slate-900">Produtos criticos</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Prioridade de reposicao</p>
                        </div>
                        <button
                            onClick={() => navigate('/produtos')}
                            className="h-9 px-3 rounded-xl border border-orange-100 bg-orange-50 text-orange-600 text-xs font-black hover:border-orange-200 transition-colors"
                        >
                            Ver todos
                        </button>
                    </div>
                    <div className="space-y-3">
                        {criticalProducts.length > 0 ? criticalProducts.map((product) => {
                            const stockRatio = product.min_stock > 0 ? Math.min(Math.max(product.stock_quantity / product.min_stock, 0), 1) : 0
                            return (
                                <div key={product.product_id} className="border border-slate-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-slate-900 truncate">{product.product_name}</p>
                                            <p className="text-[11px] font-bold text-slate-400">{formatQuantity(product.stock_quantity)} {product.unit} de minimo {formatQuantity(product.min_stock)}</p>
                                        </div>
                                        <span className="shrink-0 text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-100 rounded-lg px-2 py-1">
                                            Baixo
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500" style={{ width: `${stockRatio * 100}%` }} />
                                    </div>
                                </div>
                            )
                        }) : (
                            <div className="border border-emerald-100 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                                <PackageCheck className="w-5 h-5 text-emerald-600" />
                                <p className="text-sm font-bold text-emerald-700">Nenhum produto critico agora.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <p className="text-sm font-black text-slate-900">Atividade recente</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ultimas movimentacoes</p>
                        </div>
                        <button
                            onClick={() => navigate('/movimentacoes')}
                            className="h-9 px-3 rounded-xl border border-brand-100 bg-brand-50 text-brand-600 text-xs font-black hover:border-brand-200 transition-colors"
                        >
                            Historico
                        </button>
                    </div>
                    <div className="space-y-3">
                        {recentMovements.slice(0, 5).map((movement) => (
                            <div key={movement.id} className="flex items-center gap-3 border border-slate-100 rounded-xl p-3">
                                <span className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${getMovementTone(movement.movement_type)}`}>
                                    <ArrowRightLeft className="w-4 h-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-black text-slate-900 truncate">{movement.product_name || movement.product_name_snapshot || 'Produto'}</p>
                                    <p className="text-[11px] font-bold text-slate-400">
                                        {getMovementLabel(movement.movement_type)} de {formatQuantity(Math.abs(Number(movement.quantity) || 0))} {movement.unit_snapshot || 'UN'}
                                    </p>
                                </div>
                                <p className="text-[11px] font-bold text-slate-400 shrink-0">
                                    {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(new Date(movement.created_at))}
                                </p>
                            </div>
                        ))}
                        {recentMovements.length === 0 && (
                            <div className="border border-slate-100 bg-slate-50 rounded-xl p-4">
                                <p className="text-sm font-bold text-slate-500">Nenhuma movimentacao registrada ainda.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4">
                <button
                    onClick={() => navigate('/romaneio')}
                    className="flex-1 sm:min-w-[200px] h-14 sm:h-20 bg-white border border-slate-200 sm:border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-brand-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-all shrink-0">
                        <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-[13px] sm:text-sm font-black text-slate-900 leading-tight">Montar Romaneio</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saida Rapida</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/clientes')}
                    className="flex-1 sm:min-w-[200px] h-14 sm:h-20 bg-white border border-slate-200 sm:border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-emerald-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-[13px] sm:text-sm font-black text-slate-900 leading-tight">Novo Cliente</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cadastro Agil</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/produtos')}
                    className="flex-1 sm:min-w-[200px] h-14 sm:h-20 bg-white border border-slate-200 sm:border-slate-100 rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-blue-200 hover:shadow-lg transition-all group overflow-hidden relative"
                >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                        <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="text-left">
                        <p className="text-[13px] sm:text-sm font-black text-slate-900 leading-tight">Produtos</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gerenciar Estoque</p>
                    </div>
                </button>
            </div>
        </div>
    )
}
