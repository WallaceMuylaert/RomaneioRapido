import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import api, {
    getAccessToken,
    refreshAccessToken,
    setAccessToken,
    setSessionExpiredHandler,
} from '@/services/api'

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

// Refresh proativo do access token (antes da expiracao). O backend tem
// ACCESS_TOKEN_EXPIRE_MINUTES=720 mas o silent refresh roda mais rapido
// para que abas abertas por horas continuem com token sempre valido.
const PROACTIVE_REFRESH_INTERVAL_MS = 10 * 60 * 1000
// Quando o usuario volta a aba apos esse periodo, dispara um refresh.
const VISIBILITY_REFRESH_THRESHOLD_MS = 5 * 60 * 1000

const SESSION_FLAG_KEY = 'auth_session'

const hasPersistedSession = () => {
    try {
        return localStorage.getItem(SESSION_FLAG_KEY) === '1'
    } catch {
        return false
    }
}

const markPersistedSession = () => {
    try {
        localStorage.setItem(SESSION_FLAG_KEY, '1')
    } catch {
        // ignore storage errors
    }
}

const clearPersistedSession = () => {
    try {
        localStorage.removeItem(SESSION_FLAG_KEY)
    } catch {
        // ignore storage errors
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const bootstrappedRef = useRef(false)

    const clearSession = useCallback(() => {
        setAccessToken(null)
        clearPersistedSession()
        try {
            localStorage.removeItem('token')
        } catch {
            // ignore
        }
        setToken(null)
        setUser(null)
    }, [])

    const loadCurrentUser = useCallback(async (): Promise<User | null> => {
        try {
            const res = await api.get('/auth/me', {
                skipAutoRefresh: true,
                skipAuthRedirect: true,
                skipErrorRedirect: true,
            } as any)
            return res.data as User
        } catch {
            return null
        }
    }, [])

    // Bootstrap inicial: tenta restaurar sessao via refresh token (cookie httpOnly).
    useEffect(() => {
        if (bootstrappedRef.current) return
        bootstrappedRef.current = true

        const bootstrap = async () => {
            // Sem indicio de sessao previa -> nao chama refresh para evitar 401 inutil.
            if (!hasPersistedSession()) {
                setIsLoading(false)
                return
            }

            const newToken = await refreshAccessToken()
            if (!newToken) {
                clearSession()
                setIsLoading(false)
                return
            }

            setToken(newToken)
            markPersistedSession()
            const me = await loadCurrentUser()
            if (me) {
                setUser(me)
            } else {
                clearSession()
            }
            setIsLoading(false)
        }

        bootstrap()
    }, [clearSession, loadCurrentUser])

    // Refresh proativo enquanto a sessao estiver ativa.
    useEffect(() => {
        if (!token) return
        const interval = setInterval(async () => {
            const newToken = await refreshAccessToken()
            if (newToken) {
                setToken(newToken)
                markPersistedSession()
            }
        }, PROACTIVE_REFRESH_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [token])

    // Refresh ao voltar para aba apos um tempo em background.
    useEffect(() => {
        if (!token) return
        let lastCheck = Date.now()
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== 'visible') return
            const elapsed = Date.now() - lastCheck
            if (elapsed < VISIBILITY_REFRESH_THRESHOLD_MS) return
            lastCheck = Date.now()
            const newToken = await refreshAccessToken()
            if (newToken) {
                setToken(newToken)
                markPersistedSession()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [token])

    // Permite que o interceptor avise o context quando o refresh falha.
    useEffect(() => {
        setSessionExpiredHandler(() => {
            setToken(null)
            setUser(null)
        })
        return () => setSessionExpiredHandler(null)
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password })
        const { access_token } = res.data
        setAccessToken(access_token)
        markPersistedSession()
        const me = await loadCurrentUser()
        if (!me) {
            clearSession()
            throw new Error('Falha ao carregar dados do usuario apos login')
        }
        setUser(me)
        setToken(access_token)
    }, [clearSession, loadCurrentUser])

    const refreshUser = useCallback(async () => {
        if (!getAccessToken()) return
        const me = await loadCurrentUser()
        if (me) setUser(me)
    }, [loadCurrentUser])

    const logout = useCallback(() => {
        api.post('/auth/logout', null, {
            skipAuthRedirect: true,
            skipErrorRedirect: true,
            skipAutoRefresh: true,
        } as any).catch(() => undefined)
        clearSession()
    }, [clearSession])

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
