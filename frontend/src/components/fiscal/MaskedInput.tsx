/**
 * Inputs com máscaras fiscais (CNPJ, CPF, CEP, IE).
 *
 * Componente base `MaskedInput` aplica uma função de máscara genérica.
 * Variantes nomeadas existem apenas para clareza no consumo (DRY).
 */
import type { InputHTMLAttributes } from 'react'
import { maskCEP, maskCNPJ, maskCPF, maskIE, stripNonDigits } from '@/utils/masks'

type MaskFn = (raw: string) => string

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: string
    onChange: (masked: string, raw: string) => void
    mask: MaskFn
}

export function MaskedInput({ value, onChange, mask, className, ...rest }: MaskedInputProps) {
    return (
        <input
            {...rest}
            value={mask(value || '')}
            onChange={(e) => {
                const masked = mask(e.target.value)
                onChange(masked, stripNonDigits(masked))
            }}
            className={
                className ??
                'w-full px-4 py-3 rounded-xl border border-border bg-card text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all'
            }
        />
    )
}

type Variant = Omit<MaskedInputProps, 'mask'>

export const CnpjInput = (p: Variant) => <MaskedInput {...p} mask={maskCNPJ} placeholder={p.placeholder ?? '00.000.000/0000-00'} inputMode="numeric" maxLength={18} />
export const CpfInput = (p: Variant) => <MaskedInput {...p} mask={maskCPF} placeholder={p.placeholder ?? '000.000.000-00'} inputMode="numeric" maxLength={14} />
export const CepInput = (p: Variant) => <MaskedInput {...p} mask={maskCEP} placeholder={p.placeholder ?? '00000-000'} inputMode="numeric" maxLength={9} />
export const IeInput = (p: Variant) => <MaskedInput {...p} mask={maskIE} placeholder={p.placeholder ?? 'Somente números'} inputMode="numeric" maxLength={14} />

// Documento polivalente (decide CPF/CNPJ pelo tamanho)
export const DocumentInput = (p: Variant) => (
    <MaskedInput
        {...p}
        mask={(raw) => (stripNonDigits(raw).length > 11 ? maskCNPJ(raw) : maskCPF(raw))}
        placeholder={p.placeholder ?? 'CPF ou CNPJ'}
        inputMode="numeric"
        maxLength={18}
    />
)
