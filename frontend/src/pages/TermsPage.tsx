import { ArrowLeft, ScrollText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TermsPage() {
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
                        <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-600">
                            <ScrollText className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Termos de Uso</h1>
                            <p className="text-slate-500 font-medium mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>

                    <div className="space-y-10 text-slate-600">
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">1. Aceitação dos Termos</h2>
                            <p className="leading-relaxed">
                                Ao acessar e usar a plataforma Romaneio Rápido, você aceita e concorda em cumprir estes Termos de Uso. Se você não concordar com qualquer parte destes termos, você não deve usar nossos serviços de gestão.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">2. Descrição do Serviço</h2>
                            <p className="leading-relaxed">
                                O Romaneio Rápido fornece uma plataforma de gestão online que permite aos usuários administrar produtos, separar pedidos com romaneios interativos e organizar clientes. Nós fornecemos apenas a mecânica do software, sendo a integridade física e o manuseio dos estoques de sua responsabilidade exclusiva.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">3. Conta do Usuário</h2>
                            <p className="leading-relaxed">
                                Para usar certos e poderosos recursos da nossa blindagem, você precisará criar uma conta. Você é totalmente responsável por manter a proteção e a confidencialidade de suas credenciais, assim como todas as atividades e integrações que ocorrem sob sua autorização.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">4. Uso Aceitável</h2>
                            <p className="leading-relaxed">
                                Você concorda em não usar as automações do serviço para qualquer finalidade ilegal ou proibida por lei. É estritamente proibido cadastrar elementos de caráter fraudulento, ilícito ou que viole direitos de propriedade de terceiros sob nossas hospedagens.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">5. Alterações nos Termos</h2>
                            <p className="leading-relaxed">
                                Reservamo-nos o direito soberano de modificar estes termos a qualquer momento, visando melhorar o produto e as diretrizes. As alterações entrarão em vigor imediatamente após a sua respectiva publicação na plataforma web. O uso contínuo de nossos blocos de código caracteriza que você entende as atualizações.
                            </p>
                        </section>

                        <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Contato</h2>
                            <p className="leading-relaxed text-slate-500 text-sm">
                                Se tiver qualquer travamento, dúvidas criativas ou operacionais sobre estes Termos de Uso, nossa central e suporte estarão abertos pelo e-mail: <br/>
                                <a href="mailto:romaneiorapido@gmail.com" className="font-bold text-brand-600 hover:text-brand-700 transition-colors">romaneiorapido@gmail.com</a>
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    )
}
