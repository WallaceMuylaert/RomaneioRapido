/**
 * Traduz mensagens de erro comuns do Pydantic/FastAPI para Português Brasileiro
 */
export const translateError = (error: any): string => {
    if (!error) return 'Erro desconhecido'

    // Se for um erro de validação do Pydantic (array de erros)
    if (Array.isArray(error)) {
        const firstError = error[0]
        const field = firstError.loc?.[firstError.loc.length - 1]
        const type = firstError.type
        const limit = firstError.ctx?.limit_value || firstError.ctx?.min_length || firstError.ctx?.max_length

        const fieldNames: Record<string, string> = {
            name: 'Nome',
            phone: 'Telefone',
            document: 'Documento',
            email: 'E-mail',
            notes: 'Observações',
            price: 'Preço',
            quantity: 'Quantidade',
            stock_quantity: 'Quantidade em estoque',
            barcode: 'Código de barras'
        }

        const fieldName = fieldNames[field] || field

        switch (type) {
            case 'value_error.missing':
            case 'missing':
                return `O campo "${fieldName}" é obrigatório.`
            case 'string_too_short':
            case 'value_error.any_str.min_length':
                return `O campo "${fieldName}" deve ter pelo menos ${limit} caracteres.`
            case 'string_too_long':
            case 'value_error.any_str.max_length':
                return `O campo "${fieldName}" deve ter no máximo ${limit} caracteres.`
            case 'value_error.email':
            case 'value_error.email_str':
                return 'E-mail inválido.'
            case 'type_error.integer':
                return `O campo "${fieldName}" deve ser um número inteiro.`
            case 'type_error.float':
            case 'type_error.number':
                return `O campo "${fieldName}" deve ser um número válido.`
            default:
                // Se não houver tradução específica, tenta limpar a mensagem original
                return firstError.msg?.replace('String', 'Texto').replace('Value', 'Valor') || 'Erro de validação'
        }
    }

    if (typeof error === 'string') {
        const lowerError = error.toLowerCase()
        if (lowerError.includes('network error') || lowerError.includes('failed to fetch')) {
            return 'Erro de conexão com a intenet. Tente novamente mais tarde.'
        }
        if (lowerError.includes('request failed with status code 500')) {
            return 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
        }
        if (lowerError.includes('request failed with status code 404') || lowerError.includes('not found')) {
            return 'O recurso solicitado não foi encontrado.'
        }
        if (lowerError.includes('request failed with status code 403') || lowerError.includes('forbidden')) {
            return 'Você não tem permissão para realizar esta ação.'
        }
        if (lowerError.includes('request failed with status code 401') || lowerError.includes('unauthorized')) {
            return 'Sua sessão expirou ou você não está autorizado.'
        }
        if (lowerError.includes('timeout')) {
            return 'O tempo de requisição esgotou. Tente novamente.'
        }
        
        return error
    }

    return 'Erro ao processar solicitação'
}
