interface LoadingOverlayProps {
    message?: string
    rows?: number
    compact?: boolean
}

const skeletonRows = (rows: number) => Array.from({ length: rows }, (_, index) => index)

export default function LoadingOverlay({ message = 'Carregando', rows = 5, compact = false }: LoadingOverlayProps) {
    if (compact) {
        return (
            <div role="status" aria-label={message} className="w-full max-w-3xl mx-auto animate-pulse space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-border/80" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-2/5 rounded-md bg-border/90" />
                        <div className="h-3 w-3/5 rounded-md bg-border/60" />
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-20 rounded-2xl border border-border bg-card" />
                    <div className="h-20 rounded-2xl border border-border bg-card" />
                    <div className="h-20 rounded-2xl border border-border bg-card" />
                </div>
                <span className="sr-only">{message}</span>
            </div>
        )
    }

    return (
        <div role="status" aria-label={message} className="w-full animate-pulse space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                    <div className="h-7 w-48 rounded-lg bg-border/90" />
                    <div className="h-4 w-72 max-w-full rounded-md bg-border/60" />
                </div>
                <div className="h-10 w-full rounded-xl bg-border/70 sm:w-44" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="h-24 rounded-2xl border border-border bg-card" />
                <div className="h-24 rounded-2xl border border-border bg-card" />
                <div className="h-24 rounded-2xl border border-border bg-card" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="mb-4 grid grid-cols-12 gap-3">
                    <div className="col-span-5 h-4 rounded-md bg-border/80" />
                    <div className="col-span-2 h-4 rounded-md bg-border/60" />
                    <div className="col-span-3 h-4 rounded-md bg-border/60" />
                    <div className="col-span-2 h-4 rounded-md bg-border/60" />
                </div>
                <div className="space-y-3">
                    {skeletonRows(rows).map((row) => (
                        <div key={row} className="grid grid-cols-12 items-center gap-3 border-t border-border/70 pt-3">
                            <div className="col-span-2 sm:col-span-1 h-10 w-10 rounded-xl bg-border/70" />
                            <div className="col-span-7 sm:col-span-5 space-y-2">
                                <div className="h-4 rounded-md bg-border/80" />
                                <div className="h-3 w-2/3 rounded-md bg-border/50" />
                            </div>
                            <div className="hidden h-4 rounded-md bg-border/60 sm:col-span-2 sm:block" />
                            <div className="hidden h-4 rounded-md bg-border/60 sm:col-span-2 sm:block" />
                            <div className="col-span-3 sm:col-span-2 h-8 rounded-xl bg-border/70" />
                        </div>
                    ))}
                </div>
            </div>

            <span className="sr-only">{message}</span>
        </div>
    )
}
