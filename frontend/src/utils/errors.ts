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
            full_name: 'Nome completo',
            phone: 'Telefone',
            document: 'Documento',
            email: 'E-mail',
            password: 'Senha',
            new_password: 'Nova senha',
            notes: 'Observações',
            price: 'Preço',
            cost_price: 'Preço de custo',
            min_stock: 'Estoque mínimo',
            quantity: 'Quantidade',
            stock_quantity: 'Quantidade em estoque',
            barcode: 'Código de barras',
            sku: 'SKU',
            description: 'Descrição',
            unit: 'Unidade',
            category_id: 'Categoria',
            color: 'Cor',
            size: 'Tamanho',
            pix_key: 'Chave Pix',
            store_name: 'Nome da loja',
            discount_percentage: 'Desconto',
            customer_name: 'Nome do cliente',
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
            case 'value_error':
                if (firstError.msg?.toLowerCase().includes('email')) return 'E-mail inválido.'
                break
            case 'type_error.integer':
                return `O campo "${fieldName}" deve ser um número inteiro.`
            case 'type_error.float':
            case 'type_error.number':
                return `O campo "${fieldName}" deve ser um número válido.`
            case 'greater_than_equal':
                return `O campo "${fieldName}" deve ser maior ou igual a ${firstError.ctx?.ge ?? 0}.`
            case 'less_than_equal':
                return `O campo "${fieldName}" deve ser menor ou igual a ${firstError.ctx?.le ?? firstError.ctx?.limit_value}.`
            case 'greater_than':
                return `O campo "${fieldName}" deve ser maior que ${firstError.ctx?.gt ?? 0}.`
            case 'less_than':
                return `O campo "${fieldName}" deve ser menor que ${firstError.ctx?.lt}.`
        }

        // Remove prefixo "Value error, " que o Pydantic v2 adiciona antes de mensagens customizadas
        const rawMsg: string = firstError.msg || ''
        const cleanMsg = rawMsg.replace(/^value error,\s*/i, '')
        return cleanMsg || 'Erro de validação'
    }

    if (typeof error === 'string') {
        const lowerError = error.toLowerCase()
        if (lowerError.includes('network error') || lowerError.includes('failed to fetch')) {
            return 'Erro de conexão com a internet. Tente novamente mais tarde.'
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
