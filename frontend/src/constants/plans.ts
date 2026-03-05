export interface PlanFeature {
    text: string
    included: boolean
}

export interface Plan {
    id: string
    name: string
    price: string
    period?: string
    description: string
    features: string[]
    highlight: boolean
    limit_products: number
    limit_categories: number
    limit_api_keys: number
    api_rate_limit: string
    color: string
    hidden?: boolean
}

export const PLANS: Plan[] = [
    {
        id: 'trial',
        name: 'Start',
        price: 'Grátis',
        period: '7 dias',
        description: 'Dê o primeiro passo e experimente nossa plataforma sem compromisso.',
        features: [
            'Até 10 produtos (SKU)',
            'Até 3 categorias',
            'Impressão de romaneios',
            '7 dias de acesso completo sem custos'
        ],
        highlight: false,
        limit_products: 10,
        limit_categories: 3,
        limit_api_keys: 0,
        api_rate_limit: '0/minute',
        color: 'slate'
    },
    {
        id: 'basic',
        name: 'Essencial',
        price: 'R$ 99',
        period: '/mês',
        description: 'A fundação ideal para organizar e tracionar suas vendas.',
        features: [
            'Até 100 produtos (SKU)',
            'Até 10 categorias',
            'Suporte dedicado via email',
            'Impressão de romaneios ilimitada'
        ],
        highlight: false,
        limit_products: 100,
        limit_categories: 10,
        limit_api_keys: 0,
        api_rate_limit: '0/minute',
        color: 'emerald'
    },
    {
        id: 'plus',
        name: 'Profissional',
        price: 'R$ 199',
        period: '/mês',
        description: 'O plano favorito para empresas que necessitam de escala.',
        features: [
            'Até 200 produtos (SKU)',
            'Até 20 categorias',
            'Suporte técnico prioritário',
            'Acesso API (2 chaves, 60 req/min)',
            'Impressão de romaneios otimizada'
        ],
        highlight: true,
        limit_products: 200,
        limit_categories: 20,
        limit_api_keys: 2,
        api_rate_limit: '60/minute',
        color: 'blue'
    },
    {
        id: 'pro',
        name: 'Premium',
        price: 'R$ 299',
        period: '/mês',
        description: 'Poder máximo para operações consolidadas. Sem limites.',
        features: [
            'Produtos ilimitados (300+ SKU)',
            'Categorias infinitas',
            'Suporte VIP 24/7',
            'Acesso API Avançado (5 chaves, 120 req/min)',
            'Performance e prioridade máxima'
        ],
        highlight: false,
        limit_products: 999999,
        limit_categories: 999999,
        limit_api_keys: 5,
        api_rate_limit: '120/minute',
        color: 'purple'
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Sob Consulta',
        description: 'Solução sob medida e exclusiva para grandes corporações.',
        features: [
            'Gestão de múltiplos CNPJs',
            'Infraestrutura dedicada',
            'Gerente de conta exclusivo',
            'Gestão total corporativa',
            'Acesso API (20 chaves, 300 req/min)'
        ],
        highlight: false,
        limit_products: 999999,
        limit_categories: 999999,
        limit_api_keys: 20,
        api_rate_limit: '300/minute',
        color: 'slate',
        hidden: true
    }
]
