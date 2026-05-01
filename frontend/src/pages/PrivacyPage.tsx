import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PrivacyPage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-brand-600 transition-colors font-bold text-sm mb-10 group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Voltar para o Início
                </button>

                <div className="bg-white rounded-[2rem] p-8 md:p-14 shadow-2xl shadow-slate-200/50 border border-slate-100 animate-slide-up">
                    <div className="flex items-center gap-4 mb-10 pb-10 border-b border-slate-100">
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <ShieldCheck className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Política de Privacidade</h1>
                            <p className="text-slate-500 font-medium mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="space-y-10 text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">1. Coleta e Uso de Dados</h2>
                            <p className="leading-relaxed">
                                No Romaneio Rápido, nossa prioridade e arquitetura são baseadas 100% na segurança. Ao criar sua conta, guardamos e protegemos dados essenciais (como e-mail, nome e preferências de operação) apenas com a finalidade de viabilizar a entrada no sistema e otimizar as métricas dos painéis da sua empresa.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">2. Proteção do Seu Banco de Dados</h2>
                            <p className="leading-relaxed">
                                A sua lista de produtos, seus clientes salvos e toda a rastreabilidade interna de estoque pertencem integralmente a você. Aplicamos criptografia e não utilizamos essas tabelas de forma pública nem as vendemos a terceiros. Seus ativos ficam protegidos.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">3. Notificações e Canais</h2>
                            <p className="leading-relaxed">
                                Nossa plataforma enviará de modo reservado e automágico alguns alertas e e-mails como, por exemplo, o link seguro quando for solicitada alteração ou recuperação de senha. Nós nunca efetuaremos abordagens de spam indevidas ao seu contato.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">4. Exclusão e Modificações</h2>
                            <p className="leading-relaxed">
                                Caso encerre o vínculo com o sistema no futuro, reservado aos devidos prazos, os bancos descartarão as sessões de usuário ativo, não retendo as pontas desnecessárias ligadas a operação finalizada. Se quiser questionar seus dados num cenário ativo, recorra ao suporte de e-mail.
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
