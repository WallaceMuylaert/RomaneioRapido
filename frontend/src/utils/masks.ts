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
