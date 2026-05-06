import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
})

let accessToken: string | null = null
let onSessionExpired: (() => void) | null = null

export const setAccessToken = (token: string | null) => {
    accessToken = token
}

export const getAccessToken = () => accessToken

export const setSessionExpiredHandler = (handler: (() => void) | null) => {
    onSessionExpired = handler
}

const SESSION_FLAG_KEY = 'auth_session'

const hasPersistedSession = () => {
    try {
        return localStorage.getItem(SESSION_FLAG_KEY) === '1'
    } catch {
        return false
    }
}

const clearPersistedSession = () => {
    try {
        localStorage.removeItem(SESSION_FLAG_KEY)
    } catch {
        // ignore storage errors
    }
}

let refreshPromise: Promise<string | null> | null = null

const performRefresh = async (): Promise<string | null> => {
    try {
        const res = await axios.post(
            `${API_URL}/auth/refresh`,
            null,
            { withCredentials: true },
        )
        const newToken = res.data?.access_token as string | undefined
        if (newToken) {
            setAccessToken(newToken)
            return newToken
        }
        return null
    } catch {
        return null
    }
}

export const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
            refreshPromise = null
        })
    }
    return refreshPromise
}

const handleSessionLoss = () => {
    setAccessToken(null)
    localStorage.removeItem('token')
    clearPersistedSession()
    if (onSessionExpired) {
        onSessionExpired()
    }
    if (window.location.pathname !== '/login' && window.location.pathname !== '/error') {
        window.location.href = '/login'
    }
}

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
})

// Interceptor para tratar erros de autenticacao
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as (AxiosRequestConfig & {
            _retry?: boolean
            skipAuthRedirect?: boolean
            skipErrorRedirect?: boolean
            skipAutoRefresh?: boolean
        }) | undefined

        const url = originalRequest?.url || ''
        const isLoginRequest = url.includes('/auth/login')
        const isRefreshRequest = url.includes('/auth/refresh')
        const isLogoutRequest = url.includes('/auth/logout')
        const isLoginPage = window.location.pathname === '/login'
        const isPollingRequest = url.includes('/plans/session-status')
        const isGetRequest = originalRequest?.method?.toLowerCase() === 'get'
        const skipAuthRedirect = Boolean(originalRequest?.skipAuthRedirect)
        const skipErrorRedirect = Boolean(originalRequest?.skipErrorRedirect)
        const skipAutoRefresh = Boolean(originalRequest?.skipAutoRefresh)

        // Erros de infraestrutura (5xx ou rede)
        if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
            if (!isPollingRequest && isGetRequest && !skipErrorRedirect && window.location.pathname !== '/error') {
                const code = error.response?.status || (isTimeout ? 504 : 503)
                console.warn(`[API] Erro de infraestrutura (${code}). Mantendo sessao.`)
                window.location.href = `/error?code=${code}`
            }
            return Promise.reject(error)
        }

        const status = error.response.status

        // 401 em refresh: refresh token invalido/expirado -> deslogar
        if (status === 401 && isRefreshRequest) {
            return Promise.reject(error)
        }

        // 401 em rotas autenticadas: tentar refresh transparente
        if (
            status === 401 &&
            !isLoginRequest &&
            !isLogoutRequest &&
            !skipAutoRefresh &&
            !skipAuthRedirect &&
            originalRequest &&
            !originalRequest._retry &&
            hasPersistedSession()
        ) {
            originalRequest._retry = true
            const newToken = await refreshAccessToken()
            if (newToken) {
                originalRequest.headers = originalRequest.headers || {}
                ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken}`
                return api.request(originalRequest)
            }
            // Refresh falhou -> sessao expirou de fato
            if (!isLoginPage) {
                console.warn('[API] Refresh falhou. Encerrando sessao.')
                handleSessionLoss()
            }
            return Promise.reject(error)
        }

        // 401 sem refresh possivel (ex.: skipAutoRefresh ou sem flag de sessao)
        if (status === 401 && !isLoginRequest && !isLoginPage && !skipAuthRedirect) {
            const isErrorPage = window.location.pathname === '/error'
            if (!isErrorPage) {
                const authorization = (originalRequest?.headers?.Authorization
                    || (originalRequest?.headers as any)?.authorization) as string | undefined
                const requestToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
                    ? authorization.slice(7)
                    : null
                const currentToken = getAccessToken()
                if (!requestToken || requestToken === currentToken) {
                    handleSessionLoss()
                }
            }
        }

        return Promise.reject(error)
    },
)

export default api
