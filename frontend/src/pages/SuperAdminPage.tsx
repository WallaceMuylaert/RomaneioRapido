import { useState, useEffect } from 'react'
import api from '../services/api'
import LoadingOverlay from '../components/LoadingOverlay'
import { toast } from 'react-hot-toast'
import { 
    ShieldCheck, 
    UserCog, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    Filter,
    Search,
    Users,
    Key
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
}

export default function SuperAdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [planFilter, setPlanFilter] = useState('all')
    const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
    const [passwordModalOpen, setPasswordModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [newPassword, setNewPassword] = useState('')

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users')
            setUsers(res.data)
        } catch (err) {
            console.error('Erro ao buscar usuários:', err)
            toast.error('Erro ao carregar lista de usuários')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleUpdateUser = async (user: User, field: keyof User | 'password', value: any) => {
        setUpdatingUserId(user.id)
        try {
            await api.patch(`/admin/users/${user.id}`, { [field]: value })
            toast.success(`${field === 'password' ? 'Senha' : 'Usuário'} atualizado!`)
            if (field === 'password') setPasswordModalOpen(false)
            fetchUsers()
        } catch (err: any) {
            console.error('Erro ao atualizar:', err)
            
            // Tratamento robusto de erros do FastAPI/Pydantic
            let errorMsg = 'Erro ao atualizar'
            const detail = err.response?.data?.detail
            
            if (typeof detail === 'string') {
                errorMsg = detail
            } else if (Array.isArray(detail)) {
                // Erros de validação do Pydantic (422) vêm como array de objetos
                errorMsg = detail.map((d: any) => d.msg || d.type).join(', ')
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message
            }

            toast.error(errorMsg)
        } finally {
            setUpdatingUserId(null)
            setNewPassword('')
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             u.email.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesPlan = planFilter === 'all' || u.plan_id === planFilter
        return matchesSearch && matchesPlan
    })

    const plans = ['trial', 'basic', 'plus', 'pro', 'enterprise']

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {loading && <LoadingOverlay message="Carregando base de usuários..." />}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-brand-600" />
                        Gerenciamento de Usuários
                    </h1>
                    <p className="text-sm font-semibold text-slate-400">Controle total sobre clientes, planos e acessos do sistema.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-80 h-12 pl-12 pr-4 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold shadow-sm transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* FILTROS RÁPIDOS */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-100/50 rounded-xl mr-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Planos:</span>
                </div>
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
            <div className="glass-card rounded-[2rem] overflow-hidden shadow-xl shadow-slate-200/50 border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Usuário</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Plano Ativo</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Cadastro</th>
                                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-right">Controles</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-sm font-bold text-slate-400 italic">
                                        Nenhum usuário encontrado com esses critérios.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                                                    {u.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                                                        {u.full_name}
                                                        {u.is_admin && (
                                                            <span title="Sistema Admin">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-medium truncate">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <select 
                                                value={u.plan_id}
                                                disabled={updatingUserId === u.id}
                                                onChange={(e) => handleUpdateUser(u, 'plan_id', e.target.value)}
                                                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all cursor-pointer hover:border-brand-300"
                                            >
                                                {plans.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-8 py-5">
                                            <button 
                                                onClick={() => handleUpdateUser(u, 'is_active', !u.is_active)}
                                                disabled={updatingUserId === u.id}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${u.is_active 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
                                                    : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100'}`}
                                            >
                                                {u.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                <span className="text-[10px] font-black uppercase tracking-wider">
                                                    {u.is_active ? 'Ativo' : 'Bloqueado'}
                                                </span>
                                            </button>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span className="text-xs font-semibold">
                                                    {u.created_at ? format(new Date(u.created_at), "dd MMM yyyy", { locale: ptBR }) : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {
                                                        setSelectedUser(u)
                                                        setPasswordModalOpen(true)
                                                    }}
                                                    className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-brand-50 hover:text-brand-600 transition-all"
                                                    title="Mudar Senha"
                                                >
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateUser(u, 'is_admin', !u.is_admin)}
                                                    disabled={updatingUserId === u.id}
                                                    className={`p-2 rounded-xl transition-all ${u.is_admin ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    title={u.is_admin ? "Remover Admin" : "Tornar Admin"}
                                                >
                                                    <UserCog className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* INFO FOOTER */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-brand-500/20 flex items-center justify-center border border-brand-500/30">
                        <Users className="w-7 h-7 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Estatísticas Rápidas</h3>
                        <p className="text-slate-400 text-sm font-medium italic">Base de dados sincronizada e segura.</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full md:w-auto">
                    <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total</p>
                        <p className="text-2xl font-black text-white">{users.length}</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Ativos</p>
                        <p className="text-2xl font-black text-brand-400">{users.filter(u => u.is_active).length}</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Pagantes</p>
                        <p className="text-2xl font-black text-emerald-400">{users.filter(u => u.plan_id !== 'trial' && u.plan_id !== 'enterprise').length}</p>
                    </div>
                    <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Bloqueados</p>
                        <p className="text-2xl font-black text-red-400">{users.filter(u => !u.is_active).length}</p>
                    </div>
                </div>
            </div>

            {/* MODAL MUDAR SENHA */}
            {passwordModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setPasswordModalOpen(false)} />
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
                                    <Key className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Alterar Senha</h3>
                                <p className="text-sm font-semibold text-slate-400">
                                    Defina uma nova senha para <span className="text-slate-600">{selectedUser.full_name}</span>.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Nova Senha</label>
                                    <input
                                        type="password"
                                        placeholder="No mínimo 8 caracteres..."
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full h-12 px-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 font-semibold transition-all"
                                        autoFocus
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 ml-1">* Deve conter pelo menos uma letra e um número.</p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="flex-1 h-12 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleUpdateUser(selectedUser, 'password', newPassword)}
                                    disabled={newPassword.length < 8 || updatingUserId !== null}
                                    className="flex-1 h-12 rounded-2xl font-bold bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-500/20 transition-all"
                                >
                                    {updatingUserId ? 'Salvando...' : 'Salvar Senha'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
