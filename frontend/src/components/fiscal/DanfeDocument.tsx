/**
 * Visualizador de DANFE (prévia) — A4, otimizado para impressão pelo navegador.
 *
 * O componente é apresentacional: recebe os dados já formatados pelo backend
 * (CNPJ, CPF, CEP, moeda) e renderiza o layout. Estilo via CSS-in-JSX para
 * que `@media print` funcione independente do tailwind atual.
 */
import type { DanfeData } from '@/services/fiscal'

interface Props {
    data: DanfeData
}

export default function DanfeDocument({ data }: Props) {
    const isHomologacao = data.ambiente === 'homologacao'
    return (
        <>
            <style>{styles}</style>
            <div className="danfe-page">
                {isHomologacao && (
                    <div className="danfe-watermark">
                        SEM VALOR FISCAL — AMBIENTE DE HOMOLOGAÇÃO
                    </div>
                )}

                <header className="danfe-header">
                    <div className="danfe-emitente">
                        <div className="danfe-emitente-nome">{data.emitente.razao_social}</div>
                        {data.emitente.nome_fantasia && (
                            <div className="danfe-emitente-fantasia">{data.emitente.nome_fantasia}</div>
                        )}
                        <div className="danfe-emitente-endereco">
                            {data.emitente.endereco.logradouro}, {data.emitente.endereco.numero}
                            {data.emitente.endereco.complemento ? ` — ${data.emitente.endereco.complemento}` : ''}
                            <br />
                            {data.emitente.endereco.bairro} — {data.emitente.endereco.municipio}/
                            {data.emitente.endereco.uf} — CEP {data.emitente.endereco.cep}
                        </div>
                    </div>
                    <div className="danfe-identificacao">
                        <div className="danfe-titulo">DANFE</div>
                        <div className="danfe-sub">Documento Auxiliar da Nota Fiscal Eletrônica</div>
                        <div className="danfe-meta">
                            <span>Nº {String(data.identificacao.numero).padStart(9, '0')}</span>
                            <span>Série {data.identificacao.serie}</span>
                            <span>Modelo {data.identificacao.modelo}</span>
                        </div>
                        <div className="danfe-status">Status: {translateStatus(data.status)}</div>
                    </div>
                </header>

                <section className="danfe-chave">
                    <div className="danfe-label">CHAVE DE ACESSO</div>
                    <div className="danfe-chave-valor">{data.chave_acesso || '—'}</div>
                    {data.protocolo && (
                        <div className="danfe-proto">Protocolo de autorização: {data.protocolo}</div>
                    )}
                </section>

                <section className="danfe-block">
                    <div className="danfe-block-title">EMITENTE</div>
                    <div className="danfe-grid danfe-grid-2">
                        <Info label="CNPJ" value={data.emitente.cnpj} />
                        <Info label="Inscrição Estadual" value={data.emitente.inscricao_estadual} />
                    </div>
                </section>

                <section className="danfe-block">
                    <div className="danfe-block-title">DESTINATÁRIO</div>
                    <div className="danfe-grid danfe-grid-3">
                        <Info label="Nome / Razão social" value={data.destinatario.nome} />
                        <Info label="CNPJ/CPF" value={data.destinatario.documento} />
                        <Info label="Inscrição estadual" value={data.destinatario.inscricao_estadual || 'ISENTO'} />
                    </div>
                </section>

                <section className="danfe-block">
                    <div className="danfe-block-title">DADOS DOS PRODUTOS / SERVIÇOS</div>
                    <table className="danfe-itens">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Código</th>
                                <th style={{ textAlign: 'left' }}>Descrição</th>
                                <th>NCM</th>
                                <th>CFOP</th>
                                <th>Un.</th>
                                <th>Qtd.</th>
                                <th>Vlr. Unit.</th>
                                <th>Vlr. Total</th>
                                <th>CSOSN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.itens.map((item) => (
                                <tr key={item.numero_item}>
                                    <td>{item.numero_item}</td>
                                    <td>{item.codigo}</td>
                                    <td style={{ textAlign: 'left' }}>{item.descricao}</td>
                                    <td>{item.ncm}</td>
                                    <td>{item.cfop}</td>
                                    <td>{item.unidade}</td>
                                    <td>{item.quantidade}</td>
                                    <td>{item.valor_unitario}</td>
                                    <td>{item.valor_total}</td>
                                    <td>{item.csosn}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <section className="danfe-block">
                    <div className="danfe-block-title">TOTAIS</div>
                    <div className="danfe-grid danfe-grid-2">
                        <Info label="Valor dos produtos" value={data.totais.valor_produtos} />
                        <Info label="Valor total da nota" value={data.totais.valor_total} strong />
                    </div>
                </section>

                {data.informacoes_adicionais && (
                    <section className="danfe-block">
                        <div className="danfe-block-title">INFORMAÇÕES ADICIONAIS</div>
                        <p className="danfe-text">{data.informacoes_adicionais}</p>
                    </section>
                )}
            </div>
        </>
    )
}

function Info({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
    return (
        <div className="danfe-info">
            <div className="danfe-label">{label}</div>
            <div className={strong ? 'danfe-value danfe-strong' : 'danfe-value'}>{value || '—'}</div>
        </div>
    )
}

function translateStatus(status: string): string {
    const map: Record<string, string> = {
        rascunho: 'Rascunho',
        em_validacao: 'Em validação',
        assinada: 'Assinada',
        enviada: 'Enviada',
        autorizada: 'Autorizada',
        rejeitada: 'Rejeitada',
        denegada: 'Denegada',
        cancelada: 'Cancelada',
        erro: 'Erro',
    }
    return map[status] || status
}

const styles = `
.danfe-page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm;
    margin: 0 auto;
    background: #fff;
    color: #111;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    position: relative;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
}
.danfe-watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(200, 0, 0, 0.18);
    font-size: 36pt;
    font-weight: 900;
    transform: rotate(-25deg);
    pointer-events: none;
    text-align: center;
    line-height: 1.2;
}
.danfe-header {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #222;
}
.danfe-emitente-nome { font-size: 13pt; font-weight: 800; }
.danfe-emitente-fantasia { font-size: 10pt; color: #444; }
.danfe-emitente-endereco { font-size: 9pt; margin-top: 6px; line-height: 1.35; }
.danfe-identificacao { text-align: right; }
.danfe-titulo { font-size: 18pt; font-weight: 900; letter-spacing: 2px; }
.danfe-sub { font-size: 8pt; color: #555; margin-bottom: 6px; }
.danfe-meta { display: flex; gap: 8px; justify-content: flex-end; font-size: 9pt; font-weight: 700; }
.danfe-status { margin-top: 6px; font-size: 9pt; }
.danfe-chave {
    border: 1px solid #222;
    padding: 6px 10px;
    margin: 10px 0;
}
.danfe-chave-valor {
    font-family: 'Courier New', monospace;
    font-size: 11pt;
    letter-spacing: 1px;
    font-weight: 700;
}
.danfe-proto { font-size: 8pt; margin-top: 4px; color: #444; }
.danfe-block { border: 1px solid #222; margin-bottom: 8px; }
.danfe-block-title {
    background: #f1f1f1;
    padding: 4px 8px;
    font-size: 8pt;
    font-weight: 800;
    border-bottom: 1px solid #222;
    letter-spacing: 0.5px;
}
.danfe-grid { display: grid; gap: 0; padding: 0; }
.danfe-grid-2 { grid-template-columns: repeat(2, 1fr); }
.danfe-grid-3 { grid-template-columns: repeat(3, 1fr); }
.danfe-info { padding: 6px 8px; border-right: 1px solid #ddd; }
.danfe-grid-2 .danfe-info:nth-child(2n), .danfe-grid-3 .danfe-info:nth-child(3n) { border-right: 0; }
.danfe-label { font-size: 7pt; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
.danfe-value { font-size: 10pt; font-weight: 600; word-break: break-word; }
.danfe-strong { font-size: 12pt; font-weight: 800; }
.danfe-text { padding: 8px; font-size: 9pt; line-height: 1.4; }
.danfe-itens { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
.danfe-itens th, .danfe-itens td { border: 1px solid #ddd; padding: 4px 6px; text-align: center; }
.danfe-itens thead th { background: #f7f7f7; font-weight: 700; }

@media print {
    @page { size: A4; margin: 0; }
    body { background: #fff; }
    .danfe-page { box-shadow: none; margin: 0; }
}
`
