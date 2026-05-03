import React, { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { Plus, Pencil, Trash2, Search, Users, Phone, Mail, MoreVertical, Download, CheckSquare, Square } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import ClientModal from '../components/ClientModal'
import { maskPhone } from '../utils/masks'
import { getBase64FromUrl } from '../utils/imageUtils'
import logoImg from '../assets/romaneiorapido_logo.png'

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
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [logoBase64, setLogoBase64] = useState<string>('')

    useEffect(() => {
        getBase64FromUrl(logoImg).then(setLogoBase64).catch(console.error)
    }, [])

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
            toast.success('Cliente excluído com sucesso!', { id: 'client-success' })
        } catch (err) {
            console.error('Erro ao deletar cliente:', err)
            toast.error('Erro ao excluir cliente', { id: 'client-error' })
        }
    }

    const toggleSelectAll = async () => {
        if (selectedIds.length === totalClients && totalClients > 0) {
            setSelectedIds([])
        } else if (totalClients > clients.length) {
            // Se houver mais clientes do que mostrados na página, buscamos todos
            setLoading(true)
            try {
                const res = await api.get('/clients/', { params: { per_page: 100 } })
                const allIds = res.data.items.map((c: Client) => c.id)
                setSelectedIds(allIds)
            } catch (err) {
                console.error('Erro ao selecionar todos os clientes:', err)
                toast.error('Erro ao selecionar todos', { id: 'client-error' })
            } finally {
                setLoading(false)
            }
        } else {
            setSelectedIds(clients.map(c => c.id))
        }
    }

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleExportClientsPDF = async (exportType: 'all' | 'selected') => {
        try {
            let clientsToExport: Client[] = []

            if (exportType === 'selected') {
                clientsToExport = clients.filter(c => selectedIds.includes(c.id))
            } else {
                // Para "Todos", buscamos sem paginação para garantir que todos venham (limite de 100 no backend)
                const res = await api.get('/clients/', { params: { per_page: 100 } })
                clientsToExport = res.data.items
            }

            if (clientsToExport.length === 0) {
                toast.error('Nenhum cliente selecionado', { id: 'client-error' })
                return
            }

            const printWindow = window.open('', '', 'width=900,height=800')
            if (!printWindow) return

            const now = new Date()
            const timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0]
            const filename = `Relatorio_Clientes_${timestamp}`

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
                        .report-info { font-size: 14px; color: #6b7280; font-weight: 500; }

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
                            padding: 14px 16px; 
                            font-size: 13px; 
                            border-bottom: 1px solid #f3f4f6; 
                            vertical-align: middle;
                        }
                        .row-main { font-weight: 700; color: #111827; }
                        .row-sub { font-size: 11px; color: #6b7280; font-weight: 500; }

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
                            <div class="report-title">Relatório de Clientes</div>
                            <div class="report-info">${clientsToExport.length} clientes encontrados</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Documento</th>
                                <th>Contato</th>
                                <th>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${clientsToExport.map(c => `
                                <tr>
                                    <td>
                                        <div class="row-main">${c.name}</div>
                                        <div class="row-sub">ID: ${c.id}</div>
                                    </td>
                                    <td><p style="font-family: monospace; font-weight: bold;">${c.document || '—'}</p></td>
                                    <td>
                                        <div class="row-sub">${c.phone || '—'}</div>
                                        <div class="row-sub">${c.email || '—'}</div>
                                    </td>
                                    <td class="row-sub">${c.notes || '—'}</td>
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
            `
            printWindow.document.write(html)
            printWindow.document.close()
            setTimeout(() => printWindow.print(), 300)

        } catch (err) {
            console.error('Erro ao exportar clientes:', err)
            toast.error('Erro ao gerar relatório', { id: 'client-error' })
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {loading && <LoadingOverlay message="Carregando clientes..." />}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-brand-600" />
                        Gerenciar Clientes
                    </h1>
                    <p className="text-sm font-semibold text-text-secondary">Cadastre e organize seus clientes para emiti-los no romaneio.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => handleExportClientsPDF('selected')}
                            className="h-12 px-5 font-bold bg-brand-50 text-primary rounded-2xl hover:bg-brand-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            <span>Exportar Selecionados ({selectedIds.length})</span>
                        </button>
                    )}
                    <button
                        onClick={() => handleExportClientsPDF('all')}
                        className="h-12 px-5 font-bold bg-border/50 text-text-secondary rounded-2xl hover:bg-border transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exportar Todos</span>
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/60 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full sm:w-64 h-12 pl-12 pr-4 text-sm bg-card border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={openCreate}
                        className="h-12 px-6 font-bold bg-brand-600 text-card rounded-2xl hover:bg-brand-700 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group shrink-0 active:scale-95"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                        <span>Novo Cliente</span>
                    </button>
                </div>
            </div>

            {/* LIST */}
            <div className="glass-card rounded-xl sm:rounded-[2rem] overflow-hidden">
                <div className="hidden md:block overflow-x-auto min-h-[400px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-background/50">
                                <th className="px-8 py-4 w-10">
                                    <button
                                        onClick={toggleSelectAll}
                                        className="p-1 rounded-lg hover:bg-border transition-colors"
                                    >
                                        {selectedIds.length === totalClients && totalClients > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-brand-600" />
                                        ) : (
                                            <Square className="w-5 h-5 text-text-secondary/60" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Cliente</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Documento</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Contato</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Observação</th>
                                <th className="px-8 py-4 text-[10px] font-black text-text-secondary uppercase tracking-[0.15em] text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody ref={tableBodyRef} className="divide-y divide-slate-100">
                            {clients.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-sm font-bold text-text-secondary italic">
                                        Nenhum cliente {searchQuery ? 'encontrado' : 'cadastrado'}.
                                    </td>
                                </tr>
                            ) : (
                                clients.map((c, index) => (
                                    <tr
                                        key={c.id}
                                        className={`transition-colors border-b border-border/50 ${focusedIndex === index ? 'bg-brand-50 border-l-4 border-brand-500 shadow-inner' : selectedIds.includes(c.id) ? 'bg-brand-50/50' : 'hover:bg-background/50'}`}
                                    >
                                        <td className="px-8 py-5">
                                            <button
                                                onClick={() => toggleSelectOne(c.id)}
                                                className="p-1 rounded-lg hover:bg-border transition-colors"
                                            >
                                                {selectedIds.includes(c.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-brand-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-text-secondary/60" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-8 py-5" onClick={() => openEdit(c)}>
                                            <p className="font-bold text-text-primary text-sm truncate max-w-[200px]">{c.name}</p>
                                        </td>
                                        <td className="px-8 py-5" onClick={() => openEdit(c)}>
                                            <p className="font-mono text-xs font-bold text-text-secondary">{c.document || '—'}</p>
                                        </td>
                                        <td className="px-8 py-5 space-y-1">
                                            {c.phone && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                                                    <Phone className="w-3 h-3 text-brand-400" />
                                                    {maskPhone(c.phone)}
                                                </div>
                                            )}
                                            {c.email && (
                                                <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                                                    <Mail className="w-3 h-3 text-brand-400" />
                                                    {c.email}
                                                </div>
                                            )}
                                            {!c.phone && !c.email && <span className="text-text-secondary/60 text-xs italic">—</span>}
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-text-secondary italic truncate max-w-[200px]">{c.notes || '—'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="relative flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenuId(openMenuId === c.id ? null : c.id)
                                                    }}
                                                    className={`p-2.5 rounded-xl transition-all ${openMenuId === c.id ? 'text-brand-600 bg-brand-50' : 'text-text-secondary hover:text-text-primary hover:bg-border/50'}`}
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openMenuId === c.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                        <div className={`absolute right-0 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 py-2 animate-in fade-in zoom-in-95 duration-200 
                                                            ${index === clients.length - 1 && clients.length > 2 ? 'bottom-full mb-2 origin-bottom-right' : 'top-12 origin-top-right'}`}>
                                                            <button
                                                                onClick={() => { openEdit(c); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary hover:bg-background hover:text-brand-600 transition-colors"
                                                            >
                                                                <Pencil className="w-4 h-4" /> Editar
                                                            </button>
                                                            <button
                                                                onClick={() => { setDeleteConfirm(c.id); setOpenMenuId(null); }}
                                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error hover:bg-error/10 transition-colors"
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
                    {clients.length > 0 && <div className="h-20" />}
                </div>

                {/* Mobile View - Cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {clients.length === 0 ? (
                        <div className="py-20 text-center text-sm font-bold text-text-secondary italic">
                            Nenhum cliente {searchQuery ? 'encontrado' : 'cadastrado'}.
                        </div>
                    ) : (
                        clients.map((c) => (
                            <div
                                key={c.id}
                                className="p-4 space-y-3 active:bg-background transition-colors border-b border-border/50"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1 min-w-0" onClick={() => openEdit(c)}>
                                        <h3 className="font-bold text-text-primary text-sm truncate">{c.name}</h3>
                                        <p className="font-mono text-[10px] font-bold text-text-secondary uppercase tracking-widest">{c.document || 'Sem Documento'}</p>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setOpenMenuId(openMenuId === c.id ? null : c.id)
                                            }}
                                            className="p-2 bg-background text-text-secondary rounded-xl"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                        {openMenuId === c.id && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                <div className="absolute right-0 top-12 w-44 bg-card rounded-2xl shadow-2xl border border-border z-50 py-2 max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:bottom-4 max-sm:top-auto max-sm:w-auto max-sm:rounded-2xl">
                                                    <button
                                                        onClick={() => { openEdit(c); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-text-secondary"
                                                    >
                                                        <Pencil className="w-4 h-4" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => { setDeleteConfirm(c.id); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-error"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Excluir
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-text-secondary/60 uppercase tracking-tighter">Contato</p>
                                        <p className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
                                            <Phone className="w-3 h-3" />
                                            {c.phone ? maskPhone(c.phone) : '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-text-secondary/60 uppercase tracking-tighter">Email</p>
                                        <p className="text-xs font-bold text-text-secondary truncate flex items-center gap-1.5">
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
                    <div className="px-8 py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/30">
                        <p className="text-xs font-bold text-text-secondary order-2 sm:order-1">
                            Mostrando <span className="text-text-secondary">{(page - 1) * perPage + 1}–{Math.min(page * perPage, totalClients)}</span> de <span className="text-text-secondary">{totalClients}</span> clientes
                        </p>
                        <div className="flex items-center gap-2 order-1 sm:order-2">
                            <button
                                onClick={() => fetchClients(page - 1)}
                                disabled={page <= 1}
                                className="h-10 px-4 text-xs font-bold text-text-secondary bg-card border border-border rounded-xl hover:bg-background transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                            >
                                Anterior
                            </button>
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="text-text-secondary/60 px-1 font-bold">...</span>}
                                            <button
                                                onClick={() => fetchClients(p)}
                                                className={`w-10 h-10 text-xs font-bold rounded-xl transition-all shadow-sm ${p === page
                                                    ? 'bg-brand-600 text-card'
                                                    : 'bg-card text-text-secondary border border-border hover:border-brand-300 hover:text-brand-600'
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
                                className="h-10 px-4 text-xs font-bold text-text-secondary bg-card border border-border rounded-xl hover:bg-background transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
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
