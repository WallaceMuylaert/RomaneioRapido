import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { translateError } from '@/utils/errors'
import { Plus, Pencil, Trash2, X, Loader2, Layers, MoreVertical, Search, FileText } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'
import DismissibleTip from '@/components/DismissibleTip'

interface ProductGroup {
    id: number
    code: string
    name: string
    description: string | null
    products_count: number
    total_stock: number
    total_value: number
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

export default function ProductGroupsPage() {
    const navigate = useNavigate()
    const [groups, setGroups] = useState<ProductGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<ProductGroup | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)
    const [form, setForm] = useState({ code: '', name: '', description: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const gridRef = useRef<HTMLDivElement>(null)

    const fetchGroups = async () => {
        try {
            const res = await api.get('/product-groups/')
            setGroups(res.data)
        } catch (err) {
            console.error('Erro ao buscar grupos:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchGroups() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ code: '', name: '', description: '' })
        setModalOpen(true)
    }

    const openEdit = (g: ProductGroup) => {
        setEditing(g)
        setForm({ code: g.code, name: g.name, description: g.description || '' })
        setModalOpen(true)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                code: form.code.trim(),
                name: form.name.trim(),
                description: form.description.trim() || null,
            }
            if (editing) {
                await api.put(`/product-groups/${editing.id}`, payload)
            } else {
                await api.post('/product-groups/', payload)
            }
            setModalOpen(false)
            fetchGroups()
            toast.success('Grupo salvo com sucesso!', { id: 'group-success' })
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao salvar grupo', { id: 'group-error' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/product-groups/${id}`)
            setDeleteConfirm(null)
            fetchGroups()
            toast.success('Grupo excluído com sucesso!', { id: 'group-success' })
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao excluir grupo', { id: 'group-error' })
        }
    }

    const filtered = groups.filter(g =>
        g.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (filtered.length === 0) return
        if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(prev => Math.min(prev + 1, filtered.length - 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(prev => Math.max(prev - 1, 0)) }
        else if (e.key === 'Enter' && focusedIndex >= 0) {
            e.preventDefault()
            navigate(`/grupos/${filtered[focusedIndex].id}`)
        }
        else if (e.key === 'Escape') setFocusedIndex(-1)
    }

    useEffect(() => {
        if (focusedIndex >= 0 && gridRef.current) {
            const item = gridRef.current.children[focusedIndex] as HTMLElement
            if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        }
    }, [focusedIndex])

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Grupos de Produtos</h1>
                        <p className="text-sm text-text-secondary">{groups.length} grupo{groups.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="relative w-full sm:w-auto">
                        <input
                            type="text"
                            placeholder="Buscar grupo..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setFocusedIndex(-1) }}
                            onKeyDown={handleSearchKeyDown}
                            className="h-9 pl-8 pr-3 text-xs bg-border/50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-card w-full sm:w-48 transition-all"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/grupos/relatorio')}
                        className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold border border-border bg-card text-text-secondary rounded-lg hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> Relatório Agrupado
                    </button>
                    <button onClick={openCreate} className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold bg-primary text-card rounded-lg hover:bg-primary-dark transition-colors shadow-sm flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Novo Grupo
                    </button>
                </div>
            </div>

            <DismissibleTip
                storageKey="product-groups-purpose"
                title="Para que serve um grupo?"
                className="mb-5"
            >
                <p>
                    Use grupos para reunir <strong className="text-text-primary">variações do mesmo produto</strong> (ex.: <span className="font-mono uppercase tracking-wider">AIRFLOW DUNA</span> com cores preto, branco, azul, marinho, royal). O relatório do grupo soma o estoque de todas as variantes de uma vez.
                </p>
                <p>
                    Diferente de <span className="text-text-primary">Categorias</span>, que classifica produtos por tipo ou família (ex.: Tecidos Leves, Alfaiataria). Você pode usar os dois ao mesmo tempo no produto.
                </p>
            </DismissibleTip>

            {loading ? (
                <div className="py-4">
                    <LoadingOverlay message="Buscando grupos" rows={4} />
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-20">
                    <Layers className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhum grupo cadastrado</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Crie grupos para reunir variações de um mesmo produto (ex.: cores)</p>
                </div>
            ) : (
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((g, index) => (
                        <div
                            key={g.id}
                            onClick={() => navigate(`/grupos/${g.id}`)}
                            className={`bg-card rounded-xl border p-5 hover:shadow-md transition-all group cursor-pointer relative ${focusedIndex === index ? 'ring-2 ring-brand-500 border-brand-500 shadow-lg scale-[1.02]' : 'border-border'}`}
                        >
                            <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === g.id ? null : g.id)}
                                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-full transition-all"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openMenuId === g.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                            <div className="absolute right-0 top-10 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                                <button
                                                    onClick={() => { openEdit(g); setOpenMenuId(null) }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary hover:bg-background hover:text-brand-600 transition-colors text-left"
                                                >
                                                    <Pencil className="w-4 h-4" /> Editar
                                                </button>
                                                <button
                                                    onClick={() => { setDeleteConfirm(g.id); setOpenMenuId(null) }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 transition-colors text-left"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Excluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3 pr-8">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center transition-transform group-hover:scale-110 shrink-0">
                                    <Layers className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-brand-600/80 mb-0.5">{g.code}</div>
                                    <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-600 transition-colors truncate">{g.name}</h3>
                                    {g.description && (
                                        <p className="text-xs text-text-secondary mt-1 line-clamp-2">{g.description}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/50">
                                <div className="text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Variações</div>
                                    <div className="text-sm font-extrabold text-text-primary mt-0.5">{g.products_count}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Estoque</div>
                                    <div className="text-sm font-extrabold text-text-primary mt-0.5">{g.total_stock.toFixed(0)}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Valor</div>
                                    <div className="text-sm font-extrabold text-emerald-600 mt-0.5">{formatCurrency(g.total_value)}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-base font-bold text-text-primary">{editing ? 'Editar Grupo' : 'Novo Grupo'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-text-secondary hover:text-text-secondary"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Código *</label>
                                <input required maxLength={50} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all uppercase"
                                    placeholder="Ex: AIRFLOW" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome *</label>
                                <input required maxLength={150} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                    placeholder="Ex: Airflow Duna" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Descrição</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all resize-none"
                                    placeholder="Descrição opcional..." />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-10 text-sm font-medium text-text-secondary border border-border rounded-xl hover:bg-background transition-colors">Cancelar</button>
                                <button type="submit" disabled={saving} className="flex-1 h-10 text-sm font-semibold bg-primary text-card rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    {editing ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Excluir Grupo"
                message="Tem certeza que deseja excluir este grupo? Os produtos vinculados a ele permanecerão, mas sem grupo definido."
                confirmText="Excluir"
                loading={loading}
            />
        </div>
    )
}
