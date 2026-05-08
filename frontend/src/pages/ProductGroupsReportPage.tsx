import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Layers, Printer, ChevronRight } from 'lucide-react'

interface Item {
    group_id: number | null
    group_code: string | null
    group_name: string
    products_count: number
    total_stock: number
    total_value: number
}

interface Report {
    items: Item[]
    total_groups: number
    total_products: number
    total_stock: number
    total_value: number
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export default function ProductGroupsReportPage() {
    const navigate = useNavigate()
    const [report, setReport] = useState<Report | null>(null)
    const [loading, setLoading] = useState(true)
    const [includeUngrouped, setIncludeUngrouped] = useState(true)

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await api.get('/product-groups/stock-report', {
                params: { include_ungrouped: includeUngrouped }
            })
            setReport(res.data)
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao carregar relatório', { id: 'group-error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchReport() }, [includeUngrouped])

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
                <title>Estoque por Grupo</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: -apple-system, sans-serif; padding: 40px; color: #1f2937; }
                    h1 { font-size: 22px; }
                    .meta { color: #6b7280; font-size: 12px; margin-top: 8px; }
                    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
                    .stat { padding: 16px; border-radius: 12px; background: #f9fafb; }
                    .stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #6b7280; }
                    .stat-value { font-size: 20px; font-weight: 800; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                    th { font-size: 11px; text-transform: uppercase; text-align: left; padding: 10px; background: #f9fafb; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
                    td { padding: 10px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
                    .right { text-align: right; }
                    .center { text-align: center; }
                    tr.total td { font-weight: 800; background: #f9fafb; }
                </style>
            </head>
            <body>
                <h1>Estoque Geral por Grupo</h1>
                <div class="meta">Gerado em ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}</div>
                <div class="stats">
                    <div class="stat"><div class="stat-label">Grupos</div><div class="stat-value">${report.total_groups}</div></div>
                    <div class="stat"><div class="stat-label">Variações</div><div class="stat-value">${report.total_products}</div></div>
                    <div class="stat"><div class="stat-label">Estoque</div><div class="stat-value">${report.total_stock.toFixed(0)}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Grupo</th>
                            <th class="center">Variações</th>
                            <th class="right">Estoque</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.items.map(i => `
                            <tr>
                                <td>${i.group_code || '—'}</td>
                                <td>${i.group_name}</td>
                                <td class="center">${i.products_count}</td>
                                <td class="right">${i.total_stock.toFixed(0)}</td>
                            </tr>
                        `).join('')}
                        <tr class="total">
                            <td colspan="2">TOTAL</td>
                            <td class="center">${report.total_products}</td>
                            <td class="right">${report.total_stock.toFixed(0)}</td>
                        </tr>
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
        return <div className="py-4"><LoadingOverlay message="Gerando relatório" rows={4} /></div>
    }

    if (!report) return null

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                <button
                    onClick={() => navigate('/grupos')}
                    className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-border bg-card text-text-secondary hover:border-brand-200 hover:text-brand-700 transition-colors"
                    title="Voltar"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base sm:text-xl font-bold text-text-primary truncate">Estoque por Grupo</h1>
                    <p className="text-[11px] sm:text-xs text-text-secondary mt-0.5 truncate">Visão consolidada de todas as variações somadas por grupo</p>
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
                <label className="basis-full sm:basis-auto sm:order-none order-last flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer select-none">
                    <input type="checkbox" checked={includeUngrouped} onChange={(e) => setIncludeUngrouped(e.target.checked)} />
                    Incluir sem grupo
                </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Grupos</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-text-primary mt-1 truncate">{report.total_groups}</div>
                </div>
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Variações</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-text-primary mt-1 truncate">{report.total_products}</div>
                </div>
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Estoque</div>
                    <div className="text-lg sm:text-2xl font-extrabold text-text-primary mt-1 truncate">{report.total_stock.toFixed(0)}</div>
                </div>
                <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0">
                    <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-text-secondary leading-tight">Valor Total</div>
                    <div className="text-sm sm:text-2xl font-extrabold text-emerald-600 mt-1 truncate">{formatCurrency(report.total_value)}</div>
                </div>
            </div>

            {report.items.length === 0 ? (
                <div className="text-center py-20">
                    <Layers className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhum grupo com produtos</p>
                </div>
            ) : (
                <>
                    {/* Mobile: cards */}
                    <div className="grid gap-2 md:hidden">
                        {report.items.map((i, idx) => {
                            const clickable = i.group_id != null
                            return (
                                <button
                                    key={i.group_id ?? `none-${idx}`}
                                    type="button"
                                    onClick={() => clickable && navigate(`/grupos/${i.group_id}`)}
                                    disabled={!clickable}
                                    className={`text-left rounded-2xl border border-border bg-card p-3 shadow-sm transition-all ${clickable ? 'hover:border-brand-200 active:scale-[0.99]' : 'opacity-90'}`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="min-w-0 flex-1">
                                            {i.group_code && (
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600/80">{i.group_code}</div>
                                            )}
                                            <p className="text-sm font-bold text-text-primary leading-snug truncate">{i.group_name}</p>
                                        </div>
                                        {clickable && <ChevronRight className="w-4 h-4 text-text-secondary shrink-0 mt-1" />}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-2 mt-2">
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-text-secondary">Variações</p>
                                            <p className="text-xs font-bold text-text-primary mt-0.5">{i.products_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold uppercase text-text-secondary">Estoque</p>
                                            <p className="text-xs font-bold text-text-primary mt-0.5">{i.total_stock.toFixed(0)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold uppercase text-text-secondary">Total</p>
                                            <p className="text-xs font-extrabold text-emerald-600 mt-0.5 truncate">{formatCurrency(i.total_value)}</p>
                                        </div>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Desktop: tabela */}
                    <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-background/50">
                                <tr>
                                    <th className="text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Código</th>
                                    <th className="text-left text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Grupo</th>
                                    <th className="text-center text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Variações</th>
                                    <th className="text-center text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Estoque</th>
                                    <th className="text-right text-[11px] font-bold uppercase tracking-wider text-text-secondary px-4 py-3">Valor Total</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.items.map((i, idx) => {
                                    const clickable = i.group_id != null
                                    return (
                                        <tr
                                            key={i.group_id ?? `none-${idx}`}
                                            onClick={() => clickable && navigate(`/grupos/${i.group_id}`)}
                                            className={`border-t border-border/50 ${clickable ? 'hover:bg-background/50 cursor-pointer' : ''} transition-colors`}
                                        >
                                            <td className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand-600/80">{i.group_code || '—'}</td>
                                            <td className="px-4 py-3 text-sm font-semibold text-text-primary">{i.group_name}</td>
                                            <td className="px-4 py-3 text-sm text-center text-text-primary">{i.products_count}</td>
                                            <td className="px-4 py-3 text-sm text-center text-text-primary">{i.total_stock.toFixed(0)}</td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">{formatCurrency(i.total_value)}</td>
                                            <td className="px-2 py-3 text-text-secondary">
                                                {clickable && <ChevronRight className="w-4 h-4" />}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    )
}
