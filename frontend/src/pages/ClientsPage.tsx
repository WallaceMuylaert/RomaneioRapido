import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, MoreVertical } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import ClientModal from '../components/ClientModal'
import { maskPhone } from '../utils/masks'

interface Client {
    id: number
    name: string
    phone: string | null
    document: string | null
    email: string | null
    notes: string | null
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Client | null>(null)
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [openMenuId, setOpenMenuId] = useState<number | null>(null)
    const [focusedIndex, setFocusedIndex] = useState(-1)

    // Pagination state
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalClients, setTotalClients] = useState(0)
    const perPage = 10

    const fetchClients = async (p: number = page) => {
        try {
            const res = await api.get('/clients/', {
                params: {
                    search: searchQuery,
                    page: p,
                    per_page: perPage
                }
            })
            setClients(res.data.items)
            setTotalPages(res.data.pages)
            setTotalClients(res.data.total)
            setPage(res.data.page)
        } catch (err) {
            console.error('Erro ao buscar clientes:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const delaySearch = setTimeout(() => {
            setFocusedIndex(-1)
            fetchClients()
        }, 300)
        return () => clearTimeout(delaySearch)
    }, [searchQuery])

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (clients.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusedIndex(prev => (prev < clients.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === 'Enter') {
            if (focusedIndex >= 0) {
                e.preventDefault()
                openEdit(clients[focusedIndex])
            }
        } else if (e.key === 'Escape') {
            setFocusedIndex(-1)
        }
    }

    const tableBodyRef = useRef<HTMLTableSectionElement>(null)

    useEffect(() => {
        if (focusedIndex >= 0 && tableBodyRef.current) {
            const row = tableBodyRef.current.children[focusedIndex] as HTMLElement
            if (row) {
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [focusedIndex])

    const openCreate = () => {
        setEditing(null)
        setModalOpen(true)
    }

    const openEdit = (c: Client) => {
        setEditing(c)
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/clients/${id}`)
            setDeleteConfirm(null)
            fetchClients()
            toast.success('Cliente excluído com sucesso!')
        } catch (err) {
            console.error('Erro ao deletar cliente:', err)
            toast.error('Erro ao excluir cliente')
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {loading && <LoadingOverlay message="Carregando clientes..." />}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-brand-600" />
                        Gerenciar Clientes
                    </h1>
                    <p className="text-sm font-semibold text-slate-400">Cadastre e organize seus clientes para emiti-los no romaneio.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full sm:w-64 h-12 pl-12 pr-4 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="h-12 px-6 font-bold bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 group shrink-0 active:scale-95"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </div>

            {/* LIST */}
            <div className="glass-card rounded-[2rem]">
                <div className="overflow-x-auto min-h-[400px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cliente</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Documento</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Contato</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Observação</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef} className="divide-y divide-slate-100">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-sm font-bold text-slate-400 italic">
                                        Nenhum cliente {searchQuery ? 'encontrado' : 'cadastrado'}.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((c, index) => (
                                    <tr
                                        key={c.id}
                                        className={`transition-colors border-b border-slate-100/50 ${focusedIndex === index ? 'bg-brand-50 border-l-4 border-brand-500 shadow-inner' : 'hover:bg-slate-50/50'}`}
                                    >
                                        <td className="px-8 py-5" onClick={() => openEdit(c)}>
                                            <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">{c.name}</p>
                                        </td>
                                        <td className="px-8 py-5" onClick={() => openEdit(c)}>
                                            <p className="font-mono text-xs font-bold text-slate-500">{c.document || '—'}</p>
                                        </td>
                                        <td className="px-8 py-5 space-y-1">
                                            {c.phone && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                    <Phone className="w-3 h-3 text-brand-400" />
                                                    {maskPhone(c.phone)}
                                                </div>
                                            )}
                                            {c.email && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                                                    <Mail className="w-3 h-3 text-brand-400" />
                                                    {c.email}
                                                </div>
                                            )}
                                            {!c.phone && !c.email && <span className="text-slate-300 text-xs italic">—</span>}
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-slate-500 italic truncate max-w-[200px]">{c.notes || '—'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="relative flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenuId(openMenuId === c.id ? null : c.id)
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-all ${openMenuId === c.id ? 'text-brand-600 bg-brand-50' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openMenuId === c.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                        <div className={`absolute right-0 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200 
                                                            ${index === clients.length - 1 && clients.length > 2 ? 'bottom-full mb-2 origin-bottom-right' : 'top-12 origin-top-right'}`}>
                                                            <button
                                                                onClick={() => { openEdit(c); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-brand-600 transition-colors"
                                                            >
                                                                <Pencil className="w-4 h-4" /> Editar
                                                            </button>
                                                            <button
                                                                onClick={() => { setDeleteConfirm(c.id); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Excluir
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    {clients.length > 0 && <div className="h-32 md:h-20" />}
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {clients.length === 0 ? (
                        <div className="py-20 text-center text-sm font-bold text-slate-400 italic">
                            Nenhum cliente {searchQuery ? 'encontrado' : 'cadastrado'}.
                        </div>
                    ) : (
                        clients.map((c) => (
                            <div
                                key={c.id}
                                className="p-6 space-y-4 active:bg-slate-50 transition-colors border-b border-slate-100/50"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1 min-w-0" onClick={() => openEdit(c)}>
                                        <h3 className="font-bold text-slate-800 text-base truncate">{c.name}</h3>
                                        <p className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.document || 'Sem Documento'}</p>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setOpenMenuId(openMenuId === c.id ? null : c.id)
                                            }}
                                            className="p-2 bg-slate-50 text-slate-400 rounded-xl"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                        {openMenuId === c.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                <div className="absolute right-0 top-12 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 py-2">
                                                    <button
                                                        onClick={() => { openEdit(c); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600"
                                                    >
                                                        <Pencil className="w-4 h-4" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteConfirm(c.id); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Excluir
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Contato</p>
                                        <p className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                            <Phone className="w-3 h-3" />
                                            {c.phone ? maskPhone(c.phone) : '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">Email</p>
                                        <p className="text-xs font-bold text-slate-600 truncate flex items-center gap-1.5">
                                            <Mail className="w-3 h-3" />
                                            {c.email || '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                    <div className="px-8 py-6 border-t border-slate-100/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
                        <p className="text-xs font-bold text-slate-400 order-2 sm:order-1">
                            Mostrando <span className="text-slate-600">{(page - 1) * perPage + 1}–{Math.min(page * perPage, totalClients)}</span> de <span className="text-slate-600">{totalClients}</span> clientes
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <button
                                onClick={() => fetchClients(page - 1)}
                                disabled={page <= 1}
                                className="h-10 px-4 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                            >
                                Anterior
                            </button>
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-slate-300 px-1 font-bold">...</span>}
                                            <button
                                                onClick={() => fetchClients(p)}
                                                className={`w-10 h-10 text-xs font-bold rounded-xl transition-all shadow-sm ${p === page
                                                    ? 'bg-brand-600 text-white'
                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-brand-300 hover:text-brand-600'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>
                            <button
                                onClick={() => fetchClients(page + 1)}
                                disabled={page >= totalPages}
                                className="h-10 px-4 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                            >
                                Próximo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL CRIAR/EDITAR */}
            <ClientModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSuccess={() => fetchClients()}
                editingClient={editing}
            />
            {/* CONFIRM DELETE */}
            <ConfirmModal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                title="Excluir Cliente"
                message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                loading={loading}
            />
        </div>
    )
}
