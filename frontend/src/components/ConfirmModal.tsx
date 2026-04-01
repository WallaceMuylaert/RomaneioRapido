import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'info' | 'warning'
    loading?: boolean
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger',
    loading = false
}: ConfirmModalProps) {
    if (!isOpen) return null

    const brandColor = type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                       type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                       'bg-blue-600 hover:bg-blue-700'
    const iconColor = type === 'danger' ? 'text-red-500 bg-red-50' : 
                      type === 'warning' ? 'text-amber-500 bg-amber-50' :
                      'text-blue-500 bg-blue-50'

    return (
        <div className="fixed inset-0 z-[999] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${iconColor}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="p-4 bg-slate-50 flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-10 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 h-10 text-sm font-semibold text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${brandColor}`}
                        >
                            {loading && (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
