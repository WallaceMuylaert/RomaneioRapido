"""DanfeRenderer: monta a representação visual (prévia DANFE) consumida
pelo frontend.

A renderização HTML/A4 fica do lado do React (responsiva, preparada
para impressão pelo navegador, como pedido na proposta). Aqui geramos
apenas o dicionário com campos já formatados (CNPJ, CPF, CEP, moeda).
"""
from __future__ import annotations

from backend.fiscal.models.fiscal_config import FiscalConfig
from backend.fiscal.models.nfe import NFe
from backend.fiscal.validators import (
    format_cep,
    format_cnpj,
    format_cpf,
    format_currency_brl,
    format_phone,
)


class DanfeRenderer:
    def render(self, nfe: NFe, config: FiscalConfig) -> dict:
        return {
            "identificacao": self._render_identificacao(nfe),
            "emitente": self._render_emitente(config),
            "destinatario": self._render_destinatario(nfe),
            "itens": [self._render_item(it) for it in nfe.itens],
            "totais": {
                "valor_produtos": format_currency_brl(nfe.valor_produtos or 0),
                "valor_total": format_currency_brl(nfe.valor_total or 0),
            },
            "informacoes_adicionais": nfe.informacoes_adicionais,
            "ambiente": nfe.ambiente,
            "status": nfe.status,
            "chave_acesso": self._format_chave(nfe.chave_acesso),
            "protocolo": nfe.protocolo,
        }

    @staticmethod
    def _render_identificacao(nfe: NFe) -> dict:
        return {
            "numero": nfe.numero,
            "serie": nfe.serie,
            "modelo": nfe.modelo,
            "natureza_operacao": nfe.natureza_operacao,
            "data_emissao": nfe.data_emissao.isoformat() if nfe.data_emissao else None,
            "data_autorizacao": nfe.data_autorizacao.isoformat() if nfe.data_autorizacao else None,
        }

    @staticmethod
    def _render_emitente(config: FiscalConfig) -> dict:
        return {
            "razao_social": config.razao_social,
            "nome_fantasia": config.nome_fantasia,
            "cnpj": format_cnpj(config.cnpj),
            "inscricao_estadual": config.inscricao_estadual,
            "endereco": {
                "logradouro": config.logradouro,
                "numero": config.numero,
                "complemento": config.complemento,
                "bairro": config.bairro,
                "municipio": config.municipio,
                "uf": config.uf,
                "cep": format_cep(config.cep),
            },
        }

    @staticmethod
    def _render_destinatario(nfe: NFe) -> dict:
        doc = nfe.destinatario_documento or ""
        documento_formatado = format_cnpj(doc) if len(doc) == 14 else format_cpf(doc)
        return {
            "nome": nfe.destinatario_nome,
            "documento": documento_formatado,
            "inscricao_estadual": nfe.destinatario_ie,
            "email": nfe.destinatario_email,
            "telefone": None,
            "endereco_raw": nfe.destinatario_endereco,
        }

    @staticmethod
    def _render_item(item) -> dict:
        return {
            "numero_item": item.numero_item,
            "codigo": item.codigo,
            "descricao": item.descricao,
            "ncm": item.ncm,
            "cfop": item.cfop,
            "unidade": item.unidade_comercial,
            "quantidade": item.quantidade,
            "valor_unitario": format_currency_brl(item.valor_unitario or 0),
            "valor_total": format_currency_brl(item.valor_total or 0),
            "csosn": item.csosn,
        }

    @staticmethod
    def _format_chave(chave: str | None) -> str | None:
        if not chave or len(chave) != 44:
            return chave
        return " ".join(chave[i : i + 4] for i in range(0, 44, 4))
