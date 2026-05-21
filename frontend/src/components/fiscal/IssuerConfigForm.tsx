/**
 * Formulário da configuração fiscal do emitente.
 *
 * Encapsula apenas o formulário (SRP). A página decide quando renderizá-lo
 * e cuida do estado de loading/toasts. Não conhece axios diretamente.
 */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CnpjInput, CepInput, IeInput } from '@/components/fiscal/MaskedInput'
import { isValidCEP, isValidCNPJ, stripNonDigits } from '@/utils/masks'
import type { FiscalConfig } from '@/services/fiscal'

type FormState = Omit<FiscalConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>

const initial = (): FormState => ({
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    cnae_fiscal: '',
    regime_tributario: '1',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: '',
    cod_municipio_ibge: '',
    uf: '',
    cep: '',
    serie_padrao: 1,
    proximo_numero: 1,
    ambiente: 'homologacao',
})

interface Props {
    initialValue?: FiscalConfig | null
    saving: boolean
    onSubmit: (payload: FormState) => void
}

export default function IssuerConfigForm({ initialValue, saving, onSubmit }: Props) {
    const [form, setForm] = useState<FormState>(initial)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (initialValue) {
            setForm({
                cnpj: initialValue.cnpj,
                razao_social: initialValue.razao_social,
                nome_fantasia: initialValue.nome_fantasia ?? '',
                inscricao_estadual: initialValue.inscricao_estadual,
                inscricao_municipal: initialValue.inscricao_municipal ?? '',
                cnae_fiscal: initialValue.cnae_fiscal ?? '',
                regime_tributario: initialValue.regime_tributario,
                logradouro: initialValue.logradouro,
                numero: initialValue.numero,
                complemento: initialValue.complemento ?? '',
                bairro: initialValue.bairro,
                municipio: initialValue.municipio,
                cod_municipio_ibge: initialValue.cod_municipio_ibge,
                uf: initialValue.uf,
                cep: initialValue.cep,
                serie_padrao: initialValue.serie_padrao,
                proximo_numero: initialValue.proximo_numero,
                ambiente: initialValue.ambiente,
            })
        }
    }, [initialValue])

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (!isValidCNPJ(form.cnpj)) {
            setError('CNPJ do emitente é inválido.')
            return
        }
        if (!isValidCEP(form.cep)) {
            setError('CEP do emitente é inválido.')
            return
        }
        if (stripNonDigits(form.cod_municipio_ibge).length !== 7) {
            setError('Código IBGE do município deve ter 7 dígitos.')
            return
        }
        if (!form.uf || form.uf.length !== 2) {
            setError('Informe a UF (2 letras).')
            return
        }
        setError(null)
        onSubmit({
            ...form,
            cnpj: stripNonDigits(form.cnpj),
            cep: stripNonDigits(form.cep),
            cod_municipio_ibge: stripNonDigits(form.cod_municipio_ibge),
            uf: form.uf.toUpperCase(),
            nome_fantasia: form.nome_fantasia || null,
            inscricao_municipal: form.inscricao_municipal || null,
            cnae_fiscal: form.cnae_fiscal ? stripNonDigits(form.cnae_fiscal) : null,
            complemento: form.complemento || null,
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Section title="Dados da empresa">
                <Field label="CNPJ *">
                    <CnpjInput value={form.cnpj} onChange={(_, raw) => update('cnpj', raw)} required />
                </Field>
                <Field label="Razão social *">
                    <Input value={form.razao_social} onChange={(v) => update('razao_social', v)} required />
                </Field>
                <Field label="Nome fantasia">
                    <Input value={form.nome_fantasia ?? ''} onChange={(v) => update('nome_fantasia', v)} />
                </Field>
                <Field label="Inscrição estadual *">
                    <IeInput value={form.inscricao_estadual} onChange={(_, raw) => update('inscricao_estadual', raw)} required />
                </Field>
                <Field label="Inscrição municipal">
                    <Input value={form.inscricao_municipal ?? ''} onChange={(v) => update('inscricao_municipal', v)} />
                </Field>
                <Field label="CNAE fiscal">
                    <Input value={form.cnae_fiscal ?? ''} onChange={(v) => update('cnae_fiscal', v)} placeholder="Somente números" />
                </Field>
                <Field label="Regime tributário *">
                    <select
                        value={form.regime_tributario}
                        onChange={(e) => update('regime_tributario', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    >
                        <option value="1">1 - Simples Nacional</option>
                        <option value="2">2 - Simples Nacional, excesso sublimite</option>
                        <option value="3">3 - Regime Normal</option>
                        <option value="4">4 - MEI</option>
                    </select>
                </Field>
            </Section>

            <Section title="Endereço">
                <Field label="CEP *">
                    <CepInput value={form.cep} onChange={(_, raw) => update('cep', raw)} required />
                </Field>
                <Field label="Logradouro *">
                    <Input value={form.logradouro} onChange={(v) => update('logradouro', v)} required />
                </Field>
                <Field label="Número *">
                    <Input value={form.numero} onChange={(v) => update('numero', v)} required />
                </Field>
                <Field label="Complemento">
                    <Input value={form.complemento ?? ''} onChange={(v) => update('complemento', v)} />
                </Field>
                <Field label="Bairro *">
                    <Input value={form.bairro} onChange={(v) => update('bairro', v)} required />
                </Field>
                <Field label="Município *">
                    <Input value={form.municipio} onChange={(v) => update('municipio', v)} required />
                </Field>
                <Field label="Código IBGE do município *">
                    <Input value={form.cod_municipio_ibge} onChange={(v) => update('cod_municipio_ibge', v)} placeholder="7 dígitos" required />
                </Field>
                <Field label="UF *">
                    <Input value={form.uf} onChange={(v) => update('uf', v.toUpperCase().slice(0, 2))} placeholder="SP" required />
                </Field>
            </Section>

            <Section title="Numeração e ambiente">
                <Field label="Série padrão *">
                    <Input type="number" value={String(form.serie_padrao)} onChange={(v) => update('serie_padrao', Number(v))} required />
                </Field>
                <Field label="Próximo número *">
                    <Input type="number" value={String(form.proximo_numero)} onChange={(v) => update('proximo_numero', Number(v))} required />
                </Field>
                <Field label="Ambiente SEFAZ *">
                    <select
                        value={form.ambiente}
                        onChange={(e) => update('ambiente', e.target.value as FormState['ambiente'])}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                    >
                        <option value="homologacao">Homologação</option>
                        <option value="producao">Produção</option>
                    </select>
                </Field>
            </Section>

            {error && (
                <div className="rounded-xl border border-error/30 bg-error/10 text-error px-4 py-3 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-60 transition-colors"
                >
                    {saving ? 'Salvando…' : 'Salvar configuração'}
                </button>
            </div>
        </form>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="block text-xs font-semibold text-text-secondary mb-1">{label}</span>
            {children}
        </label>
    )
}

function Input({
    value,
    onChange,
    ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
    return (
        <input
            {...rest}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
        />
    )
}
