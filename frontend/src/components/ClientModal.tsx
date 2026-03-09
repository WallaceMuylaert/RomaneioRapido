import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import api from '../services/api'
import { toast } from 'react-hot-toast'
import { X } from 'lucide-react'
import { maskDocument, maskPhone } from '../utils/masks'
import { translateError } from '../utils/errors'

interface Client {
    id: number
    name: string
    phone: string | null
    document: string | null
    email: string | null
    notes: string | null
}

interface ClientModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (client: Client) => void
    editingClient?: Client | null
}

export default function ClientModal({ isOpen, onClose, onSuccess, editingClient }: ClientModalProps) {
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '',
        phone: '',
        document: '',
        email: '',
        notes: ''
    })

    useEffect(() => {
        if (editingClient) {
            setForm({
                name: editingClient.name,
                phone: editingClient.phone || '',
                document: editingClient.document || '',
                email: editingClient.email || '',
                notes: editingClient.notes || ''
            })
        } else {
            setForm({ name: '', phone: '', document: '', email: '', notes: '' })
        }
    }, [editingClient, isOpen])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                name: form.name.trim(),
                phone: form.phone.trim() || null,
                document: form.document.trim() || null,
                email: form.email.trim() || null,
                notes: form.notes.trim() || null,
            }

            let res
            if (editingClient) {
                res = await api.put(`/clients/${editingClient.id}`, payload)
            } else {
                res = await api.post('/clients/', payload)
            }

            toast.success(editingClient ? 'Cliente atualizado!' : 'Cliente cadastrado!')
            onSuccess(res.data)
            onClose()
        } catch (err: any) {
            const detail = err.response?.data?.detail
            toast.error(translateError(detail) || 'Erro ao salvar cliente')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !saving && onClose()} />

            <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 shadow-brand-900/20">
                <div className="px-8 py-6 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                        {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button
                        onClick={() => !saving && onClose()}
                        className="p-2 text-slate-400 hover:bg-white hover:text-slate-700 rounded-xl transition-all hover:shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8">
                    <div className="space-y-5">
                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">
                                Nome do Cliente *
                            </label>
                            <input
                                required
                                autoFocus
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                className="w-full h-12 px-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all placeholder-slate-400"
                                placeholder="Ex: João da Silva / Loja do Centro"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">
                                    CPF / CNPJ
                                </label>
                                <input
                                    value={form.document}
                                    onChange={e => setForm({ ...form, document: maskDocument(e.target.value) })}
                                    className="w-full h-12 px-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all placeholder-slate-400"
                                    placeholder="CPF ou CNPJ"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">
                                    Telefone / WhatsApp
                                </label>
                                <input
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: maskPhone(e.target.value) })}
                                    className="w-full h-12 px-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all placeholder-slate-400"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">
                                E-mail
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full h-12 px-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all placeholder-slate-400"
                                placeholder="contato@cliente.com"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">
                                Observações
                            </label>
                            <textarea
                                value={form.notes}
                                onChange={e => setForm({ ...form, notes: e.target.value })}
                                className="w-full p-4 text-sm font-semibold bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 focus:bg-white transition-all placeholder-slate-400 min-h-[100px] resize-y"
                                placeholder="Endereço de entrega, referências, etc."
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !form.name.trim()}
                            className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 disabled:bg-slate-300 disabled:shadow-none transition-all active:scale-95"
                        >
                            {saving ? 'Salvando...' : (editingClient ? 'Atualizar Cliente' : 'Salvar Cliente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
