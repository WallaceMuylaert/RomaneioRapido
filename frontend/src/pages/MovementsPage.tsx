import { useEffect, useState, useMemo, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
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
    Smartphone,
    Download,
    BarChart3,
    ArrowRight,
    ClipboardList,
    XCircle,
    AlertCircle
} from 'lucide-react'
import MovementDetailsModal from '../components/MovementDetailsModal'
import RomaneioExportModal from '../components/RomaneioExportModal'
import ConfirmModal from '../components/ConfirmModal'
import type { CartItem } from '../components/RomaneioExportModal'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { Copy } from 'lucide-react'
import { getBase64FromUrl } from '../utils/imageUtils'
import logoImg from '../assets/romaneiorapido_logo.png'

interface Movement {
    id: number
    product_id: number
    quantity: number
    movement_type: 'IN' | 'OUT' | 'ADJUSTMENT'
    notes: string | null
    created_at: string
    product_name: string
    product_barcode_snapshot: string | null
    unit_snapshot: string;
    unit_price_snapshot?: number | null
    product_color_snapshot?: string;
    product_size_snapshot?: string;
    romaneio_id?: string | number | null
    client_id?: number | null
    discount_snapshot?: number | null
    product_image: string | null
    product_color?: string | null
    product_size?: string | null
    product_price?: number | null
    client?: {
        id: number
        name: string
        phone: string | null
    }
    is_cancelled?: boolean
}

