import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { translateError } from '@/utils/errors'
import { Plus, Pencil, Trash2, X, Loader2, Tags, GripVertical, Check, MoreVertical, ArrowDownAZ, ArrowUp, ArrowDown } from 'lucide-react'
import ConfirmModal from '@/components/ConfirmModal'

interface Category {
    id: number
    name: string
    description: string | null
    position: number
}

export default function CategoriesPage() {
    const navigate = useNavigate()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)
    const [form, setForm] = useState({ name: '', description: '' })
    const [searchQuery, setSearchQuery] = useState('')
    const [focusedIndex, setFocusedIndex] = useState(-1)

    // Reorder state
    const [isReordering, setIsReordering] = useState(false)
    const [reorderList, setReorderList] = useState<Category[]>([])
    const [savingOrder, setSavingOrder] = useState(false)
    const [sortingAZ] = useState(false)

    // Drag state
    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

    const fetchCategories = async () => {
        try {
            const res = await api.get('/categories/')
            setCategories(res.data)
        } catch (err) {
            console.error('Erro ao buscar categorias:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchCategories() }, [])

    const openCreate = () => {
        setEditing(null)
        setForm({ name: '', description: '' })
        setModalOpen(true)
    }

    const openEdit = (c: Category) => {
        setEditing(c)
        setForm({ name: c.name, description: c.description || '' })
        setModalOpen(true)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { name: form.name, description: form.description || null }
            if (editing) {
                await api.put(`/categories/${editing.id}`, payload)
            } else {
                await api.post('/categories/', payload)
            }
            setModalOpen(false)
            fetchCategories()
            toast.success('Categoria salva com sucesso!', { id: 'category-success' })
        } catch (err: any) {
            toast.error(translateError(err.response?.data?.detail) || 'Erro ao salvar categoria', { id: 'category-error' })
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/categories/${id}`)
            setDeleteConfirm(null)
            fetchCategories()
        } catch (err) {
            console.error('Erro ao deletar categoria:', err)
        }
    }

    // Reorder functions
    const startReorder = () => {
        setReorderList([...categories])
        setIsReordering(true)
    }

    const cancelReorder = () => {
        setReorderList([])
        setIsReordering(false)
        setDragIndex(null)
        setDragOverIndex(null)
    }

    const saveOrder = async () => {
        setSavingOrder(true)
        try {
            const items = reorderList.map((cat, i) => ({ id: cat.id, position: i }))
            await api.post('/categories/reorder', { items })
            setIsReordering(false)
            setReorderList([])
            fetchCategories()
            toast.success('Nova ordem salva com sucesso!', { id: 'category-reorder-success' })
        } catch (err) {
            console.error('Erro ao salvar ordem:', err)
            toast.error('Erro ao salvar a nova ordem', { id: 'category-error' })
        } finally {
            setSavingOrder(false)
        }
    }

    const sortAZ = () => {
        if (reorderList.length < 2) return
        const sorted = [...reorderList].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        setReorderList(sorted)
        toast.success('Categorias ordenadas de A-Z (clique em Salvar para confirmar)', { id: 'category-success' })
    }

    const moveCategory = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= reorderList.length || fromIndex === toIndex) return
        const newList = [...reorderList]
        const [movedItem] = newList.splice(fromIndex, 1)
        newList.splice(toIndex, 0, movedItem)
        setReorderList(newList)
    }

    // Drag and Drop handlers
    const handleDragStart = (index: number) => {
        dragItem.current = index
        setDragIndex(index)
    }

    const handleDragEnter = (index: number) => {
        dragOverItem.current = index
        setDragOverIndex(index)
    }

    const handleDragEnd = () => {
        if (dragItem.current === null || dragOverItem.current === null) {
            setDragIndex(null)
            setDragOverIndex(null)
            return
        }
        const newList = [...reorderList]
        const draggedItem = newList.splice(dragItem.current, 1)[0]
        newList.splice(dragOverItem.current, 0, draggedItem)
        setReorderList(newList)
        dragItem.current = null
        dragOverItem.current = null
        setDragIndex(null)
        setDragOverIndex(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (filteredCategories.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex(prev => (prev < filteredCategories.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0) {
                e.preventDefault()
                navigate(`/categorias/${filteredCategories[focusedIndex].id}`)
            }
        } else if (e.key === 'Escape') {
            setFocusedIndex(-1)
        }
    }

    const gridRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (focusedIndex >= 0 && gridRef.current) {
            const item = gridRef.current.children[focusedIndex] as HTMLElement
            if (item) {
                item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [focusedIndex])

    const displayList = isReordering ? reorderList : filteredCategories

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-text-primary">Categorias</h1>
                        <p className="text-sm text-text-secondary">{categories.length} categoria{categories.length !== 1 ? 's' : ''}</p>
                    </div>
                    {!isReordering && (
                        <div className="relative w-full sm:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar categoria..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    setFocusedIndex(-1)
                                }}
                                onKeyDown={handleSearchKeyDown}
                                className="h-9 pl-8 pr-3 text-xs bg-border/50 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-card w-full sm:w-48 transition-all"
                            />
                            <Tags className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {!isReordering ? (
                        <>
                            {categories.length > 1 && (
                                <button
                                    onClick={startReorder}
                                    className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold border border-border bg-card text-text-secondary rounded-lg hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <GripVertical className="w-4 h-4" /> Reorganizar
                                </button>
                            )}
                            <button onClick={openCreate} className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold bg-primary text-card rounded-lg hover:bg-primary-dark transition-colors shadow-sm flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> Nova Categoria
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={sortAZ}
                                disabled={sortingAZ || savingOrder}
                                className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold border border-blue-200 text-primary-dark bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                <ArrowDownAZ className="w-4 h-4" /> A-Z
                            </button>
                            <button
                                onClick={cancelReorder}
                                className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold border border-border text-text-secondary rounded-lg hover:bg-background transition-colors flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                            <button
                                onClick={saveOrder}
                                disabled={savingOrder || sortingAZ}
                                className="h-9 flex-1 sm:flex-none px-4 text-[13px] font-semibold bg-emerald-600 text-card rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {savingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Salvar Ordem
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isReordering && (
                <div className="mb-4 rounded-2xl border border-brand-100 bg-card p-4 text-sm text-text-secondary">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-primary">
                            <GripVertical className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-black text-text-primary">Reorganize a ordem das categorias</p>
                            <p className="mt-1 text-xs font-semibold leading-5 text-text-secondary">
                                No computador, arraste os itens. No celular, use as setas para subir ou descer e depois salve a ordem.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 relative min-h-[300px]">
                    <LoadingOverlay message="Buscando Categorias..." />
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin opacity-20" />
                </div>
            ) : categories.length === 0 ? (
                <div className="text-center py-20">
                    <Tags className="w-12 h-12 text-text-secondary/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-text-secondary">Nenhuma categoria</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Crie categorias para organizar seus produtos</p>
                </div>
            ) : isReordering ? (
                /* Reorder Mode: Drag and Drop */
                <div className="space-y-2">
                    {displayList.map((c, index) => (
                        <div
                            key={c.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            className={`
                                bg-card rounded-2xl border p-3 sm:p-4 flex items-center gap-3 sm:gap-4 cursor-grab active:cursor-grabbing select-none
                                transition-all duration-200
                                ${dragIndex === index ? 'opacity-40 scale-95 border-blue-300 shadow-lg' : 'border-border shadow-sm hover:shadow-md'}
                                ${dragOverIndex === index && dragIndex !== index ? 'border-blue-400 border-2 bg-brand-50/30' : ''}
                            `}
                        >
                            <div className="hidden sm:flex text-text-secondary/60 hover:text-text-secondary transition-colors">
                                <GripVertical className="w-5 h-5" />
                            </div>
                            <div className="w-9 h-9 rounded-xl border border-border bg-background text-text-secondary flex items-center justify-center text-sm font-black shrink-0">
                                {index + 1}
                            </div>
                            <div className="w-10 h-10 rounded-xl border border-brand-100 bg-brand-50 text-primary flex items-center justify-center shrink-0">
                                <Tags className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-text-primary">{c.name}</h3>
                                {c.description && <p className="text-xs text-text-secondary mt-0.5 truncate">{c.description}</p>}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => moveCategory(index, index - 1)}
                                    disabled={index === 0}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-text-secondary transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                                    title="Subir categoria"
                                    aria-label={`Subir ${c.name}`}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => moveCategory(index, index + 1)}
                                    disabled={index === displayList.length - 1}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-text-secondary transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-35"
                                    title="Descer categoria"
                                    aria-label={`Descer ${c.name}`}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayList.map((c, index) => (
                        <div
                            key={c.id}
                            onClick={() => navigate(`/categorias/${c.id}`)}
                            className={`bg-card rounded-xl border p-6 hover:shadow-md transition-all group cursor-pointer flex flex-col items-center text-center relative ${focusedIndex === index ? 'ring-2 ring-brand-500 border-brand-500 shadow-lg scale-[1.02] bg-brand-50/10' : 'border-border'}`}
                        >
                            <div className="absolute right-2 top-2" onClick={(e) => e.stopPropagation()}>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                                        className="p-2 text-text-secondary hover:text-text-primary hover:bg-border/50 rounded-full transition-all"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {openMenuId === c.id && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                            <div className="absolute right-0 top-10 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:origin-bottom">
                                                <button
                                                    onClick={() => { openEdit(c); setOpenMenuId(null); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary hover:bg-background hover:text-brand-600 transition-colors text-left"
                                                >
                                                    <Pencil className="w-4 h-4" /> Editar
                                                </button>
                                                <button
                                                    onClick={() => { setDeleteConfirm(c.id); setOpenMenuId(null); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 transition-colors text-left"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Excluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:rotate-6 duration-300 shadow-sm shadow-primary/10">
                                <Tags className="w-6 h-6" />
                            </div>

                            <h3 className="text-sm font-bold text-text-primary group-hover:text-brand-600 transition-colors">{c.name}</h3>
                            {c.description && <p className="text-xs text-text-secondary mt-2 line-clamp-2 max-w-[200px]">{c.description}</p>}
                            <div className="mt-4 pt-4 border-t border-gray-50 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-brand-600">
                                Visualizar Produtos
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-base font-bold text-text-primary">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-text-secondary hover:text-text-secondary"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Nome *</label>
                                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full h-10 px-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-blue-400 transition-all"
                                    placeholder="Ex: Brinquedos" />
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
            {/* CONFIRM DELETE */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Excluir Categoria"
                message="Tem certeza que deseja excluir esta categoria? Os produtos vinculados a ela permanecerão, mas sem categoria definida."
                confirmText="Excluir"
                loading={loading}
            />
        </div>
    )
}
