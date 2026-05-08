import { useEffect, useState, type ComponentType } from 'react'
import { Lightbulb, X } from 'lucide-react'

interface DismissibleTipProps {
    storageKey: string
    title: string
    children: React.ReactNode
    icon?: ComponentType<{ className?: string }>
    className?: string
    restoreLabel?: string
}

const STORAGE_PREFIX = 'tip_dismissed:'

const isDismissed = (key: string) => {
    try {
        return localStorage.getItem(`${STORAGE_PREFIX}${key}`) === '1'
    } catch {
        return false
    }
}

const persistDismissal = (key: string) => {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${key}`, '1')
    } catch {
        // localStorage indisponível (modo privado, etc.) — falha silenciosa
    }
}

const clearDismissal = (key: string) => {
    try {
        localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
    } catch {
        // falha silenciosa
    }
}

export default function DismissibleTip({
    storageKey,
    title,
    children,
    icon: Icon = Lightbulb,
    className = '',
    restoreLabel = 'Ver dica',
}: DismissibleTipProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        if (isDismissed(storageKey)) {
            setVisible(false)
        }
    }, [storageKey])

    const handleDismiss = () => {
        persistDismissal(storageKey)
        setVisible(false)
    }

    const handleRestore = () => {
        clearDismissal(storageKey)
        setVisible(true)
    }

    if (!visible) {
        return (
            <div className={`flex justify-end ${className}`}>
                <button
                    type="button"
                    onClick={handleRestore}
                    aria-label={restoreLabel}
                    title={restoreLabel}
                    className="flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold text-text-secondary bg-card border border-border rounded-full hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-all shadow-sm"
                >
                    <Icon className="w-3 h-3" />
                    {restoreLabel}
                </button>
            </div>
        )
    }

    return (
        <div className={`relative rounded-2xl border border-brand-100 bg-card p-4 text-sm text-text-secondary ${className}`}>
            <button
                type="button"
                onClick={handleDismiss}
                aria-label="Ocultar dica"
                title="Ocultar dica"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary/70 hover:bg-border/50 hover:text-text-primary transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-start gap-3 pr-8">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-primary">
                    <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                    <p className="font-black text-text-primary">{title}</p>
                    <div className="mt-1 text-xs font-semibold leading-5 text-text-secondary space-y-1">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
