import { useEffect, useState } from 'react'
import api from '../services/api'
import {
    Search,
    ArrowUpCircle,
    ArrowDownCircle,
    Settings2,
    Filter,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Package,
    MoreVertical,
    Share2,
    Smartphone
} from 'lucide-react'
import MovementDetailsModal from '../components/MovementDetailsModal'
import RomaneioExportModal from '../components/RomaneioExportModal'
import type { CartItem } from '../components/RomaneioExportModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Movement {
    id: number
    product_id: number
    quantity: number
    movement_type: 'IN' | 'OUT' | 'ADJUSTMENT'
    notes: string | null
    created_at: string
    product_name: string
    product_barcode_snapshot: string | null
    unit_snapshot: string | null
    product_image: string | null
    client?: {
        id: number
        name: string
        phone: string | null
    }
}

export default function MovementsPage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [perPage] = useState(15)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sharingMovement, setSharingMovement] = useState<Movement | null>(null)
    const [exportingMovement, setExportingMovement] = useState<{ clientId: number | null, customerName: string, createdAt: string, phone: string | null, image: string | null, items: CartItem[] } | null>(null)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    const fetchMovements = async () => {
        setLoading(true)
        try {
            const params: any = {
                skip: (page - 1) * perPage,
                limit: perPage
            }
            if (debouncedSearch) params.search = debouncedSearch
            if (typeFilter) params.movement_type = typeFilter

            const response = await api.get('/inventory/movements', { params })
            setMovements(response.data.items)
            setTotal(response.data.total)
        } catch (error) {
            console.error('Erro ao buscar movimentações:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchMovements()
    }, [page, debouncedSearch, typeFilter])

    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'IN':
                return {
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-700',
                    border: 'border-emerald-100',
                    icon: <ArrowUpCircle className="w-4 h-4" />,
                    label: 'Entrada'
                }
            case 'OUT':
                return {
                    bg: 'bg-rose-50',
                    text: 'text-rose-700',
                    border: 'border-rose-100',
                    icon: <ArrowDownCircle className="w-4 h-4" />,
                    label: 'Saída'
                }
            default:
                return {
                    bg: 'bg-blue-50',
                    text: 'text-blue-700',
                    border: 'border-blue-100',
                    icon: <Settings2 className="w-4 h-4" />,
                    label: 'Ajuste'
                }
        }
    }

    const totalPages = Math.ceil(total / perPage)

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Movimentações</h1>
                    <p className="text-sm font-semibold text-slate-400">
                        Histórico detalhado de todas as entradas e saídas de estoque.
                    </p>
                </div>
            </div>

            {/* Filters Header */}
            <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1 relative group">
                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por produto ou código de barras..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-12 pl-12 pr-6 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all font-semibold"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="relative min-w-[180px]">
                            <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                            <select
                                value={typeFilter}
                                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                                className="w-full h-12 pl-11 pr-10 appearance-none bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all font-bold text-sm text-slate-700"
                            >
                                <option value="">Todos os Tipos</option>
                                <option value="IN">Entradas</option>
                                <option value="OUT">Saídas</option>
                                <option value="ADJUSTMENT">Ajustes</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto -mx-6 md:-mx-8">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Data/Hora</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Produto</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center">Tipo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Qtd.</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Notas</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 relative">
                            {loading && (
                                <tr className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-b-[2rem]">
                                    <td colSpan={6} className="flex items-center justify-center w-full h-full">
                                        <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                    </td>
                                </tr>
                            )}
                            {movements.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-sm font-bold text-slate-400 italic">
                                        Nenhuma movimentação encontrada.
                                    </td>
                                </tr>
                            ) : (
                                movements.map((m) => {
                                    const styles = getTypeStyles(m.movement_type)
                                    return (
                                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700">
                                                            {format(new Date(m.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {format(new Date(m.created_at), 'HH:mm')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex items-center justify-center shrink-0 group-hover:border-brand-200 transition-colors shadow-sm">
                                                        {m.product_image ? (
                                                            <img src={m.product_image} alt={m.product_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="w-5 h-5 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{m.product_name}</p>
                                                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                                                            {m.product_barcode_snapshot || 'SEM SKU'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest ${styles.bg} ${styles.text} ${styles.border}`}>
                                                    {styles.icon}
                                                    {styles.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-baseline justify-end gap-1">
                                                    <span className={`font-black text-sm ${m.movement_type === 'OUT' ? 'text-rose-600' : m.movement_type === 'IN' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                        {m.movement_type === 'OUT' ? '-' : m.movement_type === 'IN' ? '+' : ''}
                                                        {m.quantity % 1 === 0 ? m.quantity : m.quantity.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                        {m.unit_snapshot || 'UN'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <p className="text-xs font-medium text-slate-500 max-w-[200px] truncate" title={m.notes || ''}>
                                                    {m.notes || '-'}
                                                </p>
                                            </td>
                                            <td className="px-8 py-5 text-right relative">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => setOpenMenuId(openMenuId === m.id ? null : m.id)}
                                                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${openMenuId === m.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                                                    >
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>

                                                    {openMenuId === m.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-20"
                                                                onClick={() => setOpenMenuId(null)}
                                                            />
                                                            <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                                <button
                                                                    onClick={() => {
                                                                        setSharingMovement(m)
                                                                        setOpenMenuId(null)
                                                                    }}
                                                                    className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-all group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                                        <Share2 className="w-4 h-4" />
                                                                    </div>
                                                                    <span>Ver Detalhes</span>
                                                                </button>

                                                                {m.movement_type === 'OUT' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setExportingMovement({
                                                                                clientId: m.client?.id || null,
                                                                                customerName: m.client?.name || (m.notes?.startsWith('Romaneio: ') ? m.notes.replace('Romaneio: ', '').trim() : (m.notes || 'Consumidor')),
                                                                                createdAt: m.created_at,
                                                                                phone: m.client?.phone || null,
                                                                                image: m.product_image,
                                                                                items: [{
                                                                                    id: m.product_id,
                                                                                    name: m.product_name,
                                                                                    barcode: m.product_barcode_snapshot,
                                                                                    quantity: m.quantity,
                                                                                    unit: m.unit_snapshot || 'UN',
                                                                                    price: 0,
                                                                                    image: m.product_image
                                                                                }]
                                                                            })
                                                                            setOpenMenuId(null)
                                                                        }}
                                                                        className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-all group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                                                                            <Smartphone className="w-4 h-4" />
                                                                        </div>
                                                                        <span>Imprimir / WhatsApp</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pt-6 border-t border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Mostrando <span className="text-slate-900">{movements.length}</span> de <span className="text-slate-900">{total}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center px-4 h-10 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-slate-600 tracking-widest">
                                PÁGINA {page} / {totalPages}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:border-brand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {sharingMovement && (
                <MovementDetailsModal
                    customerName={sharingMovement.notes?.startsWith('Romaneio: ') ? sharingMovement.notes.replace('Romaneio: ', '').trim() : (sharingMovement.notes || 'Detalhes da Movimentação')}
                    createdAt={sharingMovement.created_at}
                    items={[{
                        id: sharingMovement.product_id,
                        name: sharingMovement.product_name,
                        barcode: sharingMovement.product_barcode_snapshot,
                        quantity: sharingMovement.quantity,
                        unit: sharingMovement.unit_snapshot || 'UN',
                        price: 0, // We don't have the price in the movement list snapshot here
                        image: sharingMovement.product_image
                    }]}
                    onClose={() => setSharingMovement(null)}
                    onExport={() => {
                        setExportingMovement({
                            clientId: sharingMovement.client?.id || null,
                            customerName: sharingMovement.client?.name || (sharingMovement.notes?.startsWith('Romaneio: ') ? sharingMovement.notes.replace('Romaneio: ', '').trim() : (sharingMovement.notes || 'Consumidor')),
                            createdAt: sharingMovement.created_at,
                            phone: sharingMovement.client?.phone || null,
                            image: sharingMovement.product_image,
                            items: [{
                                id: sharingMovement.product_id,
                                name: sharingMovement.product_name,
                                barcode: sharingMovement.product_barcode_snapshot,
                                quantity: sharingMovement.quantity,
                                unit: sharingMovement.unit_snapshot || 'UN',
                                price: 0,
                                image: sharingMovement.product_image
                            }]
                        })
                        setSharingMovement(null)
                    }}
                />
            )}

            {exportingMovement && (
                <RomaneioExportModal
                    isOpen={!!exportingMovement}
                    clientId={exportingMovement.clientId}
                    customerName={exportingMovement.customerName}
                    customerPhone={exportingMovement.phone}
                    items={exportingMovement.items}
                    createdAt={exportingMovement.createdAt}
                    title="Exportar Romaneio"
                    onClose={() => setExportingMovement(null)}
                />
            )}
        </div>
    )
}
