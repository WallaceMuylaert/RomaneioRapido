import { useState, useEffect, useCallback } from 'react'
import api from '@/services/api'
import LoadingOverlay from '@/components/LoadingOverlay'
import UserManagementModal from '@/components/UserManagementModal'
import BulkEmailModal from '@/components/BulkEmailModal'
import { toast } from 'react-hot-toast'
import { 
    ShieldCheck, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Search,
    Users,
    Settings2,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    Mail
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface User {
    id: number
    email: string
    full_name: string
    plan_id: string
    is_active: boolean
    is_admin: boolean
    is_unlimited: boolean
    created_at: string
    trial_days?: number
    trial_expired?: boolean
    trial_days_remaining?: number | null
}

interface BulkEmailPayload {
    subject: string
    message: string
    recipient_scope: 'all' | 'active' | 'inactive'
    plan_id?: string
    exclude_admins: boolean
}

export default function SuperAdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [planFilter, setPlanFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
    const [managementModalOpen, setManagementModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [bulkEmailOpen, setBulkEmailOpen] = useState(false)
    const [sendingBulkEmail, setSendingBulkEmail] = useState(false)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await api.get('/admin/users', {
                params: {
                    page: currentPage,
                    size: 15,
                    search: searchQuery || undefined,
                    plan: planFilter === 'all' ? undefined : planFilter
                }
            })
            setUsers(res.data.items)
            setTotalPages(res.data.pages)
            setTotalCount(res.data.total)
        } catch (err) {
            console.error('Erro ao buscar usuários:', err)
            toast.error('Erro ao carregar lista de usuários', { id: 'admin-error' })
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchQuery, planFilter])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers()
        }, searchQuery ? 500 : 0) // Debounce search

        return () => clearTimeout(timer)
    }, [fetchUsers])

    const handleUpdateUser = async (field: keyof User | 'password', value: any) => {
        if (!selectedUser) return

        setUpdatingUserId(selectedUser.id)
        try {
            await api.put(`/admin/users/${selectedUser.id}`, { [field]: value })
            toast.success(`${field === 'password' ? 'Senha' : 'Usuário'} atualizado!`, { id: 'admin-success' })
            
            // Local update to avoid full refresh
            const updatedUsers = users.map(u => 
                u.id === selectedUser.id ? { ...u, [field]: value } : u
            )
            setUsers(updatedUsers)
            setSelectedUser({ ...selectedUser, [field]: value })
        } catch (err: any) {
            console.error('Erro ao atualizar:', err)
            let errorMsg = 'Erro ao atualizar'
            const detail = err.response?.data?.detail
            if (typeof detail === 'string') errorMsg = detail
            else if (Array.isArray(detail)) errorMsg = detail.map((d: any) => d.msg || d.type).join(', ')
            toast.error(errorMsg, { id: 'admin-error' })
        } finally {
            setUpdatingUserId(null)
        }
    }

    const handleBulkEmailSend = async (payload: BulkEmailPayload) => {
        setSendingBulkEmail(true)
        try {
            const res = await api.post('/admin/users/bulk-email', payload)
            const { total_recipients, sent, failed } = res.data
            toast.success(`Envio finalizado: ${sent}/${total_recipients} e-mails enviados${failed ? `, ${failed} falharam` : ''}.`, {
                duration: 5000
            })
            setBulkEmailOpen(false)
        } catch (err: any) {
            console.error('Erro ao enviar e-mail em massa:', err)
            let errorMsg = 'Erro ao enviar e-mail em massa'
            const detail = err.response?.data?.detail
            if (typeof detail === 'string') errorMsg = detail
            else if (Array.isArray(detail)) errorMsg = detail.map((d: any) => d.msg || d.type).join(', ')
            toast.error(errorMsg, { id: 'bulk-email-error', duration: 6000 })
        } finally {
            setSendingBulkEmail(false)
        }
    }

    const plans = ['trial', 'basic', 'plus', 'pro', 'api', 'enterprise', 'unlimited']
    const planTranslations: Record<string, string> = {
        trial: 'Teste Grátis',
        basic: 'Básico',
        plus: 'Plus',
        pro: 'Profissional',
        api: 'Acesso API',
        enterprise: 'Corporativo',
        unlimited: 'Ilimitado'
    }

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto pb-20">
                <LoadingOverlay message="Buscando usuários" rows={7} />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-text-primary tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-brand-600" />
                        Admin Master
                    </h1>
                    <p className="text-sm font-semibold text-text-secondary">Gerenciamento centralizado de acessos e assinaturas.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <button
                        onClick={() => setBulkEmailOpen(true)}
                        className="h-12 px-5 rounded-2xl bg-brand-600 text-card text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Mail className="w-4 h-4" />
                        Enviar E-mail
                    </button>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/60 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar nome ou email..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setCurrentPage(1) // Reset to page 1 on search
                            }}
                            className="w-full sm:w-80 h-12 pl-12 pr-4 text-sm bg-card border border-border rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* FILTROS RÁPIDOS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button 
                    onClick={() => {
                        setPlanFilter('all')
                        setCurrentPage(1)
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${planFilter === 'all' ? 'bg-brand-600 text-card shadow-md shadow-primary/20' : 'bg-card text-text-secondary border border-border hover:bg-background'}`}
                >
                    Todos
                </button>
                {plans.map(p => (
                    <button 
                        key={p}
                        onClick={() => {
                            setPlanFilter(p)
                            setCurrentPage(1)
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${planFilter === p ? 'bg-brand-600 text-card shadow-md shadow-primary/20' : 'bg-card text-text-secondary border border-border hover:bg-background'}`}
                    >
                        <span className="uppercase">{planTranslations[p] || p}</span>
                    </button>
                ))}
            </div>

            {/* TABLE */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-border flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-background/50">
                                <th className="px-10 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Usuário</th>
                                <th className="px-10 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Plano</th>
                                <th className="px-10 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest text-center">Status</th>
                                <th className="px-10 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest">Cadastro</th>
                                <th className="px-10 py-5 text-[10px] font-black text-text-secondary uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center text-sm font-bold text-text-secondary italic">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="hover:bg-background/30 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-border/50 border-2 border-card shadow-sm flex items-center justify-center text-text-secondary font-bold text-sm shrink-0">
                                                    {u.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-black text-text-primary truncate flex items-center gap-2 mb-0.5">
                                                        {u.full_name}
                                                        {(u.is_admin || u.is_unlimited) && (
                                                            <span className={`p-1 rounded-md ${u.is_admin ? 'bg-orange-50' : 'bg-brand-50'}`} title={u.is_admin ? 'Admin' : 'VIP Ilimitado'}>
                                                                <ShieldCheck className={`w-3.5 h-3.5 ${u.is_admin ? 'text-orange-600' : 'text-primary'}`} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-secondary font-semibold truncate">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                u.plan_id === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                                u.plan_id === 'trial' ? 'bg-border/50 text-text-secondary' : 
                                                'bg-brand-50 text-brand-700'
                                            }`}>
                                                {planTranslations[u.plan_id] || u.plan_id}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <div className="flex justify-center">
                                                {!u.is_active ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 text-error rounded-full border border-error/20">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Bloqueado</span>
                                                    </div>
                                                ) : u.trial_expired && !u.is_unlimited ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning rounded-full border border-amber-100">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Expirado</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Ativo</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-2 text-text-secondary">
                                                <Calendar className="w-4 h-4 opacity-50" />
                                                <span className="text-xs font-bold">
                                                    {u.created_at ? format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR }) : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button 
                                                onClick={() => {
                                                    setSelectedUser(u)
                                                    setManagementModalOpen(true)
                                                }}
                                                className="px-4 py-2 rounded-xl bg-text-primary text-card text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-2 ml-auto"
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                                Gerenciar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION CONTROLS */}
                {totalPages > 1 && (
                    <div className="px-10 py-6 bg-background/50 border-t border-border flex items-center justify-between">
                        <p className="text-xs font-bold text-text-secondary">
                            Mostrando <span className="text-text-primary">{users.length}</span> de <span className="text-text-primary">{totalCount}</span> usuários
                        </p>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1 || loading}
                                className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-background disabled:opacity-50 transition-all"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            
                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1
                                    // Show first, last, and pages around current
                                    if (
                                        pageNum === 1 || 
                                        pageNum === totalPages || 
                                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${
                                                    currentPage === pageNum 
                                                    ? 'bg-brand-600 text-card shadow-md shadow-primary/20' 
                                                    : 'bg-card text-text-secondary border border-border hover:bg-background'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        )
                                    } else if (
                                        pageNum === currentPage - 2 || 
                                        pageNum === currentPage + 2
                                    ) {
                                        return <span key={pageNum} className="text-text-secondary/60 font-bold px-1">...</span>
                                    }
                                    return null
                                })}
                            </div>

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages || loading}
                                className="w-10 h-10 rounded-xl border border-border bg-card flex items-center justify-center text-text-secondary hover:bg-background disabled:opacity-50 transition-all"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* INFO FOOTER */}
            <div className="bg-text-primary rounded-[2.5rem] p-10 text-card flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                        <Users className="w-8 h-8 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tight">Base de Dados</h3>
                        <p className="text-text-secondary text-sm font-semibold opacity-60">Total de {totalCount} usuários registrados.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <div className="px-8 py-4 bg-card/5 rounded-[2rem] border border-card/10 text-center">
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Página Atual</p>
                        <p className="text-2xl font-black text-brand-400">{currentPage} de {totalPages}</p>
                    </div>
                </div>

                {/* Decorative backgrounds */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
            </div>

            {/* MODAL DE GERENCIAMENTO */}
            {selectedUser && (
                <UserManagementModal
                    isOpen={managementModalOpen}
                    onClose={() => setManagementModalOpen(false)}
                    user={selectedUser}
                    onUpdate={handleUpdateUser}
                    updating={updatingUserId !== null}
                />
            )}

            <BulkEmailModal
                isOpen={bulkEmailOpen}
                onClose={() => setBulkEmailOpen(false)}
                onSend={handleBulkEmailSend}
                sending={sendingBulkEmail}
                totalCount={totalCount}
                plans={plans}
                planTranslations={planTranslations}
            />
        </div>
    )
}

