import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
    baseURL: API_URL,
})

// Interceptor para adicionar token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Interceptor para tratar erros de autenticacao
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login')
        const isLoginPage = window.location.pathname === '/login'
        const isPollingRequest = error.config?.url?.includes('/plans/session-status')
        const isGetRequest = error.config?.method?.toLowerCase() === 'get'
        const skipAuthRedirect = Boolean(error.config?.skipAuthRedirect)

        if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout')

            if (!isPollingRequest && isGetRequest && window.location.pathname !== '/error') {
                const code = error.response?.status || (isTimeout ? 504 : 503)
                console.warn(`[API] Erro de infraestrutura (${code}). Mantendo sessao.`)
                window.location.href = `/error?code=${code}`
            }
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !isLoginRequest && !isLoginPage && !skipAuthRedirect) {
            const isErrorPage = window.location.pathname === '/error'
            if (!isErrorPage) {
                const authorization = error.config?.headers?.Authorization || error.config?.headers?.authorization
                const requestToken = typeof authorization === 'string' && authorization.startsWith('Bearer ')
                    ? authorization.slice(7)
                    : null
                const currentToken = localStorage.getItem('token')

                if (!requestToken || requestToken === currentToken) {
                    console.error('[API] Sessao expirada ou invalida (401). Redirecionando para login.')
                    localStorage.removeItem('token')
                    window.location.href = '/login'
                } else {
                    console.warn('[API] 401 de uma requisicao antiga ignorado; token atual foi mantido.')
                }
            }
        }
        return Promise.reject(error)
    }
)

export default api
