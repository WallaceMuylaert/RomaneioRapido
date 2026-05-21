/**
 * Página principal de NF-e: lista, emite e abre o DANFE (prévia).
 *
 * Acesso restrito a administradores. A criação de rascunhos delega ao
 * formulário inline `NFeDraftForm` (mantém SRP do componente).
 */
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Navigate } from 'react-router-dom'
import { FileText, Plus, Printer, Send, X } from 'lucide-react'
import LoadingOverlay from '@/components/LoadingOverlay'
import DanfeDocument from '@/components/fiscal/DanfeDocument'
import NFeDraftForm from '@/components/fiscal/NFeDraftForm'
import { fiscalApi, type DanfeData, type NFeResponse } from '@/services/fiscal'
import { translateError } from '@/utils/errors'
import { useAuth } from '@/context/AuthContext'

export default function NFePage() {
    const { user } = useAuth()
    const [items, setItems] = useState<NFeResponse[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [issuingId, setIssuingId] = useState<number | null>(null)
    const [previewData, setPreviewData] = useState<DanfeData | null>(null)
    const [showForm, setShowForm] = useState(false)

    const refresh = async () => {
        try {
            const result = await fiscalApi.listNFes({ per_page: 50 })
            setItems(result.items)
        } catch (err) {
            toast.error(translateError(err) || 'Erro ao listar NF-e.')
        }
    }

    useEffect(() => {
        ;(async () => {
            await refresh()
            setLoading(false)
        })()
    }, [])

    if (user && !user.is_admin) {
        return <Navigate to="/error" replace state={{ code: 403 }} />
    }

    const handleCreate = async (payload: Parameters<typeof fiscalApi.createDraft>[0]) => {
        try {
            setCreating(true)
            const draft = await fiscalApi.createDraft(payload)
            toast.success(`Rascunho criado (#${draft.id}).`)
            setShowForm(false)
            await refresh()
        } catch (err) {
            toast.error(translateError(err) || 'Falha ao criar rascunho.')
        } finally {
            setCreating(false)
        }
    }

    const handleIssue = async (nfe: NFeResponse) => {
        if (!confirm(`Emitir NF-e para ${nfe.destinatario_nome}? Esta ação envia o XML à SEFAZ.`)) return
        try {
            setIssuingId(nfe.id)
            const issued = await fiscalApi.issue(nfe.id)
            toast.success(`NF-e ${issued.numero} autorizada.`)
            await refresh()
        } catch (err) {
            toast.error(translateError(err) || 'Falha na transmissão à SEFAZ.')
        } finally {
            setIssuingId(null)
        }
    }

    const handlePreview = async (nfe: NFeResponse) => {
        try {
            const data = await fiscalApi.getDanfe(nfe.id)
            setPreviewData(data)
        } catch (err) {
            toast.error(translateError(err) || 'Falha ao carregar DANFE.')
        }
    }

    const totals = useMemo(() => ({
        autorizadas: items.filter((n) => n.status === 'autorizada').length,
        rascunhos: items.filter((n) => n.status === 'rascunho').length,
        rejeitadas: items.filter((n) => n.status === 'rejeitada').length,
    }), [items])

    if (loading) {
        return (
            <div className="p-6">
                <LoadingOverlay compact message="Carregando NF-e" />
            </div>
        )
    }

    if (previewData) {
        return <DanfePreviewView data={previewData} onClose={() => setPreviewData(null)} />
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Notas Fiscais Eletrônicas</h1>
                        <p className="text-sm text-text-secondary">
                            {totals.autorizadas} autorizadas · {totals.rascunhos} em rascunho · {totals.rejeitadas} rejeitadas
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setShowForm((v) => !v)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition-colors"
                >
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'Fechar' : 'Nova NF-e'}
                </button>
            </header>

            {showForm && (
                <NFeDraftForm saving={creating} onSubmit={handleCreate} />
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-background/60">
                        <tr className="text-left text-text-secondary">
                            <th className="px-4 py-3 font-semibold">#</th>
                            <th className="px-4 py-3 font-semibold">Destinatário</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Total</th>
                            <th className="px-4 py-3 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-text-secondary">
                                    Nenhuma NF-e cadastrada ainda.
                                </td>
                            </tr>
                        )}
                        {items.map((nfe) => (
                            <tr key={nfe.id} className="border-t border-border">
                                <td className="px-4 py-3 font-bold">
                                    {nfe.numero > 0 ? nfe.numero : '—'}
                                    <span className="text-xs text-text-secondary ml-1">/{nfe.serie}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-semibold text-text-primary">{nfe.destinatario_nome}</div>
                                    <div className="text-xs text-text-secondary">{nfe.destinatario_documento}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <StatusPill status={nfe.status} motivo={nfe.motivo_rejeicao} />
                                </td>
                                <td className="px-4 py-3 font-semibold">
                                    {nfe.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="inline-flex gap-2">
                                        {(nfe.status === 'rascunho' || nfe.status === 'rejeitada') && (
                                            <button
                                                onClick={() => handleIssue(nfe)}
                                                disabled={issuingId === nfe.id}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-60"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                {issuingId === nfe.id ? 'Enviando…' : 'Emitir'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handlePreview(nfe)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-text-primary hover:bg-background text-xs font-bold"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            DANFE
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function DanfePreviewView({ data, onClose }: { data: DanfeData; onClose: () => void }) {
    return (
        <div className="min-h-screen bg-background py-8">
            <div className="max-w-[210mm] mx-auto mb-4 flex items-center justify-between print:hidden">
                <button
                    onClick={onClose}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-text-primary hover:bg-card text-sm font-bold"
                >
                    <X className="w-4 h-4" /> Fechar prévia
                </button>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
                >
                    <Printer className="w-4 h-4" /> Imprimir (A4)
                </button>
            </div>
            <DanfeDocument data={data} />
        </div>
    )
}

function StatusPill({ status, motivo }: { status: string; motivo?: string | null }) {
    const map: Record<string, { label: string; cls: string }> = {
        rascunho: { label: 'Rascunho', cls: 'bg-border/40 text-text-secondary' },
        assinada: { label: 'Assinada', cls: 'bg-warning/10 text-warning border border-warning/30' },
        autorizada: { label: 'Autorizada', cls: 'bg-success/10 text-success border border-success/30' },
        rejeitada: { label: 'Rejeitada', cls: 'bg-error/10 text-error border border-error/30' },
        denegada: { label: 'Denegada', cls: 'bg-error/10 text-error border border-error/30' },
        cancelada: { label: 'Cancelada', cls: 'bg-border/40 text-text-secondary' },
        erro: { label: 'Erro', cls: 'bg-error/10 text-error border border-error/30' },
    }
    const conf = map[status] || { label: status, cls: 'bg-border/40 text-text-secondary' }
    return (
        <span title={motivo || undefined} className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded-full ${conf.cls}`}>
            {conf.label}
        </span>
    )
}
