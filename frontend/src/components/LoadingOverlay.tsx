import logo from '../assets/romaneiorapido_logo.png'

interface LoadingOverlayProps {
    message?: string;
}

export default function LoadingOverlay({ message = 'Carregando...' }: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-card/60 backdrop-blur-2xl animate-fade-in">
            {/* Ambient background glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-[100px] animate-pulse delay-700" />

            <div className="relative flex flex-col items-center">
                {/* Logo Container with rotating ring */}
                <div className="relative w-24 h-24 mb-10">
                    {/* Inner Glass Card */}
                    <div className="absolute inset-0 bg-card/80 backdrop-blur-xl rounded-3xl border border-card shadow-2xl flex items-center justify-center z-10 animate-scale-pulse p-4">
                        <img src={logo} alt="Logo" className="w-full h-full object-contain animate-bounce-slow" />
                    </div>

                    {/* Rotating Ring */}
                    <div className="absolute -inset-2 border-t-4 border-brand-500 rounded-full animate-spin transition-all duration-1000" />
                    <div className="absolute -inset-4 border-t-2 border-brand-200 rounded-full animate-spin-reverse transition-all duration-1500" />
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-4">
                    <span className="text-2xl font-black text-text-primary tracking-tighter uppercase text-center block">
                        {message}
                    </span>
                    <div className="flex gap-2">
                        <div className="w-2.5 h-2.5 bg-brand-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2.5 h-2.5 bg-brand-400 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    )
}
