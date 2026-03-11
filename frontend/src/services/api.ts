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

        // Erro de rede ou servidor fora do ar (não redirecionar durante polling de pagamento e apenas em GET configs para não explodir os Forms)
        if (!error.response || (error.response.status >= 500 && error.response.status <= 504)) {
            if (!isPollingRequest && isGetRequest && window.location.pathname !== '/error') {
                const code = error.response?.status || 503;
                window.location.href = `/error?code=${code}`;
            }
            return Promise.reject(error);
        }

        if (error.response?.status === 401 && !isLoginRequest && !isLoginPage) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api
