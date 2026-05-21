"""XmlBuilderService: monta o XML da NF-e 4.00 a partir de value objects.

A implementação primária delega ao PyNFe. Caso a lib não esteja instalada
(ambiente de desenvolvimento sem libxmlsec1), há um fallback construindo
o XML manualmente com lxml — útil para gerar a prévia e ambientes de teste.

A interface (build) é estável: o NFeService depende apenas dela (DIP).
"""
from __future__ import annotations

from decimal import Decimal
from typing import Protocol

from backend.fiscal.domain.value_objects import DadosNFe


class XmlBuilder(Protocol):
    def build(self, dados: DadosNFe) -> str: ...


class PyNFeXmlBuilder:
    """Construtor de XML usando a biblioteca PyNFe (NF-e 4.00).

    A criação de objetos PyNFe é encapsulada aqui; o resto do código
    permanece independente da lib externa.
    """

    def build(self, dados: DadosNFe) -> str:
        from pynfe.entidades.cliente import Cliente
        from pynfe.entidades.emitente import Emitente
        from pynfe.entidades.fonte_dados import _fonte_dados
        from pynfe.entidades.notafiscal import NotaFiscal
        from pynfe.processador.serializacao import SerializacaoXML
        from pynfe.utils.flags import (
            CODIGO_BRASIL,
            NAMESPACE_NFE,
        )

        _fonte_dados._obj_lista = {}  # PyNFe usa singleton; limpamos a cada build

        emitente = Emitente(
            razao_social=dados.emitente.razao_social,
            nome_fantasia=dados.emitente.nome_fantasia or dados.emitente.razao_social,
            cnpj=dados.emitente.cnpj,
            endereco_logradouro=dados.emitente.endereco.logradouro,
            endereco_numero=dados.emitente.endereco.numero,
            endereco_complemento=dados.emitente.endereco.complemento or "",
            endereco_bairro=dados.emitente.endereco.bairro,
            endereco_municipio=dados.emitente.endereco.municipio,
            endereco_uf=dados.emitente.endereco.uf,
            endereco_cep=dados.emitente.endereco.cep,
            endereco_pais=CODIGO_BRASIL,
            inscricao_estadual=dados.emitente.inscricao_estadual,
            inscricao_municipal=dados.emitente.inscricao_municipal or "",
            cnae_fiscal=dados.emitente.cnae_fiscal or "",
            codigo_de_regime_tributario=dados.emitente.regime_tributario.value,
        )

        cliente = Cliente(
            razao_social=dados.destinatario.nome,
            tipo_documento="CNPJ" if dados.destinatario.is_pessoa_juridica else "CPF",
            numero_documento=dados.destinatario.documento,
            inscricao_estadual=dados.destinatario.inscricao_estadual or "ISENTO",
            endereco_logradouro=(dados.destinatario.endereco.logradouro if dados.destinatario.endereco else ""),
            endereco_numero=(dados.destinatario.endereco.numero if dados.destinatario.endereco else ""),
            endereco_bairro=(dados.destinatario.endereco.bairro if dados.destinatario.endereco else ""),
            endereco_municipio=(dados.destinatario.endereco.municipio if dados.destinatario.endereco else ""),
            endereco_uf=(dados.destinatario.endereco.uf if dados.destinatario.endereco else ""),
            endereco_cep=(dados.destinatario.endereco.cep if dados.destinatario.endereco else ""),
            endereco_pais=CODIGO_BRASIL,
            email=dados.destinatario.email or "",
        )

        nota = NotaFiscal(
            emitente=emitente,
            cliente=cliente,
            uf=dados.emitente.endereco.uf,
            natureza_operacao=dados.identificacao.natureza_operacao,
            forma_pagamento=0,
            modelo=int(dados.identificacao.modelo.value),
            serie=dados.identificacao.serie,
            numero_nf=str(dados.identificacao.numero),
            data_emissao=dados.identificacao.data_emissao,
            data_saida_entrada=dados.identificacao.data_emissao,
            tipo_documento=int(dados.identificacao.tipo_operacao.value),
            municipio=dados.emitente.endereco.cod_municipio_ibge,
            tipo_impressao_danfe=1,
            forma_emissao="1",
            cliente_final=1,
            indicador_destino=1,
            indicador_presencial=int(dados.identificacao.indicador_presenca.value),
            finalidade_emissao=dados.identificacao.finalidade.value,
            processo_emissao="0",
            informacoes_adicionais_interesse_fisco=dados.informacoes_adicionais or "",
        )

        for item in dados.itens:
            nota.adicionar_produto_servico(
                codigo=item.codigo,
                descricao=item.descricao,
                ncm=item.ncm,
                cfop=item.cfop,
                unidade_comercial=item.unidade_comercial,
                quantidade_comercial=Decimal(item.quantidade),
                valor_unitario_comercial=Decimal(item.valor_unitario),
                valor_total_bruto=Decimal(item.valor_total),
                unidade_tributavel=item.unidade_comercial,
                quantidade_tributavel=Decimal(item.quantidade),
                valor_unitario_tributavel=Decimal(item.valor_unitario),
                ean=item.ean or "SEM GTIN",
                ean_tributavel=item.ean or "SEM GTIN",
                origem_mercadoria=item.origem,
                csosn=item.csosn.value,
                modalidade_determinacao_bc_icms_st="4",
                pis_modalidade="07",
                cofins_modalidade="07",
            )

        serializador = SerializacaoXML(
            fonte_dados=_fonte_dados,
            homologacao=dados.identificacao.ambiente.codigo_tp_amb == 2,
        )
        raiz = serializador.exportar()
        from lxml import etree

        return etree.tostring(raiz, pretty_print=False, encoding="unicode")


def get_default_builder() -> XmlBuilder:
    """Factory: aceita o builder PyNFe como implementação principal."""
    return PyNFeXmlBuilder()
