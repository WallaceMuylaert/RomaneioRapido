export const maskDocument = (val: string) => {
    const raw = val.replace(/\D/g, '')
    if (raw.length <= 11) {
        return raw
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }
    return raw
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

export const maskPhone = (val: string) => {
    const raw = val.replace(/\D/g, '')
    if (raw.length <= 10) {
        return raw
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1')
    }
    return raw
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1')
}

export const maskCurrency = (val: string | number) => {
    if (typeof val === 'number') val = (val * 100).toFixed(0)
    const raw = String(val).replace(/\D/g, '')
    if (raw === '') return '0,00'
    const num = (parseFloat(raw) / 100).toFixed(2)
    const parts = num.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return parts.join(',')
}

export const unmaskCurrency = (val: string) => {
    const raw = val.replace(/\D/g, '')
    if (raw === '') return 0
    return parseFloat(raw) / 100
}

export const stripNonDigits = (val: string): string => (val || '').replace(/\D/g, '')

export const maskCNPJ = (val: string): string => {
    const raw = stripNonDigits(val).slice(0, 14)
    return raw
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

export const maskCPF = (val: string): string => {
    const raw = stripNonDigits(val).slice(0, 11)
    return raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

export const maskCEP = (val: string): string => {
    const raw = stripNonDigits(val).slice(0, 8)
    return raw.replace(/(\d{5})(\d)/, '$1-$2')
}

// Inscrição Estadual: aceita até 14 dígitos (varia por UF). Mantemos digitação livre.
export const maskIE = (val: string): string => stripNonDigits(val).slice(0, 14)

// ── Validações ────────────────────────────────────────────────────────────
const calcDV = (digits: string, weights: number[]): number => {
    const total = digits.split('').reduce((acc, d, i) => acc + parseInt(d, 10) * weights[i], 0)
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
}

export const isValidCPF = (cpf: string): boolean => {
    const d = stripNonDigits(cpf)
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
    const dv1 = calcDV(d.substring(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
    if (dv1 !== parseInt(d[9], 10)) return false
    const dv2 = calcDV(d.substring(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
    return dv2 === parseInt(d[10], 10)
}

export const isValidCNPJ = (cnpj: string): boolean => {
    const d = stripNonDigits(cnpj)
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const w2 = [6, ...w1]
    const dv1 = calcDV(d.substring(0, 12), w1)
    if (dv1 !== parseInt(d[12], 10)) return false
    const dv2 = calcDV(d.substring(0, 13), w2)
    return dv2 === parseInt(d[13], 10)
}

export const isValidCEP = (cep: string): boolean => stripNonDigits(cep).length === 8
