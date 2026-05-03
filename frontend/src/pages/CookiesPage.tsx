import { ArrowLeft, Cookie } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CookiesPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background py-12 px-6 font-sans">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-text-secondary hover:text-brand-600 transition-colors font-bold text-sm mb-10 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Voltar para o Início
                </button>

                <div className="bg-card rounded-[2rem] p-8 md:p-14 shadow-2xl shadow-slate-200/50 border border-border animate-slide-up">
                    <div className="flex items-center gap-4 mb-10 pb-10 border-b border-border">
                        <div className="w-14 h-14 bg-warning/10 rounded-2xl flex items-center justify-center text-warning">
                            <Cookie className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">Política de Cookies</h1>
                            <p className="text-text-secondary font-medium mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="space-y-10 text-text-secondary">
                        <section>
                            <h2 className="text-xl font-bold text-text-primary mb-4 tracking-tight">O que são Cookies?</h2>
                            <p className="leading-relaxed">
                                Cookies são pequenos arquivos que nosso site salva no seu navegador enquanto você os utiliza. Eles funcionam basicamente para lembrar de você, mantendo sua sessão contínua para que as páginas não percam as suas informações a cada mudança de tela.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-primary mb-4 tracking-tight">Como o RomaneioRápido usa isso?</h2>
                            <p className="leading-relaxed">
                                Diferente de aplicativos que coletam as suas informações minuciosamente para te mostrar anúncios, nós usamos esses cookies de forma estrita para fazer a <strong>plataforma funcionar e agir de forma segura</strong>. É através deles que não solicitamos que você ponha sua senha todo instante e é dessa forma que evitamos que seus romaneios não-salvos se percam quando a tela falhar.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-text-primary mb-4 tracking-tight">Gerenciamento no seu Navegador</h2>
                            <p className="leading-relaxed">
                                O bloqueio absoluto dos cookies é possível modificando as regras do seu próprio navegador. Porém, ressaltamos que bloquear a aceitação ou desativá-los no nosso domínio impossibilitará você de realizar o acesso à plataforma e ao seu painel interno.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
