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

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login')
        const isLoginPage = window.location.pathname === '/login'
        const isPollingRequest = error.config?.url?.includes('/plans/session-status')
        const isGetRequest = error.config?.method?.toLowerCase() === 'get'

        if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
            const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

            if (!isPollingRequest && isGetRequest && window.location.pathname !== '/error') {
                const code = error.response?.status || (isTimeout ? 504 : 503);
                console.warn(`[API] Erro de infraestrutura (${code}). Mantendo sessão.`);
                window.location.href = `/error?code=${code}`;
            }
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !isLoginRequest && !isLoginPage) {
            const isErrorPage = window.location.pathname === '/error'
            if (!isErrorPage) {
                console.error('[API] Sessão expirada ou inválida (401). Redirecionando para login.');
                localStorage.removeItem('token')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
