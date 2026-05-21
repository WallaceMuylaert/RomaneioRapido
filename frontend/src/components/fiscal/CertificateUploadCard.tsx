/**
 * Card de gestão do certificado digital A1.
 *
 * - Exibe status (cadastrado / expirado / ausente) e metadados.
 * - Permite upload de novo PFX e remoção.
 * - Toda a comunicação HTTP fica no `fiscalApi` (SRP).
 */
import { useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { ShieldCheck, ShieldX, Upload, Trash2 } from 'lucide-react'
import { fiscalApi, type CertificateStatus } from '@/services/fiscal'
import { translateError } from '@/utils/errors'

export default function CertificateUploadCard() {
    const [status, setStatus] = useState<CertificateStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [password, setPassword] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const load = async () => {
        try {
            setLoading(true)
            const data = await fiscalApi.getCertificateStatus()
            setStatus(data)
        } catch (err) {
            toast.error(translateError(err) || 'Erro ao carregar certificado.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [])

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) {
            toast.error('Selecione o arquivo .pfx do certificado A1.')
            return
        }
        if (!password) {
            toast.error('Informe a senha do certificado.')
            return
        }
        try {
            setSubmitting(true)
            await fiscalApi.uploadCertificate(file, password)
            toast.success('Certificado A1 cadastrado com sucesso.')
            setPassword('')
            setFile(null)
            if (fileRef.current) fileRef.current.value = ''
            await load()
        } catch (err) {
            toast.error(translateError(err) || 'Falha ao validar o certificado.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Remover o certificado A1? A emissão de NF-e ficará bloqueada até um novo upload.')) return
        try {
            await fiscalApi.deleteCertificate()
            toast.success('Certificado removido.')
            await load()
        } catch (err) {
            toast.error(translateError(err) || 'Falha ao remover certificado.')
        }
    }

    return (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-base font-bold text-text-primary">Certificado Digital A1</h3>
                    <p className="text-xs text-text-secondary mt-1">
                        Arquivo .pfx armazenado criptografado em repouso. Necessário para assinar XMLs da NF-e.
                    </p>
                </div>
                <StatusBadge status={status} loading={loading} />
            </header>

            {status?.has_certificate && status.metadata && (
                <div className="rounded-xl border border-border bg-background/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <Detail label="Arquivo" value={status.metadata.filename} />
                    <Detail label="Sujeito" value={status.metadata.subject_cn || '—'} />
                    <Detail label="Emissor" value={status.metadata.issuer_cn || '—'} />
                    <Detail label="Número de série" value={status.metadata.serial_number || '—'} />
                    <Detail label="Válido de" value={formatDate(status.metadata.not_before)} />
                    <Detail label="Válido até" value={formatDate(status.metadata.not_after)} />
                </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
                <label className="block">
                    <span className="block text-xs font-semibold text-text-secondary mb-1">Arquivo (.pfx / .p12)</span>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pfx,.p12,application/x-pkcs12"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        className="block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
                    />
                </label>
                <label className="block">
                    <span className="block text-xs font-semibold text-text-secondary mb-1">Senha do certificado</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    />
                </label>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={submitting || !file || !password}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold disabled:opacity-60 transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        {submitting ? 'Validando…' : 'Enviar certificado'}
                    </button>
                    {status?.has_certificate && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-error/40 text-error hover:bg-error/10 text-sm font-bold transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remover atual
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}

function StatusBadge({ status, loading }: { status: CertificateStatus | null; loading: boolean }) {
    if (loading) return <span className="text-xs text-text-secondary">carregando…</span>
    if (!status?.has_certificate) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                <ShieldX className="w-3.5 h-3.5" /> Ausente
            </span>
        )
    }
    if (status.is_expired) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-error/10 text-error border border-error/30">
                <ShieldX className="w-3.5 h-3.5" /> Expirado
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-success/10 text-success border border-success/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Ativo
        </span>
    )
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-[11px] uppercase tracking-wide text-text-secondary font-semibold">{label}</p>
            <p className="text-text-primary text-sm break-all">{value}</p>
        </div>
    )
}

function formatDate(iso?: string | null) {
    if (!iso) return '—'
    try {
        return new Date(iso).toLocaleString('pt-BR')
    } catch {
        return iso
    }
}
