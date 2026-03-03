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
        id: 'free',
        name: 'Grátis',
        price: 'R$ 0',
        description: 'Perfeito para começar.',
        features: [
            'Até 10 produtos',
            'Até 2 categorias',
            'Suporte via email'
        ],
        highlight: false,
        limit_products: 10,
        limit_categories: 2,
        limit_api_keys: 0,
        api_rate_limit: '0/minute',
        color: 'emerald'
    },
    {
        id: 'basic',
        name: 'Básico',
        price: 'R$ 49,90',
        period: '/mês',
        description: 'Para pequenos negócios.',
        features: [
            'Até 30 produtos',
            'Até 3 categorias',
            'Suporte via email'
        ],
        highlight: false,
        limit_products: 30,
        limit_categories: 3,
        limit_api_keys: 0,
        api_rate_limit: '0/minute',
        color: 'blue'
    },
    {
        id: 'plus',
        name: 'Plus',
        price: 'R$ 89,90',
        period: '/mês',
        description: 'Para negócios em crescimento.',
        features: [
            'Até 50 produtos',
            'Até 5 categorias',
            'Suporte prioritário',
            'Acesso API (2 chaves, 60 req/min)'
        ],
        highlight: true,
        limit_products: 50,
        limit_categories: 5,
        limit_api_keys: 2,
        api_rate_limit: '60/minute',
        color: 'blue'
    },
    {
        id: 'pro',
        name: 'Profissional',
        price: 'R$ 129,90',
        period: '/mês',
        description: 'Para negócios consolidados.',
        features: [
            'Até 100 produtos',
            'Até 10 categorias',
            'Suporte 24/7',
            'Acesso API (5 chaves, 120 req/min)'
        ],
        highlight: false,
        limit_products: 100,
        limit_categories: 10,
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

