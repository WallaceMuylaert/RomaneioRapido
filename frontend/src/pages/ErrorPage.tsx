import { useNavigate, useLocation, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const errorDetails: Record<number, { title: string; message: string }> = {
    400: { title: 'Requisição Inválida', message: 'Houve um problema com a sua requisição. Verifique os dados e tente novamente.' },
    401: { title: 'Não Autorizado', message: 'Você precisa estar logado para acessar esta página.' },
    403: { title: 'Acesso Negado', message: 'Você não tem permissão para acessar este recurso.' },
    404: { title: 'Página Não Encontrada', message: 'A página que você está procurando não existe ou foi removida.' },
    500: { title: 'Erro Interno', message: 'Ocorreu um erro interno no servidor. Nossos engenheiros já foram notificados.' },
    502: { title: 'Bad Gateway', message: 'O servidor recebeu uma resposta inválida. Tente novamente em alguns instantes.' },
    503: { title: 'Serviço Indisponível', message: 'O sistema está em manutenção no momento. Volte em breve.' },
    504: { title: 'Tempo Esgotado', message: 'A conexão com o servidor expirou. Tente novamente mais tarde.' },
};

const defaultError = { title: 'Ocorreu um erro', message: 'Algo deu errado. Por favor, tente novamente.' };

interface ErrorPageProps {
    code?: number;
}

export default function ErrorPage({ code }: ErrorPageProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const routeError = useRouteError();

    // Try to determine the code from props, route error, or query params
    let finalCode = code || 500;

    if (isRouteErrorResponse(routeError)) {
        finalCode = routeError.status;
    } else if (!code) {
        // Check if there is a query param specifying the error code
        const searchParams = new URLSearchParams(location.search);
        const codeParam = searchParams.get('code');
        if (codeParam && !isNaN(parseInt(codeParam))) {
            finalCode = parseInt(codeParam);
        } else if (location.pathname !== '/error' && !routeError) {
            // If no error code is specified and no route error, but it's not the /error page itself
            // It's likely a 404 catch-all
            finalCode = 404;
        }
    }

    const details = errorDetails[finalCode] || defaultError;

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-fade-in border border-gray-100">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>

                <h1 className="text-7xl font-bold mb-2 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    {finalCode}
                </h1>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">{details.title}</h2>
                <p className="text-gray-500 mb-10 text-base leading-relaxed">{details.message}</p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 border border-gray-200 transition-all font-medium whitespace-nowrap"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Voltar
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all font-medium whitespace-nowrap"
                    >
                        <Home className="w-5 h-5" />
                        Início
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px) }
          to { opacity: 1; transform: translateY(0) }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
