import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api'

export interface User {
    id: number
    email: string
    full_name: string
    is_admin: boolean
    plan_id: string
    is_active: boolean
    photo_base64?: string | null
    phone?: string | null
    store_name?: string | null
    pix_key?: string | null
    trial_expired?: boolean
    trial_days_remaining?: number | null
    subscription_status?: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    refreshUser: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (token && !user) {
            api.get('/auth/me')
                .then((res) => setUser(res.data))
                .catch((err) => {
                    if (err.response?.status === 401) {
                        console.error('[Auth] Token inválido ou expirado. Limpando sessão.');
                        localStorage.removeItem('token')
                        setToken(null)
                    } else {
                        console.warn('[Auth] Erro ao validar usuário (infraestrutura). Mantendo token.', err.response?.status || err.code);
                    }
                })
                .finally(() => setIsLoading(false))

            // Auto-Refresh: Renova o token a cada 1 hora silenciosamente
            const interval = setInterval(async () => {
                try {
                    const res = await api.post('/auth/refresh')
                    if (res.data?.access_token) {
                        localStorage.setItem('token', res.data.access_token)
                        setToken(res.data.access_token)
                    }
                } catch (err) {
                    console.error('Falha na renovação silenciosa do token', err)
                }
            }, 60 * 60 * 1000)

            return () => clearInterval(interval)
        } else {
            setIsLoading(false)
        }
    }, [token])

    const login = async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password })
        const { access_token } = res.data
        localStorage.setItem('token', access_token)
        setToken(access_token)
        const userRes = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        })
        setUser(userRes.data)
    }

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me')
            setUser(res.data)
        } catch {
            // silently fail
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
