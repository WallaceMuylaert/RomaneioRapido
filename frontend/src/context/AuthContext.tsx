import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import api, { setAccessToken } from '@/services/api'

export interface User {
    id: number
    email: string
    full_name: string
    is_admin: boolean
    plan_id: string
    is_active: boolean
    is_unlimited: boolean
    photo_base64?: string | null
    phone?: string | null
    store_name?: string | null
    pix_key?: string | null
    trial_expired?: boolean
    trial_days_remaining?: number | null
    subscription_status?: string
    stripe_subscription_id?: string | null
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
const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const validatingTokenRef = useRef<string | null>(null)
    const loggingOutRef = useRef(false)

    const doRefreshToken = async () => {
        try {
            const res = await api.post('/auth/refresh', null, {
                skipAuthRedirect: true,
                skipErrorRedirect: true,
            } as any)
            if (res.data?.access_token) {
                setAccessToken(res.data.access_token)
                setToken(res.data.access_token)
                return res.data.access_token as string
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                console.warn('[Auth] Token expirado. Encerrando sessao.')
                setAccessToken(null)
                localStorage.removeItem('token')
                setToken(null)
                setUser(null)
            } else {
                console.error('[Auth] Falha na renovacao silenciosa do token', err?.code || err?.message)
            }
        }
    }

    useEffect(() => {
        localStorage.removeItem('token')

        if (loggingOutRef.current) {
            setIsLoading(false)
            return
        }

        if (!token) {
            doRefreshToken()
                .then((newToken) => {
                    if (!newToken) {
                        setIsLoading(false)
                    }
                })
            return
        }

        const tokenBeingValidated = token

        if (!user) {
            if (validatingTokenRef.current === tokenBeingValidated) {
                return
            }

            validatingTokenRef.current = tokenBeingValidated
            api.get('/auth/me', {
                headers: { Authorization: `Bearer ${tokenBeingValidated}` },
                skipAuthRedirect: true,
                skipErrorRedirect: true,
            } as any)
                .then((res) => setUser(res.data))
                .catch((err) => {
                    if (err.response?.status === 401) {
                        if (token === tokenBeingValidated) {
                            console.error('[Auth] Token invalido ou expirado. Limpando sessao.')
                            setAccessToken(null)
                            localStorage.removeItem('token')
                            setToken(null)
                        } else {
                            console.warn('[Auth] 401 de validacao antiga ignorado; token atual foi mantido.')
                        }
                    } else {
                        console.warn('[Auth] Erro ao validar usuario (infraestrutura). Mantendo token.', err.response?.status || err.code)
                    }
                })
                .finally(() => {
                    if (validatingTokenRef.current === tokenBeingValidated) {
                        validatingTokenRef.current = null
                    }
                    setIsLoading(false)
                })
        } else {
            setIsLoading(false)
        }

        const interval = setInterval(doRefreshToken, TOKEN_REFRESH_INTERVAL_MS)

        return () => clearInterval(interval)
    }, [token, user])

    // Re-valida/renova o token quando o usuario volta para a aba após longo periodo em background.
    useEffect(() => {
        const lastRefreshRef = { time: Date.now() }
        const RECHECK_THRESHOLD_MS = 5 * 60 * 1000

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return
            const elapsed = Date.now() - lastRefreshRef.time
            if (elapsed >= RECHECK_THRESHOLD_MS && token) {
                lastRefreshRef.time = Date.now()
                doRefreshToken()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [token])

    const login = async (email: string, password: string) => {
        loggingOutRef.current = false
        const res = await api.post('/auth/login', { email, password })
        const { access_token } = res.data
        setAccessToken(access_token)
        const userRes = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${access_token}` },
            skipAuthRedirect: true,
            skipErrorRedirect: true,
        } as any)
        setUser(userRes.data)
        setToken(access_token)
    }

    const refreshUser = async () => {
        try {
            const res = await api.get('/auth/me', {
                skipAuthRedirect: true,
                skipErrorRedirect: true,
            } as any)
            setUser(res.data)
        } catch {
            // silently fail
        }
    }

    const logout = () => {
        loggingOutRef.current = true
        api.post('/auth/logout', null, {
            skipAuthRedirect: true,
            skipErrorRedirect: true,
        } as any).catch(() => undefined)
        setAccessToken(null)
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
