import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

interface AlertModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    message: string
    type?: AlertType
    confirmText?: string
}

const icons = {
    success: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
    error: <AlertCircle className="w-6 h-6 text-error" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning" />,
    info: <Info className="w-6 h-6 text-brand-500" />
}

const colors = {
    success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
    error: 'bg-error/10 border-error/20 text-red-900',
    warning: 'bg-warning/10 border-amber-100 text-amber-900',
    info: 'bg-brand-50 border-brand-100 text-blue-900'
}

const buttonColors = {
    success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    error: 'bg-error hover:bg-error shadow-red-200',
    warning: 'bg-warning hover:bg-warning shadow-amber-200',
    info: 'bg-primary hover:bg-primary-dark shadow-blue-200'
}

export default function AlertModal({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = 'Entendido'
}: AlertModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[1000] overflow-y-auto outline-none focus:outline-none">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={onClose}
                />

            {/* Modal Container */}
            <div className="relative bg-card/90 backdrop-blur-xl border border-card/20 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                <div className="p-8 pb-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm border ${colors[type]}`}>
                            {icons[type]}
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary/60 hover:text-text-secondary hover:bg-border/50 transition-all duration-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className="text-2xl font-black text-text-primary tracking-tight mb-2 leading-tight">
                        {title}
                    </h3>
                    <p className="text-text-secondary font-medium text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="p-8 pt-2">
                    <button
                        onClick={onClose}
                        className={`w-full h-14 rounded-2xl text-card font-black text-sm tracking-tight shadow-xl transition-all duration-300 active:scale-95 ${buttonColors[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
                </div>
            </div>
        </div>
    )
}
