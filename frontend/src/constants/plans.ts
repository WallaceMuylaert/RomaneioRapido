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
        name: 'Plano A',
        price: 'Grátis',
        period: '7 dias',
        description: 'Teste o sistema por 7 dias gratuitamente.',
        features: [
            'Até 10 produtos (SKU)',
            'Até 3 categorias',
            'Impressão de romaneios',
            '7 dias de acesso grátis'
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
        name: 'Plano B',
        price: 'R$ 99',
        period: '/mês',
        description: 'Para negócios em início de operação.',
        features: [
            'Até 100 produtos (SKU)',
            'Até 10 categorias',
            'Suporte via email',
            'Impressão de romaneios'
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
        name: 'Plano C',
        price: 'R$ 199',
        period: '/mês',
        description: 'Para negócios em crescimento.',
        features: [
            'Até 200 produtos (SKU)',
            'Até 20 categorias',
            'Suporte prioritário',
            'Acesso API (2 chaves, 60 req/min)',
            'Impressão de romaneios'
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
        name: 'Plano D',
        price: 'R$ 299',
        period: '/mês',
        description: 'Para negócios consolidados. Sem limites.',
        features: [
            'Produtos ilimitados (300+ SKU)',
            'Categorias ilimitadas',
            'Suporte 24/7',
            'Acesso API (5 chaves, 120 req/min)',
            'Impressão de romaneios'
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
        price: 'Ilimitado',
        description: 'Plano exclusivo para administradores.',
        features: [
            'Produtos ilimitados',
            'Categorias ilimitadas',
            'Suporte prioritário',
            'Gestão total',
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
