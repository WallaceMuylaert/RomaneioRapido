import { useState, useEffect } from 'react'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'
import UserManagementModal from '../components/UserManagementModal'
import { toast } from 'react-hot-toast'
import { 
    ShieldCheck, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Search,
    Users,
    Settings2,
    AlertTriangle
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
    created_at: string
    trial_days?: number
    trial_expired?: boolean
    trial_days_remaining?: number | null
}

export default function SuperAdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [planFilter, setPlanFilter] = useState('all')
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
    const [managementModalOpen, setManagementModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users')
            setUsers(res.data)
        } catch (err) {
            console.error('Erro ao buscar usuários:', err)
            toast.error('Erro ao carregar lista de usuários', { id: 'admin-error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleUpdateUser = async (field: keyof User | 'password', value: any) => {
        if (!selectedUser) return

        setUpdatingUserId(selectedUser.id)
        try {
            await api.put(`/admin/users/${selectedUser.id}`, { [field]: value })
            toast.success(`${field === 'password' ? 'Senha' : 'Usuário'} atualizado!`, { id: 'admin-success' })
            
            // Refresh data
            const updatedUsers = users.map(u => 
                u.id === selectedUser.id ? { ...u, [field]: value } : u
            )
            setUsers(updatedUsers)
            // Update selected user to reflect changes in modal
            setSelectedUser({ ...selectedUser, [field]: value })
        } catch (err: any) {
            console.error('Erro ao atualizar:', err)
            let errorMsg = 'Erro ao atualizar'
            const detail = err.response?.data?.detail
            if (typeof detail === 'string') errorMsg = detail
            else if (Array.isArray(detail)) errorMsg = detail.map((d: any) => d.msg || d.type).join(', ')
            else if (err.response?.data?.message) errorMsg = err.response.data.message
            toast.error(errorMsg, { id: 'admin-error' })
        } finally {
            setUpdatingUserId(null)
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesPlan = planFilter === 'all' || u.plan_id === planFilter
        return matchesSearch && matchesPlan
    })

    const plans = ['trial', 'basic', 'plus', 'pro', 'api', 'enterprise']

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {loading && <LoadingOverlay message="Carregando base de usuários..." />}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-brand-600" />
                        Admin Master
                    </h1>
                    <p className="text-sm font-semibold text-slate-400">Gerenciamento centralizado de acessos e assinaturas.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar nome ou email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 h-12 pl-12 pr-4 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* FILTROS RÁPIDOS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button 
                    onClick={() => setPlanFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${planFilter === 'all' ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                >
                    Todos ({users.length})
                </button>
                {plans.map(p => {
                    const count = users.filter(u => u.plan_id === p).length
                    return (
                        <button 
                            key={p}
                            onClick={() => setPlanFilter(p)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${planFilter === p ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            <span className="uppercase">{p}</span>
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${planFilter === p ? 'bg-brand-500/50' : 'bg-slate-100'}`}>{count}</span>
                        </button>
                    )
                })}
            </div>

            {/* TABLE */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Plano</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cadastro</th>
                                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-24 text-center text-sm font-bold text-slate-400 italic">
                                        Nenhum usuário encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-10 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                                                    {u.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-slate-900 truncate flex items-center gap-2 mb-0.5">
                                                        {u.full_name}
                                                        {u.is_admin && (
                                                            <div className="p-1 rounded-md bg-orange-50" title="Admin">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
                                                            </div>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-semibold truncate">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                                                u.plan_id === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                                                u.plan_id === 'trial' ? 'bg-slate-100 text-slate-600' : 
                                                'bg-brand-50 text-brand-700'
                                            }`}>
                                                {u.plan_id}
                                            </span>
                                        </td>
                                        <td className="px-10 py-6 text-center">
                                            <div className="flex justify-center">
                                                {!u.is_active ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-full border border-red-100">
                                                        <XCircle className="w-3.5 h-3.5" />
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Bloqueado</span>
                                                    </div>
                                                ) : u.trial_expired ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
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
                                            <div className="flex items-center gap-2 text-slate-500">
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
                                                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-all flex items-center gap-2 ml-auto"
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
            </div>

            {/* INFO FOOTER */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-3xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                        <Users className="w-8 h-8 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black tracking-tight">Métricas Gerais</h3>
                        <p className="text-slate-400 text-sm font-semibold opacity-60">Visão panorâmica da plataforma.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-12 w-full lg:w-auto relative z-10">
                    {[
                        { label: 'Total', value: users.length, color: 'text-white' },
                        { label: 'Ativos', value: users.filter(u => u.is_active).length, color: 'text-brand-400' },
                        { label: 'Pagantes', value: users.filter(u => !['trial', 'enterprise'].includes(u.plan_id)).length, color: 'text-emerald-400' },
                        { label: 'Bloqueados', value: users.filter(u => !u.is_active).length, color: 'text-red-400' }
                    ].map(stat => (
                        <div key={stat.label} className="text-center lg:text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2">{stat.label}</p>
                            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
                        </div>
                    ))}
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
        </div>
    )
}

