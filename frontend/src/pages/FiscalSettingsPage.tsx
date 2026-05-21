/**
 * Página de configuração fiscal: dados do emitente + certificado A1.
 *
 * Acesso restrito a administradores (também enforce no backend).
 */
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'
import LoadingOverlay from '@/components/LoadingOverlay'
import IssuerConfigForm from '@/components/fiscal/IssuerConfigForm'
import CertificateUploadCard from '@/components/fiscal/CertificateUploadCard'
import { fiscalApi, type FiscalConfig } from '@/services/fiscal'
import { translateError } from '@/utils/errors'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function FiscalSettingsPage() {
    const { user } = useAuth()
    const [config, setConfig] = useState<FiscalConfig | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fiscalApi.getConfig()
                setConfig(data ?? null)
            } catch (err) {
                toast.error(translateError(err) || 'Erro ao carregar configuração fiscal.')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (user && !user.is_admin) {
        return <Navigate to="/error" replace state={{ code: 403 }} />
    }

    const handleSave = async (payload: Parameters<typeof fiscalApi.saveConfig>[0]) => {
        try {
            setSaving(true)
            const saved = await fiscalApi.saveConfig(payload)
            setConfig(saved)
            toast.success('Configuração fiscal salva.')
        } catch (err) {
            toast.error(translateError(err) || 'Falha ao salvar configuração.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-6">
                <LoadingOverlay compact message="Carregando configuração fiscal" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <header className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Módulo Fiscal</h1>
                    <p className="text-sm text-text-secondary">
                        Configure o emitente e gerencie o certificado A1 para emissão de NF-e.
                    </p>
                </div>
            </header>

            <CertificateUploadCard />

            <IssuerConfigForm initialValue={config} saving={saving} onSubmit={handleSave} />
        </div>
    )
}
