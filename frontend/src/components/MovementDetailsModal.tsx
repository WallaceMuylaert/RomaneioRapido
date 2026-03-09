import { X, ShoppingBag, ArrowRight } from 'lucide-react'
import type { CartItem } from './RomaneioExportModal'

interface MovementDetailsModalProps {
    clientId: number | null
    customerName: string
    items: CartItem[]
    createdAt?: string | null
    onClose: () => void
    onExport: (clientId: number | null) => void
}

export default function MovementDetailsModal({ clientId, customerName, items, createdAt, onClose, onExport }: MovementDetailsModalProps) {
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
    const totalValue = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    const dateStr = createdAt ? new Date(createdAt).toLocaleString('pt-BR') : ''

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Detalhes do Pedido</h2>
                            {dateStr && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">{dateStr}</span>}
                        </div>
                        <p className="text-sm font-bold text-slate-400 mt-0.5">{customerName || 'Consumidor Final'}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-8 custom-scrollbar">
                    <div className="space-y-6">
                        {items.map((item, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-4 group">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:border-brand-100 transition-colors overflow-hidden shadow-sm">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm leading-tight">{item.name}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {item.barcode || 'Sem código'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right whitespace-nowrap">
                                    <p className="font-black text-slate-900 text-sm">
                                        {item.quantity} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                        {formatCurrency(item.price)} / unid
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Sumary */}
                <div className="p-8 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</p>
                            <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalValue)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peças</p>
                            <p className="text-lg font-black text-slate-900">{totalItems}</p>
                        </div>
                    </div>

                    <button
                        onClick={() => onExport(clientId)}
                        className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-900/10"
                    >
                        Exportar ou Imprimir
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
