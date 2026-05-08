import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Layers, Printer, AlertTriangle } from 'lucide-react'

interface Variant {
    product_id: number
    name: string
    sku: string | null
    barcode: string | null
    color: string | null
    size: string | null
    unit: string
    stock_quantity: number
    min_stock: number
    price: number
    is_low_stock: boolean
}

interface GroupSummary {
    id: number
    code: string
    name: string
    description: string | null
    products_count: number
    total_stock: number
    total_value: number
}

interface ReportResponse {
    group: GroupSummary
    variants: Variant[]
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export default function ProductGroupDetailPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const [report, setReport] = useState<ReportResponse | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchReport = async () => {
        if (!id) return
        setLoading(true)
        try {
            const res = await api.get(`/product-groups/${id}/stock-report`)
            setReport(res.data)
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao carregar grupo', { id: 'group-error' })
            navigate('/grupos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchReport() }, [id])

    const handlePrint = () => {
        if (!report) return
        const w = window.open('', '', 'width=900,height=800')
        if (!w) {
            toast.error('Bloqueador de popup impediu a impressão.')
            return
        }
        const now = new Date()
        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Estoque - ${report.group.name}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, sans-serif; padding: 40px; color: #1f2937; }
                    h1 { font-size: 22px; margin-bottom: 4px; }
                    .code { color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
                    .meta { color: #6b7280; font-size: 12px; margin-top: 8px; }
                    .stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
                    .stat { padding: 16px; border-radius: 12px; background: #f9fafb; }
                    .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
                    .stat-value { font-size: 22px; font-weight: 800; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th { font-size: 11px; text-transform: uppercase; text-align: left; padding: 10px; background: #f9fafb; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
                    td { padding: 10px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    .low { color: #dc2626; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="code">Grupo · ${report.group.code}</div>
                <h1>${report.group.name}</h1>
                ${report.group.description ? `<div class="meta">${report.group.description}</div>` : ''}
                <div class="meta">Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</div>
                <div class="stats">
                    <div class="stat"><div class="stat-label">Variações</div><div class="stat-value">${report.group.products_count}</div></div>
                    <div class="stat"><div class="stat-label">Estoque Total</div><div class="stat-value">${report.group.total_stock.toFixed(0)}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Variação</th>
                            <th>Cor</th>
                            <th>Tam.</th>
                            <th class="center">Qtd.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.variants.map(v => `
                            <tr>
                                <td>${v.name}<br/><span style="font-size:10px;color:#9ca3af;">${v.barcode || v.sku || '—'}</span></td>
                                <td>${v.color || '—'}</td>
                                <td>${v.size || '—'}</td>
                                <td class="center ${v.is_low_stock ? 'low' : ''}">${v.stock_quantity} ${v.unit}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `
        w.document.write(html)
        w.document.close()
        setTimeout(() => w.print(), 300)
    }

    if (loading) {
        return <div className="py-4"><LoadingOverlay message="Carregando grupo" rows={4} /></div>
    }

    if (!report) return null
    const { group, variants } = report

    return (
        <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <button
                    onClick={() => navigate('/grupos')}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border bg-card text-text-secondary hover:border-brand-200 hover:text-brand-700 transition-colors"
                    title="Voltar"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600/80">Grupo · {group.code}</div>
                    <h1 className="text-base sm:text-xl font-bold text-text-primary truncate">{group.name}</h1>
                    {group.description && <p className="text-xs text-text-secondary mt-0.5 truncate">{group.description}</p>}
                </div>
                <button
                    onClick={handlePrint}
                    className="h-9 w-9 sm:w-auto sm:px-4 shrink-0 text-[13px] font-semibold bg-primary text-card rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    aria-label="Imprimir relatório"
                    title="Imprimir relatório"
                >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Imprimir</span>
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Variações</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-text-primary mt-1 truncate">{group.products_count}</div>
                </div>
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Estoque</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-text-primary mt-1 truncate">{group.total_stock.toFixed(0)}</div>
                </div>
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Valor Total</div>
                    <div className="text-sm sm:text-2xl font-extrabold text-emerald-600 mt-1 truncate">{formatCurrency(group.total_value)}</div>
                </div>
            </div>

            {variants.length === 0 ? (
                <div className="text-center py-20">
                    <Layers className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhuma variação vinculada a este grupo</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Vá em Produtos e selecione este grupo ao cadastrar/editar uma variação</p>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="grid gap-2 md:hidden">
                        {variants.map(v => (
                            <div key={v.product_id} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-text-primary leading-snug">{v.name}</p>
                                        <p className="mt-0.5 text-[10px] font-mono text-text-secondary truncate">{v.barcode || v.sku || '—'}</p>
                                        {(v.color || v.size) && (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {v.color && <span className="rounded-md bg-border/50 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary">{v.color}</span>}
                                                {v.size && <span className="rounded-md bg-border/50 px-1.5 py-0.5 text-[10px] font-bold text-text-secondary uppercase">{v.size}</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        {v.is_low_stock ? (
                                            <span className="inline-flex items-center gap-1 text-error text-sm font-bold">
                                                <AlertTriangle className="w-3.5 h-3.5" /> {v.stock_quantity}
                                            </span>
                                        ) : (
                                            <span className="text-sm font-bold text-text-primary">{v.stock_quantity}</span>
                                        )}
                                        <span className="ml-1 text-[10px] font-bold uppercase text-text-secondary">{v.unit}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 border-t border-border/50 pt-2 mt-2">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase text-text-secondary">Preço</p>
                                        <p className="text-xs font-semibold text-text-secondary mt-0.5">{formatCurrency(v.price)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold uppercase text-text-secondary">Total</p>
                                        <p className="text-xs font-extrabold text-text-primary mt-0.5">{formatCurrency(v.stock_quantity * v.price)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop: tabela */}
                    <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-background/50">
                                <tr>
                                    <th className="text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Variação</th>
                                    <th className="text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Cor</th>
                                    <th className="text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Tam.</th>
                                    <th className="text-center text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Estoque</th>
                                    <th className="text-right text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Preço</th>
                                    <th className="text-right text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map(v => (
                                    <tr key={v.product_id} className="border-t border-border/50 hover:bg-background/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-semibold text-text-primary">
                                            <div>{v.name}</div>
                                            <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">{v.barcode || v.sku || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{v.color || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-text-secondary">{v.size || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-center font-bold">
                                            {v.is_low_stock ? (
                                                <span className="inline-flex items-center gap-1 text-error">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> {v.stock_quantity} {v.unit}
                                                </span>
                                            ) : (
                                                <span className="text-text-primary">{v.stock_quantity} {v.unit}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-text-secondary">{formatCurrency(v.price)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-bold text-text-primary">{formatCurrency(v.stock_quantity * v.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