export default function MovementsPage() {
    const [movements, setMovements] = useState<Movement[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [page, setPage] = useState(1)
    const [perPage] = useState(15)
    const [search, setSearch] = useState('')
    const navigate = useNavigate()
    const [typeFilter, setTypeFilter] = useState<string>('OUT')
    const [viewMode, setViewMode] = useState<'movements' | 'romaneios'>('romaneios')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sharingMovement, setSharingMovement] = useState<Movement | null>(null)
    const [exportingMovement, setExportingMovement] = useState<{ clientId: number | null, customerName: string, createdAt: string, phone: string | null, image: string | null, items: CartItem[], discount?: number } | null>(null)
    const [openMenu, setOpenMenu] = useState<{
        id: string
        left: number
        width: number
        arrowLeft: number
        placement: 'top' | 'bottom'
        top?: number
        bottom?: number
    } | null>(null)
    const [logoBase64, setLogoBase64] = useState<string>('')
    const [cancelModal, setCancelModal] = useState<{ isOpen: boolean, id: number | null }>({ isOpen: false, id: null })
    const [cancelling, setCancelling] = useState(false)

    const handleActionMenuClick = (event: MouseEvent<HTMLButtonElement>, menuId: string) => {
        if (openMenu?.id === menuId) {
            setOpenMenu(null)
            return
        }

        const rect = event.currentTarget.getBoundingClientRect()
        const menuWidth = Math.min(224, window.innerWidth - 24)
        const estimatedMenuHeight = 216
        const margin = 12
        const gap = 10
        const buttonCenter = rect.left + rect.width / 2

        const left = Math.min(
            Math.max(margin, buttonCenter - menuWidth / 2),
            window.innerWidth - menuWidth - margin
        )
        const arrowLeft = Math.min(Math.max(18, buttonCenter - left), menuWidth - 18)
        const shouldOpenUp =
            rect.bottom + gap + estimatedMenuHeight > window.innerHeight - margin &&
            rect.top > window.innerHeight - rect.bottom

        setOpenMenu({
            id: menuId,
            left,
            width: menuWidth,
            arrowLeft,
            placement: shouldOpenUp ? 'top' : 'bottom',
            top: shouldOpenUp ? undefined : rect.bottom + gap,
            bottom: shouldOpenUp ? window.innerHeight - rect.top + gap : undefined
        })
    }

    useEffect(() => {
        if (!openMenu) return

        const closeMenu = () => setOpenMenu(null)
        window.addEventListener('resize', closeMenu)
        window.addEventListener('scroll', closeMenu, true)

        return () => {
            window.removeEventListener('resize', closeMenu)
            window.removeEventListener('scroll', closeMenu, true)
        }
    }, [openMenu])

    useEffect(() => {
        getBase64FromUrl(logoImg).then(setLogoBase64).catch(console.error)
    }, [])

    // Helper para obter o preço efetivo (preco atual do produto, com fallback no snapshot)
    const getEffectivePrice = (item: any) => item.product_price ?? item.unit_price_snapshot ?? 0

    const getProductName = (item: any) => item?.product_name || item?.product_name_snapshot || 'Produto'

    const getUniqueProductNames = (items: any[]) => {
        return Array.from(new Set(items.map(getProductName).filter(Boolean)))
    }

    const getProductSummary = (items: any[]) => {
        const names = getUniqueProductNames(items)
        if (names.length === 0) return 'Produto'
        if (names.length === 1) return names[0]

        const extraCount = names.length - 1
        return `${names[0]} +${extraCount} produto${extraCount > 1 ? 's' : ''}`
    }

    const getProductMeta = (item: any, productCount: number) => {
        if (productCount > 1) return `${productCount} produtos no romaneio`

        const variant = [
            item?.product_color_snapshot || item?.product_color,
            item?.product_size_snapshot || item?.product_size
        ].filter(Boolean).join(' / ')
        return variant || item?.product_barcode_snapshot || item?.barcode || 'SEM SKU'
    }

    // Relatórios
    const [reportData, setReportData] = useState<{
        total_romaneios: number,
        total_value: number,
        start_date: string,
        end_date: string
    } | null>(null)
    const [reportLoading, setReportLoading] = useState(false)
    const [reportPeriod, setReportPeriod] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    })

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
            setPage(1)
        }, 500)
        return () => clearTimeout(timer)
    }, [search])

    // Agrupamento de Movimentações para permitir Re-gerar Romaneios e Exportação de PDF
    const groupedMovementsForReport = useMemo(() => {
        const groups: Record<string, any> = {}
        const singles: any[] = []

        if (!Array.isArray(movements)) return []

        movements.forEach(m => {
            const effectivePrice = getEffectivePrice(m)
            const grossValue = Math.abs(Number(m.quantity) || 0) * effectivePrice
            const itemValue = m.is_cancelled ? 0 : Math.max(0, grossValue - (m.discount_snapshot || 0))

            if (m.romaneio_id) {
                if (!groups[m.romaneio_id]) {
                    let cName = ""
                    if (m.notes && m.notes.startsWith("Romaneio: ")) {
                        cName = m.notes.replace("Romaneio: ", "").trim()
                    }

                    groups[m.romaneio_id] = {
                        id: m.romaneio_id,
                        created_at: m.created_at,
                        clientId: m.client_id || m.client?.id || null,
                        customerName: m.client?.name || cName || 'Consumidor',
                        customerPhone: m.client?.phone || null,
                        items: [],
                        movement_type: m.movement_type,
                        totalQuantity: 0,
                        totalValue: 0,
                        is_cancelled: m.is_cancelled
                    }
                }
                groups[m.romaneio_id].items.push(m)
                groups[m.romaneio_id].totalQuantity += Math.abs(Number(m.quantity) || 0)
                groups[m.romaneio_id].totalValue += itemValue

                if (m.client || m.client_id) {
                    groups[m.romaneio_id].customerName = m.client?.name || groups[m.romaneio_id].customerName;
                    groups[m.romaneio_id].customerPhone = m.client?.phone || groups[m.romaneio_id].customerPhone;
                    groups[m.romaneio_id].clientId = m.client_id || m.client?.id || groups[m.romaneio_id].clientId;
                }
            } else {
                singles.push({
                    ...m,
                    totalValue: itemValue
                })
            }
        })

        const result = [
            ...Object.values(groups)
                .filter(g => g.movement_type === 'OUT')
                .map(g => ({ ...g, isGroup: true })),
            ...singles
                .filter(s => s.movement_type === 'OUT')
                .map(s => ({
                    ...s,
                    isGroup: false,
                    id: s.id,
                    clientId: s.client_id || s.client?.id || null,
                    items: [s],
                    customerName: s.notes && s.notes.includes("Romaneio: ") ? s.notes.replace("Romaneio: ", "").trim() : (s.notes || ""),
                    totalValue: s.totalValue
                }))
        ]

        return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }, [movements])

    const fetchReport = async () => {
        setReportLoading(true)
        try {
            const params: any = {
                start_date: reportPeriod.start,
                end_date: reportPeriod.end
            }
            if (typeFilter) params.movement_type = typeFilter

            const res = await api.get('/inventory/reports/daily', { params })
            setReportData(res.data)
        } catch (err) {
            console.error('Erro ao buscar relatório:', err)
            toast.error('Erro ao buscar dados do relatório.', { id: 'report-error' })
        } finally {
            setReportLoading(false)
        }
    }

    useEffect(() => {
        fetchReport()
    }, [reportPeriod, typeFilter])

    const handleExportReportPDF = () => {
        if (!reportData) return;

        const printWindow = window.open('', '', 'width=900,height=800');
        if (!printWindow) return;

        const now = new Date();
        const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `Relatorio_Balanco_${timestamp}`;

        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
        const dateRangeStr = reportPeriod.start === reportPeriod.end
            ? new Date(reportPeriod.start + 'T00:00:00').toLocaleDateString('pt-BR')
            : `${new Date(reportPeriod.start + 'T00:00:00').toLocaleDateString('pt-BR')} até ${new Date(reportPeriod.end + 'T00:00:00').toLocaleDateString('pt-BR')}`;

        const getReportLabel = () => {
            if (typeFilter === 'IN') return 'Relatório de Entradas';
            if (typeFilter === 'OUT') return 'Relatório de Saídas';
            if (typeFilter === 'ADJUSTMENT') return 'Relatório de Ajustes';
            return 'Relatório de Balanço Geral';
        };

        const getValueLabel = () => {
            if (typeFilter === 'IN') return 'Custo Total';
            if (typeFilter === 'OUT') return 'Receita Total';
            if (typeFilter === 'ADJUSTMENT') return 'Variação de Estoque';
            return 'Valor Movimentado';
        };

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>${filename}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', -apple-system, sans-serif; 
                        padding: 50px; 
                        color: #1f2937; 
                        line-height: 1.5;
                        background: #fff;
                    }
                    .watermark-container { 
                        position: fixed; 
                        top: 0; left: 0; width: 100%; height: 100%; 
                        display: flex; align-items: center; justify-content: center; 
                        pointer-events: none; z-index: -1; 
                    }
                    .watermark-logo { 
                        width: 500px; 
                        opacity: 0.04; 
                        transform: rotate(-35deg); 
                    }
                    .header { 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                        margin-bottom: 40px; 
                        border-bottom: 1px solid #e5e7eb; 
                        padding-bottom: 24px; 
                    }
                    .brand { display: flex; align-items: center; gap: 12px; }
                    .brand-logo { height: 40px; width: auto; object-fit: contain; }
                    .brand-name { font-size: 18px; font-weight: 800; color: #111827; letter-spacing: -0.025em; }
                    
                    .report-title-container { text-align: right; }
                    .report-title { font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em; margin-bottom: 4px; }
                    .report-period { font-size: 14px; color: #6b7280; font-weight: 500; }

                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 20px; 
                        margin-bottom: 40px; 
                    }
                    .stat-card { 
                        padding: 24px; 
                        border-radius: 16px; 
                        background: #f9fafb; 
                        border: 1px solid #f3f4f6;
                    }
                    .stat-label { 
                        font-size: 12px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        letter-spacing: 0.05em; 
                        color: #6b7280; 
                        margin-bottom: 8px; 
                    }
                    .stat-value { 
                        font-size: 32px; 
                        font-weight: 800; 
                        color: #111827; 
                        letter-spacing: -0.025em;
                    }
                    .stat-value.success { color: #059669; }

                    .section-title { 
                        font-size: 14px; 
                        font-weight: 800; 
                        text-transform: uppercase; 
                        letter-spacing: 0.05em; 
                        color: #111827; 
                        margin-bottom: 16px; 
                        padding-left: 4px;
                        border-left: 4px solid #2563eb;
                    }

                    table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; }
                    th { 
                        text-align: left; 
                        font-size: 11px; 
                        font-weight: 700; 
                        text-transform: uppercase; 
                        color: #6b7280; 
                        padding: 12px 16px; 
                        background: #f9fafb;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    th:first-child { border-top-left-radius: 8px; }
                    th:last-child { border-top-right-radius: 8px; }
                    
                    td { 
                        padding: 16px; 
                        font-size: 13px; 
                        border-bottom: 1px solid #f3f4f6; 
                        vertical-align: middle;
                    }
                    .row-date { color: #6b7280; font-family: tabular-nums; width: 140px; }
                    .row-main { font-weight: 600; color: #111827; }
                    .row-sub { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin-top: 2px; }
                    .row-qty { font-weight: 700; color: #4b5563; text-align: right; }
                    .row-val { font-weight: 800; color: #111827; text-align: right; width: 120px; }

                    .footer { 
                        margin-top: 60px; 
                        padding-top: 24px;
                        border-top: 1px solid #f3f4f6;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 11px; 
                        color: #9ca3af; 
                        font-weight: 500;
                    }
                    
                    @media print {
                        body { padding: 30px; }
                        .stat-card { background: #f9fafb !important; -webkit-print-color-adjust: exact; }
                        th { background: #f9fafb !important; -webkit-print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <div class="watermark-container">
                    ${logoBase64 ? `<img src="${logoBase64}" class="watermark-logo" />` : ''}
                </div>
                <div class="header">
                    <div class="brand">
                        ${logoBase64 ? `<img src="${logoBase64}" class="brand-logo" />` : '<div style="width: 40px; height: 40px; background: #2563eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px;">R</div>'}
                        <div class="brand-name">Romaneio Rápido</div>
                    </div>
                    <div class="report-title-container">
                        <div class="report-title">${getReportLabel()}</div>
                        <div class="report-period">${dateRangeStr}</div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Movimentações (${typeFilter || 'Todas'})</div>
                        <div class="stat-value">${reportData.total_romaneios}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">${getValueLabel()}</div>
                        <div class="stat-value success">${formatCurrency(reportData.total_value)}</div>
                    </div>
                </div>

                <div class="section-title">Histórico de Movimentações</div>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente / Descrição</th>
                            <th style="text-align: right;">Quantidade</th>
                            <th style="text-align: right;">Preço Unit.</th>
                            <th style="text-align: center;">Cor/Tam</th>
                            <th style="text-align: right;">Valor Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groupedMovementsForReport.map(g => `
                            <tr>
                                <td class="row-date">${new Date(g.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                <td>
                                    <div class="row-main">${g.isGroup ? (g.customerName || 'Consumidor Final') : (g.product_name || 'Produto')}</div>
                                    <div class="row-sub">${g.isGroup ? 'Romaneio #' + String(g.id).slice(-6).toUpperCase() : 'Movimentação Avulsa'}</div>
                                </td>
                                <td class="row-qty">
                                    ${g.isGroup ? g.items.length + ' itens' : g.quantity + ' ' + (g.unit_snapshot || 'UN')}
                                </td>
                                <td class="row-val">
                                    ${g.isGroup ? '-' : formatCurrency(getEffectivePrice(g))}
                                </td>
                                <td style="text-align: center;">
                                    ${g.isGroup ? '-' : ((g.product_color_snapshot || g.product_size_snapshot) ? `${g.product_color_snapshot || ''} ${g.product_size_snapshot || ''}`.trim() : '-')}
                                </td>
                                <td class="row-val">
                                    ${formatCurrency(g.totalValue)}
                                    ${g.is_cancelled ? '<div style="font-size: 9px; color: #ef4444; font-weight: 900; margin-top: 4px;">CANCELADO</div>' : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer">
                    <div>Gerado em ${new Date().toLocaleString('pt-BR')}</div>
                    <div>romaneiorapido.com.br</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    }

    const handleCopyToRomaneio = (group: any) => {
        const cartItems: CartItem[] = group.items.map((m: Movement) => ({
            selectedKey: `mov-${m.id}`,
            id: m.product_id,
            name: m.product_name,
            barcode: m.product_barcode_snapshot,
            quantity: m.quantity,
            unit: m.unit_snapshot,
            price: getEffectivePrice(m),
            color: m.product_color_snapshot,
            size: m.product_size_snapshot,
            image: m.product_image
        }))

        const copyData = {
            items: cartItems,
            customerName: group.customerName,
            clientId: group.clientId,
            customerPhone: group.customerPhone
        }

        sessionStorage.setItem('copy_romaneio_data', JSON.stringify(copyData))
        toast.success('Pedido copiado! Redirecionando...', { id: 'movement-success' })
        navigate('/romaneio')
    }

    const handleCancelMovement = async (id: number) => {
        setCancelling(true)
        try {
            await api.post(`/inventory/movements/${id}/cancel`)
            toast.success('Movimentação cancelada com sucesso!', { id: 'movement-success' })
            fetchMovements()
            fetchReport()
        } catch (err) {
            console.error('Erro ao cancelar movimentação:', err)
            toast.error('Erro ao cancelar movimentação.', { id: 'movement-error' })
        } finally {
            setCancelling(false)
            setCancelModal({ isOpen: false, id: null })
        }
    }

    const fetchMovements = async () => {
        setLoading(true)
        try {
            const params: any = {
                skip: (page - 1) * perPage,
                limit: perPage,
                start_date: reportPeriod.start,
                end_date: reportPeriod.end,
                include_cancelled: true
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
    }, [page, debouncedSearch, typeFilter, reportPeriod])

    const getTypeStyles = (m: Movement) => {
        if (m.is_cancelled) {
            return {
                bg: 'bg-border/50',
                text: 'text-text-secondary',
                border: 'border-border',
                icon: <XCircle className="w-4 h-4" />,
                label: 'Cancelado'
            }
        }

        switch (m.movement_type) {
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
                    bg: 'bg-brand-50',
                    text: 'text-primary-dark',
                    border: 'border-brand-100',
                    icon: <Settings2 className="w-4 h-4" />,
                    label: 'Ajuste'
                }
        }
    }

    const totalPages = Math.ceil(total / perPage)

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-text-primary tracking-tight">Movimentações</h1>
                    <p className="text-sm font-semibold text-text-secondary">
                        Histórico detalhado de todas as entradas e saídas de estoque.
                    </p>
                </div>

                {reportData && (
                    <button
                        onClick={handleExportReportPDF}
                        className="flex items-center gap-2 px-5 h-12 bg-primary hover:bg-primary-dark text-card rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/20 active:scale-95 shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        Baixar PDF do Período
                    </button>
                )}
            </div>

            {/* Dashboard de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-[2rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <BarChart3 className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1">
                                {typeFilter === 'IN' ? 'Total Entradas' : typeFilter === 'OUT' ? 'Total Romaneios' : 'Total Registros'}
                            </p>
                            <h3 className="text-4xl font-black text-text-primary tracking-tighter">
                                {reportLoading ? '...' : reportData?.total_romaneios || 0}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-primary">
                            <span>Ver detalhamento abaixo</span>
                            <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-[2rem] p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                        <Settings2 className="w-24 h-24" />
                    </div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1">
                                {typeFilter === 'IN' ? 'Custo no Período' : typeFilter === 'OUT' ? 'Receita no Período' : 'Valor Movimentado'}
                            </p>
                            <h3 className={`text-4xl font-black tracking-tighter ${typeFilter === 'OUT' ? 'text-emerald-600' : typeFilter === 'IN' ? 'text-primary' : 'text-text-primary'}`}>
                                {reportLoading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportData?.total_value || 0)}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-text-secondary">
                            <span>Relatório Geral</span>
                            <ArrowRight className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Header */}
            <div className="glass-card rounded-[2rem] p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-5 space-y-2">
                        <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Buscar Produto</label>
                        <div className="relative group">
                            <Search className="w-5 h-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Nome ou código de barras..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-12 pl-12 pr-6 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-card transition-all font-semibold"
                            />
                        </div>
                    </div>

                    <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data Início</label>
                            <div className="relative group">
                                <Calendar className="w-5 h-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="date"
                                    value={reportPeriod.start}
                                    onChange={(e) => {
                                        setReportPeriod(prev => ({ ...prev, start: e.target.value }));
                                        setPage(1);
                                    }}
                                    className="w-full h-12 pl-12 pr-6 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-card transition-all font-bold"
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Data Fim</label>
                            <div className="relative group">
                                <Calendar className="w-5 h-5 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                                <input
                                    type="date"
                                    value={reportPeriod.end}
                                    onChange={(e) => {
                                        setReportPeriod(prev => ({ ...prev, end: e.target.value }));
                                        setPage(1);
                                    }}
                                    className="w-full h-12 pl-12 pr-6 text-sm bg-background border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-card transition-all font-bold"
                                />
                            </div>
                        </div>
                        <div className="relative min-w-[180px] space-y-2">
                            <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Tipo de Movimento</label>
                            <div className="relative">
                                <Filter className="w-4 h-4 text-text-secondary absolute left-4 top-1/2 -translate-y-1/2" />
                                <select
                                    value={typeFilter}
                                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                                    className="w-full h-12 pl-11 pr-10 appearance-none bg-background border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-card transition-all font-bold text-sm text-text-secondary"
                                >
                                    <option value="">Todos os Tipos</option>
                                    {viewMode === 'movements' && (
                                        <>
                                            <option value="IN">Entradas</option>
                                            <option value="ADJUSTMENT">Ajustes</option>
                                        </>
                                    )}
                                    <option value="OUT">Saídas</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <ChevronRight className="w-4 h-4 text-text-secondary rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center pt-8 border-t border-border">
                    <div className="grid w-full grid-cols-2 gap-1 rounded-2xl bg-border/50/50 p-1.5 sm:w-auto sm:flex sm:items-center">
                        <button
                            onClick={() => {
                                setViewMode('movements');
                                setTypeFilter('');
                                setPage(1);
                            }}
                            className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-black uppercase tracking-widest transition-all sm:px-8 sm:text-xs ${viewMode === 'movements'
                                ? 'bg-card text-text-primary shadow-sm border border-border'
                                : 'text-text-secondary hover:text-text-secondary hover:bg-card/50'}`}
                        >
                            <Settings2 className="h-3.5 w-3.5 shrink-0" />
                            Relatório
                        </button>
                        <button
                            onClick={() => {
                                setViewMode('romaneios');
                                setTypeFilter('OUT');
                                setPage(1);
                            }}
                            className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-black uppercase tracking-widest transition-all sm:px-8 sm:text-xs ${viewMode === 'romaneios'
                                ? 'bg-card text-text-primary shadow-sm border border-border'
                                : 'text-text-secondary hover:text-text-secondary hover:bg-card/50'}`}
                        >
                            <Share2 className="h-3.5 w-3.5 shrink-0" />
                            Romaneios
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Area */}
            <div className="glass-card rounded-[2rem] overflow-hidden">
                <div className="overflow-x-auto -mx-6 md:mx-0 pb-4 custom-scrollbar">
                    <div className="min-w-[1000px] md:min-w-full inline-block align-middle px-6 md:px-0">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-background/50">
                                    <th className="w-[132px] min-w-[132px] whitespace-nowrap bg-background px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary md:sticky md:left-0 md:z-10 md:shadow-[8px_0_16px_-16px_rgba(15,23,42,0.45)]">Data/Hora</th>
                                    <th className="min-w-[240px] shrink-0 whitespace-nowrap px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary">{viewMode === 'romaneios' ? 'Cliente / Romaneio' : 'Produto'}</th>
                                    <th className="min-w-[120px] whitespace-nowrap px-8 py-4 text-center text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary">Tipo</th>
                                    <th className="min-w-[260px] whitespace-nowrap px-8 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary">{viewMode === 'romaneios' ? 'Produto / Variantes' : 'Notas/Variantes'}</th>
                                    <th className="w-[108px] min-w-[108px] whitespace-nowrap bg-background px-8 py-4 text-right text-[10px] font-black uppercase tracking-[0.15em] text-text-secondary md:sticky md:right-0 md:z-10 md:shadow-[-8px_0_16px_-16px_rgba(15,23,42,0.45)]">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50 relative">
                                {loading && (
                                    <tr className="bg-card/50 backdrop-blur-[1px]">
                                        <td colSpan={5} className="py-20 flex items-center justify-center w-full">
                                            <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                                        </td>
                                    </tr>
                                )}
                                {(viewMode === 'romaneios' ? groupedMovementsForReport : movements).length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-sm font-bold text-text-secondary italic">
                                            Nenhuma movimentação encontrada.
                                        </td>
                                    </tr>
                                ) : (
                                    (viewMode === 'romaneios' ? groupedMovementsForReport : movements).map((m) => {
                                        const styles = getTypeStyles(m)
                                        const isGroup = 'isGroup' in m && m.isGroup;
                                        const cancelled = m.is_cancelled;
                                        const menuId = String(m.id);
                                        const productItems = isGroup ? ((m as any).items || []) : [m];
                                        const primaryProduct = productItems[0] || m;
                                        const productNames = getUniqueProductNames(productItems);

                                        return (
                                            <tr key={isGroup ? `group-${m.id}` : m.id} className={`hover:bg-background/50 transition-colors group ${cancelled ? 'opacity-60 bg-background/30' : ''}`}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center text-text-secondary">
                                                            <Calendar className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold ${cancelled ? 'text-text-secondary line-through' : 'text-text-secondary'}`}>
                                                                {format(new Date(m.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                                                                {format(new Date(m.created_at), 'HH:mm')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-background overflow-hidden border border-border flex items-center justify-center shrink-0 group-hover:border-brand-200 transition-colors shadow-sm">
                                                            {isGroup ? (
                                                                <div className="w-full h-full flex items-center justify-center bg-brand-50 text-primary font-black text-xs relative">
                                                                    <ClipboardList className="w-5 h-5 opacity-20 absolute" />
                                                                    <span className="relative z-10">
                                                                        {(m as any).customerName ? (m as any).customerName.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase() : 'RT'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <Package className="w-5 h-5 text-text-secondary/60" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold line-clamp-1 ${cancelled ? 'text-text-secondary line-through decoration-slate-300' : 'text-text-primary'}`}>
                                                                {isGroup ? ((m as any).customerName || 'Romaneio Agrupado') : m.product_name}
                                                            </p>
                                                            <p className="text-[10px] font-mono font-bold text-text-secondary uppercase tracking-tighter">
                                                                {isGroup ? `ID: ${String(m.id).slice(-8).toUpperCase()}` : (m.product_barcode_snapshot || 'SEM SKU')}
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
                                                <td className="px-8 py-5">
                                                    {viewMode === 'romaneios' ? (
                                                        <div className="flex max-w-[280px] items-center gap-3" title={productNames.join(', ')}>
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                                                                {primaryProduct?.product_image ? (
                                                                    <img src={primaryProduct.product_image} alt={getProductName(primaryProduct)} className="h-full w-full object-cover" />
                                                                ) : (
                                                                    <Package className="h-4 w-4 text-text-secondary/60" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={`line-clamp-1 text-sm font-bold ${cancelled ? 'text-text-secondary line-through decoration-slate-300' : 'text-text-primary'}`}>
                                                                    {getProductSummary(productItems)}
                                                                </p>
                                                                <p className="truncate text-[10px] font-black uppercase tracking-tight text-text-secondary">
                                                                    {getProductMeta(primaryProduct, productNames.length)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            {!isGroup && (m.product_color_snapshot || m.product_size_snapshot) && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="px-2 py-0.5 bg-border/50 text-text-secondary rounded text-[10px] font-bold">
                                                                        {m.product_color_snapshot || '-'} / {m.product_size_snapshot || '-'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <p className="text-xs font-medium text-text-secondary max-w-[200px] truncate" title={isGroup ? 'Itens do Romaneio' : (m.notes || '')}>
                                                                {isGroup ? (m as any).items.map((i: any) => i.product_name).join(', ') : (m.notes || '-')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-8 py-5 text-right relative">
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={(event) => handleActionMenuClick(event, menuId)}
                                                            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${openMenu?.id === menuId ? 'bg-text-primary text-card' : 'text-text-secondary hover:bg-border/50'}`}
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>

                                                        {openMenu?.id === menuId && createPortal(
                                                            <>
                                                                <div
                                                                    className="fixed inset-0 z-40"
                                                                    onClick={() => setOpenMenu(null)}
                                                                />
                                                                <div
                                                                    className="fixed bg-card rounded-2xl border border-border py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                                                                    style={{
                                                                        top: openMenu.top,
                                                                        bottom: openMenu.bottom,
                                                                        left: openMenu.left,
                                                                        width: openMenu.width,
                                                                        transformOrigin: `${openMenu.arrowLeft}px ${openMenu.placement === 'top' ? 'bottom' : 'top'}`
                                                                    }}
                                                                >
                                                                    <div
                                                                        className={`absolute w-3 h-3 bg-card border-border rotate-45 pointer-events-none ${openMenu.placement === 'top' ? '-bottom-1.5 border-b border-r' : '-top-1.5 border-t border-l'}`}
                                                                        style={{ left: openMenu.arrowLeft - 6 }}
                                                                    />
                                                                    <button
                                                                        onClick={() => {
                                                                            if (isGroup) {
                                                                                setSharingMovement((m as any).items[0])
                                                                            } else {
                                                                                setSharingMovement(m)
                                                                            }
                                                                            setOpenMenu(null)
                                                                        }}
                                                                        className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-text-secondary hover:bg-background hover:text-primary transition-all group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 group-hover:bg-primary group-hover:text-card transition-all shadow-sm">
                                                                            <Share2 className="w-4 h-4" />
                                                                        </div>
                                                                        <span>Ver Detalhes</span>
                                                                    </button>

                                                                    {isGroup && (
                                                                        <button
                                                                            onClick={() => {
                                                                                handleCopyToRomaneio(m as any)
                                                                                setOpenMenu(null)
                                                                            }}
                                                                            className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-text-secondary hover:bg-background hover:text-warning transition-all group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center text-warning group-hover:bg-warning group-hover:text-card transition-all shadow-sm">
                                                                                <Copy className="w-4 h-4" />
                                                                            </div>
                                                                            <span>Copiar para Novo Romaneio</span>
                                                                        </button>
                                                                    )}

                                                                    <button
                                                                        onClick={() => {
                                                                            if (isGroup) {
                                                                                const gm = m as any;
                                                                                setExportingMovement({
                                                                                    clientId: gm.clientId,
                                                                                    customerName: gm.customerName,
                                                                                    createdAt: gm.created_at,
                                                                                    phone: gm.customerPhone,
                                                                                    image: null,
                                                                                    items: gm.items.map((i: any) => ({
                                                                                        selectedKey: `gm-${i.id}`,
                                                                                        id: i.product_id,
                                                                                        name: i.product_name || i.product_name_snapshot,
                                                                                        barcode: i.product_barcode_snapshot,
                                                                                        quantity: i.quantity,
                                                                                        unit: i.unit_snapshot || 'UN',
                                                                                        price: getEffectivePrice(i),
                                                                                        image: i.product_image,
                                                                                        color: i.product_color_snapshot || null,
                                                                                        size: i.product_size_snapshot || null
                                                                                    })),
                                                                                    discount: gm.items.reduce((acc: number, item: any) => acc + (item.discount_snapshot || 0), 0)
                                                                                })
                                                                            } else {
                                                                                setExportingMovement({
                                                                                    clientId: m.client_id || (m as any).client?.id || null,
                                                                                    customerName: (m as any).client?.name || (m.notes?.startsWith('Romaneio: ') ? m.notes.replace('Romaneio: ', '').trim() : (m.notes || 'Consumidor')),
                                                                                    createdAt: m.created_at,
                                                                                    phone: (m as any).client?.phone || null,
                                                                                    image: m.product_image,
                                                                                    items: [{
                                                                                        selectedKey: `mov-${m.id}`,
                                                                                        id: m.product_id,
                                                                                        name: m.product_name,
                                                                                        barcode: m.product_barcode_snapshot,
                                                                                        quantity: m.quantity,
                                                                                        unit: m.unit_snapshot || 'UN',
                                                                                        price: m.unit_price_snapshot ?? m.product_price ?? 0,
                                                                                        image: m.product_image,
                                                                                        color: m.product_color_snapshot || null,
                                                                                        size: m.product_size_snapshot || null
                                                                                    }],
                                                                                    discount: m.discount_snapshot || 0
                                                                                })
                                                                            }
                                                                            setOpenMenu(null)
                                                                        }}
                                                                        className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-text-secondary hover:bg-background hover:text-emerald-600 transition-all group"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-600 group-hover:text-card transition-all shadow-sm">
                                                                            <Smartphone className="w-4 h-4" />
                                                                        </div>
                                                                        <span>Imprimir / WhatsApp</span>
                                                                    </button>

                                                                    {!cancelled && !isGroup && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setCancelModal({ isOpen: true, id: m.id })
                                                                                setOpenMenu(null)
                                                                            }}
                                                                            className="w-full px-4 py-2.5 flex items-center gap-3 text-[13px] font-bold text-text-secondary hover:bg-rose-50 hover:text-rose-600 transition-all group"
                                                                        >
                                                                            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-600 group-hover:text-card transition-all shadow-sm">
                                                                                <AlertCircle className="w-4 h-4" />
                                                                            </div>
                                                                            <span>Cancelar Lançamento</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </>,
                                                            document.body
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
                </div>

                {/* Pagination with responsiveness - only show for movements view */}
                {viewMode === 'movements' && totalPages > 1 && (
                    <div className="px-8 py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">
                            Mostrando <span className="text-text-primary">{movements.length}</span> de <span className="text-text-primary">{total}</span> registros
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:text-brand-600 hover:border-brand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center px-4 h-10 rounded-xl bg-background border border-border text-xs font-black text-text-secondary tracking-widest">
                                PÁGINA {page} / {totalPages}
                            </div>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-text-secondary hover:text-brand-600 hover:border-brand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals outside of the main flow for portal/z-index clarity */}
            {sharingMovement && sharingMovement.created_at && (
                <MovementDetailsModal
                    clientId={(sharingMovement as any).client_id || (sharingMovement as any).client?.id || null}
                    customerName={(sharingMovement as any).notes?.startsWith('Romaneio: ') ? (sharingMovement as any).notes.replace('Romaneio: ', '').trim() : ((sharingMovement as any).notes || 'Detalhes da Movimentação')}
                    createdAt={sharingMovement.created_at}
                    items={[{
                        selectedKey: `mov-${sharingMovement.id}`,
                        id: sharingMovement.product_id,
                        name: sharingMovement.product_name,
                        barcode: sharingMovement.product_barcode_snapshot,
                        quantity: sharingMovement.quantity,
                        unit: sharingMovement.unit_snapshot || 'UN',
                        price: sharingMovement.unit_price_snapshot ?? sharingMovement.product_price ?? 0,
                        image: sharingMovement.product_image,
                        color: sharingMovement.product_color_snapshot || null,
                        size: sharingMovement.product_size_snapshot || null
                    }]}
                    onClose={() => setSharingMovement(null)}
                    onExport={(cid) => {
                        if (!sharingMovement) return;
                        setExportingMovement({
                            clientId: cid,
                            customerName: (sharingMovement as any).client?.name || (sharingMovement.notes?.startsWith('Romaneio: ') ? sharingMovement.notes.replace('Romaneio: ', '').trim() : (sharingMovement.notes || 'Consumidor')),
                            createdAt: sharingMovement.created_at,
                            phone: (sharingMovement as any).client?.phone || null,
                            image: sharingMovement.product_image,
                            items: [{
                                selectedKey: `mov-${sharingMovement.id}`,
                                id: sharingMovement.product_id,
                                name: sharingMovement.product_name,
                                barcode: sharingMovement.product_barcode_snapshot,
                                quantity: sharingMovement.quantity,
                                unit: sharingMovement.unit_snapshot || 'UN',
                                price: sharingMovement.unit_price_snapshot ?? sharingMovement.product_price ?? 0,
                                image: sharingMovement.product_image,
                                color: sharingMovement.product_color_snapshot || null,
                                size: sharingMovement.product_size_snapshot || null
                            }],
                            discount: sharingMovement.discount_snapshot || 0
                        })
                        setSharingMovement(null)
                    }}
                />
            )}

            {exportingMovement && exportingMovement.createdAt && (
                <RomaneioExportModal
                    isOpen={!!exportingMovement}
                    clientId={exportingMovement.clientId}
                    customerName={exportingMovement.customerName}
                    customerPhone={exportingMovement.phone}
                    items={exportingMovement.items}
                    createdAt={exportingMovement.createdAt}
                    discount={exportingMovement.discount}
                    title="Exportar Romaneio"
                    onClose={() => setExportingMovement(null)}
                />
            )}

            <ConfirmModal
                isOpen={cancelModal.isOpen}
                onClose={() => setCancelModal({ isOpen: false, id: null })}
                onConfirm={() => cancelModal.id && handleCancelMovement(cancelModal.id)}
                title="Cancelar Movimentação?"
                message="Deseja realmente cancelar esta movimentação? O saldo do produto será revertido automaticamente e este registro ficará marcado como cancelado no histórico."
                confirmText="Sim, Cancelar"
                cancelText="Não, Voltar"
                type="danger"
                loading={cancelling}
            />
        </div>
    )
}
