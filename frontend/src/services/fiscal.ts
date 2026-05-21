/**
 * Cliente HTTP do módulo fiscal.
 *
 * Reutiliza a instância axios já configurada (interceptors, refresh token).
 * Concentra todos os endpoints fiscais para que componentes não conheçam
 * detalhes de URL (SRP no frontend).
 */
import api from '@/services/api'

// ── Tipos públicos ────────────────────────────────────────────────────────
export interface FiscalConfig {
    id: number
    user_id: number
    cnpj: string
    razao_social: string
    nome_fantasia?: string | null
    inscricao_estadual: string
    inscricao_municipal?: string | null
    cnae_fiscal?: string | null
    regime_tributario: string
    logradouro: string
    numero: string
    complemento?: string | null
    bairro: string
    municipio: string
    cod_municipio_ibge: string
    uf: string
    cep: string
    serie_padrao: number
    proximo_numero: number
    ambiente: 'homologacao' | 'producao'
    created_at: string
    updated_at?: string | null
}

export interface CertificateMetadata {
    id: number
    user_id: number
    filename: string
    subject_cn?: string | null
    issuer_cn?: string | null
    serial_number?: string | null
    not_before?: string | null
    not_after?: string | null
    created_at: string
    updated_at?: string | null
}

export interface CertificateStatus {
    has_certificate: boolean
    metadata?: CertificateMetadata | null
    is_expired: boolean
}

export interface NFeItemInput {
    product_id?: number | null
    codigo: string
    descricao: string
    ncm: string
    cfop: string
    unidade_comercial: string
    ean?: string | null
    quantidade: number
    valor_unitario: number
    csosn: string
    origem?: string
}

export interface NFeDestinatarioInput {
    nome: string
    documento: string
    inscricao_estadual?: string | null
    email?: string | null
    telefone?: string | null
    endereco?: {
        logradouro: string
        numero: string
        complemento?: string | null
        bairro: string
        municipio: string
        cod_municipio_ibge: string
        uf: string
        cep: string
    } | null
}

export interface NFeDraftPayload {
    client_id?: number | null
    natureza_operacao?: string
    finalidade?: string
    tipo_operacao?: string
    indicador_presenca?: string
    informacoes_adicionais?: string | null
    destinatario: NFeDestinatarioInput
    itens: NFeItemInput[]
}

export interface NFeItemResponse {
    numero_item: number
    codigo: string
    descricao: string
    ncm: string
    cfop: string
    unidade_comercial: string
    quantidade: number
    valor_unitario: number
    valor_total: number
    csosn: string
    origem: string
}

export interface NFeResponse {
    id: number
    numero: number
    serie: number
    modelo: string
    status: string
    ambiente: string
    natureza_operacao: string
    finalidade: string
    chave_acesso?: string | null
    protocolo?: string | null
    codigo_status_sefaz?: string | null
    motivo_rejeicao?: string | null
    destinatario_nome: string
    destinatario_documento: string
    valor_produtos: number
    valor_total: number
    data_emissao?: string | null
    data_autorizacao?: string | null
    itens: NFeItemResponse[]
}

export interface NFeListResult {
    items: NFeResponse[]
    total: number
    page: number
    per_page: number
}

export interface DanfeData {
    identificacao: {
        numero: number
        serie: number
        modelo: string
        natureza_operacao: string
        data_emissao?: string | null
        data_autorizacao?: string | null
    }
    emitente: {
        razao_social: string
        nome_fantasia?: string | null
        cnpj: string
        inscricao_estadual: string
        endereco: {
            logradouro: string
            numero: string
            complemento?: string | null
            bairro: string
            municipio: string
            uf: string
            cep: string
        }
    }
    destinatario: {
        nome: string
        documento: string
        inscricao_estadual?: string | null
        email?: string | null
    }
    itens: Array<{
        numero_item: number
        codigo: string
        descricao: string
        ncm: string
        cfop: string
        unidade: string
        quantidade: number
        valor_unitario: string
        valor_total: string
        csosn: string
    }>
    totais: { valor_produtos: string; valor_total: string }
    informacoes_adicionais?: string | null
    ambiente: string
    status: string
    chave_acesso?: string | null
    protocolo?: string | null
}

// ── Endpoints ─────────────────────────────────────────────────────────────
export const fiscalApi = {
    // Configuração do emitente
    getConfig: () => api.get<FiscalConfig | null>('/fiscal/config/').then(r => r.data),
    saveConfig: (payload: Omit<FiscalConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
        api.put<FiscalConfig>('/fiscal/config/', payload).then(r => r.data),

    // Certificado A1
    getCertificateStatus: () =>
        api.get<CertificateStatus>('/fiscal/certificate/').then(r => r.data),
    uploadCertificate: (file: File, password: string) => {
        const form = new FormData()
        form.append('file', file)
        form.append('password', password)
        return api
            .post<CertificateMetadata>('/fiscal/certificate/', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then(r => r.data)
    },
    deleteCertificate: () => api.delete('/fiscal/certificate/'),

    // NF-e
    createDraft: (payload: NFeDraftPayload) =>
        api.post<NFeResponse>('/fiscal/nfe/', payload).then(r => r.data),
    issue: (nfeId: number) =>
        api.post<NFeResponse>(`/fiscal/nfe/${nfeId}/issue`).then(r => r.data),
    listNFes: (params: { page?: number; per_page?: number; status?: string } = {}) =>
        api.get<NFeListResult>('/fiscal/nfe/', { params }).then(r => r.data),
    getNFe: (nfeId: number) =>
        api.get<NFeResponse>(`/fiscal/nfe/${nfeId}`).then(r => r.data),
    getDanfe: (nfeId: number) =>
        api.get<DanfeData>(`/fiscal/nfe/${nfeId}/danfe`).then(r => r.data),
}
