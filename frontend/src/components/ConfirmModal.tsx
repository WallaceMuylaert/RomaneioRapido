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

    const brandColor = type === 'danger' ? 'bg-error hover:bg-error' : 
                       type === 'warning' ? 'bg-warning hover:bg-warning' :
                       'bg-primary hover:bg-primary-dark'
    const iconColor = type === 'danger' ? 'text-error bg-error/10' : 
                      type === 'warning' ? 'text-warning bg-warning/10' :
                      'text-brand-500 bg-brand-50'

    return (
        <div className="fixed inset-0 z-[999] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />

                {/* Modal Container */}
                <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-xl ${iconColor}`}>
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 text-text-secondary/60 hover:text-text-secondary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            {message}
                        </p>
                    </div>

                    <div className="p-4 bg-background flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-10 text-sm font-semibold text-text-secondary bg-card border border-border rounded-xl hover:bg-background transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 h-10 text-sm font-semibold text-card rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${brandColor}`}
                        >
                            {loading && (
                                <div className="w-3 h-3 border-2 border-card/30 border-t-white rounded-full animate-spin" />
                            )}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
