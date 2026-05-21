"""NFeService: orquestra emissão, transmissão e cancelamento da NF-e.

Princípios aplicados:
    - SRP: cada colaborador (build XML, assinar, transmitir, persistir)
      tem sua própria classe.
    - DIP: dependências são abstrações (Protocol), recebidas no construtor.
    - DRY: validações e montagem de value objects são reutilizadas.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterable

from backend.fiscal.domain.enums import (
    AmbienteSEFAZ,
    CSOSN,
    FinalidadeEmissao,
    IndicadorPresenca,
    ModeloDocumento,
    NFeStatus,
    RegimeTributario,
    TipoOperacao,
)
from backend.fiscal.domain.exceptions import (
    FiscalValidationError,
    NFeNotFoundError,
    NFeStateError,
    SefazRejectedError,
)
from backend.fiscal.domain.value_objects import (
    DadosNFe,
    Destinatario,
    Emitente,
    Endereco,
    IdentificacaoNFe,
    ItemFiscal,
)
from backend.fiscal.models.nfe import NFe, NFeItem
from backend.fiscal.repositories.fiscal_config_repository import FiscalConfigRepository
from backend.fiscal.repositories.nfe_repository import NFeRepository
from backend.fiscal.services.certificate_service import CertificateService
from backend.fiscal.services.fiscal_config_service import FiscalConfigService
from backend.fiscal.services.nfe_signer_service import XmlSigner
from backend.fiscal.services.sefaz_transmitter import SefazTransmitter, TransmissaoContext
from backend.fiscal.services.xml_builder_service import XmlBuilder
from backend.fiscal.validators import (
    is_valid_cfop,
    is_valid_cnpj,
    is_valid_cpf,
    is_valid_csosn,
    is_valid_ncm,
    strip_non_digits,
)


class NFeService:
    def __init__(
        self,
        *,
        nfe_repository: NFeRepository,
        fiscal_config_repository: FiscalConfigRepository,
        fiscal_config_service: FiscalConfigService,
        certificate_service: CertificateService,
        xml_builder: XmlBuilder,
        xml_signer: XmlSigner,
        transmitter: SefazTransmitter,
    ) -> None:
        self._repo = nfe_repository
        self._cfg_repo = fiscal_config_repository
        self._cfg_service = fiscal_config_service
        self._cert_service = certificate_service
        self._builder = xml_builder
        self._signer = xml_signer
        self._transmitter = transmitter

    # ── Comandos ────────────────────────────────────────────────────────────
    def create_draft(self, user_id: int, payload: dict) -> NFe:
        config = self._cfg_service.require(user_id)
        destinatario_data = payload["destinatario"]
        itens_data = payload["itens"]

        self._validate_destinatario(destinatario_data)
        self._validate_itens(itens_data)

        valor_produtos = sum(
            Decimal(str(i["quantidade"])) * Decimal(str(i["valor_unitario"]))
            for i in itens_data
        )

        nfe = NFe(
            user_id=user_id,
            client_id=payload.get("client_id"),
            numero=0,  # atribuído na emissão
            serie=config.serie_padrao,
            modelo=ModeloDocumento.NFE.value,
            ambiente=config.ambiente,
            natureza_operacao=payload.get("natureza_operacao", "VENDA DE MERCADORIA"),
            finalidade=payload.get("finalidade", FinalidadeEmissao.NORMAL.value),
            tipo_operacao=payload.get("tipo_operacao", TipoOperacao.SAIDA.value),
            indicador_presenca=payload.get(
                "indicador_presenca", IndicadorPresenca.PRESENCIAL.value
            ),
            status=NFeStatus.RASCUNHO.value,
            destinatario_documento=strip_non_digits(destinatario_data["documento"]),
            destinatario_nome=destinatario_data["nome"].strip(),
            destinatario_ie=destinatario_data.get("inscricao_estadual"),
            destinatario_email=destinatario_data.get("email"),
            destinatario_endereco=json.dumps(destinatario_data.get("endereco") or {}, ensure_ascii=False),
            informacoes_adicionais=payload.get("informacoes_adicionais"),
            valor_produtos=float(valor_produtos),
            valor_total=float(valor_produtos),
        )

        for idx, item in enumerate(itens_data, start=1):
            qtd = Decimal(str(item["quantidade"]))
            vunit = Decimal(str(item["valor_unitario"]))
            total = (qtd * vunit).quantize(Decimal("0.01"))
            nfe.itens.append(
                NFeItem(
                    numero_item=idx,
                    codigo=str(item["codigo"]),
                    descricao=item["descricao"],
                    ncm=strip_non_digits(item["ncm"]),
                    cfop=strip_non_digits(item["cfop"]),
                    unidade_comercial=item.get("unidade_comercial", "UN"),
                    ean=item.get("ean"),
                    quantidade=float(qtd),
                    valor_unitario=float(vunit),
                    valor_total=float(total),
                    csosn=item["csosn"],
                    origem=item.get("origem", "0"),
                    product_id=item.get("product_id"),
                )
            )

        return self._repo.add(nfe)

    def issue(self, user_id: int, nfe_id: int) -> NFe:
        """Numera, monta o XML, assina, transmite à SEFAZ e atualiza o estado."""
        nfe = self._repo.get(user_id, nfe_id)
        if not nfe:
            raise NFeNotFoundError("NF-e não encontrada.")
        if nfe.status not in {NFeStatus.RASCUNHO.value, NFeStatus.REJEITADA.value, NFeStatus.ERRO.value}:
            raise NFeStateError(f"NF-e não pode ser emitida no estado '{nfe.status}'.")

        config = self._cfg_service.require(user_id)
        material = self._cert_service.load_material(user_id)

        if nfe.numero == 0:
            numero, serie = self._cfg_repo.reserve_next_number(user_id)
            nfe.numero = numero
            nfe.serie = serie

        dados = self._build_dados(nfe, config)
        xml = self._builder.build(dados)
        xml_assinado = self._signer.sign(xml, material)
        nfe.xml_assinado = xml_assinado
        nfe.status = NFeStatus.ASSINADA.value
        self._repo.save(nfe)

        try:
            resultado = self._transmitter.transmitir(
                xml_assinado,
                TransmissaoContext(
                    uf=config.uf,
                    ambiente=AmbienteSEFAZ(config.ambiente),
                    material=material,
                ),
            )
        except SefazRejectedError as exc:
            nfe.status = NFeStatus.REJEITADA.value
            nfe.codigo_status_sefaz = exc.codigo
            nfe.motivo_rejeicao = exc.motivo
            self._repo.save(nfe)
            raise

        nfe.status = NFeStatus.AUTORIZADA.value
        nfe.codigo_status_sefaz = resultado.status_codigo
        nfe.protocolo = resultado.protocolo
        nfe.chave_acesso = resultado.chave_acesso
        nfe.xml_autorizado = resultado.xml_autorizado
        nfe.data_autorizacao = resultado.data_autorizacao or datetime.now(timezone.utc)
        return self._repo.save(nfe)

    # ── Queries ─────────────────────────────────────────────────────────────
    def get(self, user_id: int, nfe_id: int) -> NFe:
        nfe = self._repo.get(user_id, nfe_id)
        if not nfe:
            raise NFeNotFoundError("NF-e não encontrada.")
        return nfe

    def list(self, user_id: int, *, page: int = 1, per_page: int = 20, status: str | None = None):
        skip = (page - 1) * per_page
        total = self._repo.count_by_user(user_id, status=status)
        items = self._repo.list_by_user(user_id, skip=skip, limit=per_page, status=status)
        return {"items": items, "total": total, "page": page, "per_page": per_page}

    # ── Helpers ─────────────────────────────────────────────────────────────
    @staticmethod
    def _validate_destinatario(data: dict) -> None:
        doc = strip_non_digits(data.get("documento", ""))
        if len(doc) == 14:
            if not is_valid_cnpj(doc):
                raise FiscalValidationError("CNPJ do destinatário inválido.")
        elif len(doc) == 11:
            if not is_valid_cpf(doc):
                raise FiscalValidationError("CPF do destinatário inválido.")
        else:
            raise FiscalValidationError("Documento do destinatário deve ser CPF ou CNPJ.")
        if not (data.get("nome") or "").strip():
            raise FiscalValidationError("Nome do destinatário é obrigatório.")

    @staticmethod
    def _validate_itens(itens: Iterable[dict]) -> None:
        itens = list(itens)
        if not itens:
            raise FiscalValidationError("A NF-e deve possuir ao menos um item.")
        for idx, item in enumerate(itens, start=1):
            if not is_valid_ncm(item.get("ncm", "")):
                raise FiscalValidationError(f"Item {idx}: NCM inválido.")
            if not is_valid_cfop(item.get("cfop", "")):
                raise FiscalValidationError(f"Item {idx}: CFOP inválido.")
            if not is_valid_csosn(item.get("csosn", "")):
                raise FiscalValidationError(f"Item {idx}: CSOSN não suportado.")
            try:
                qtd = Decimal(str(item.get("quantidade", 0)))
                vunit = Decimal(str(item.get("valor_unitario", 0)))
            except Exception as exc:
                raise FiscalValidationError(f"Item {idx}: valores numéricos inválidos.") from exc
            if qtd <= 0 or vunit < 0:
                raise FiscalValidationError(f"Item {idx}: quantidade e valor unitário inválidos.")

    @staticmethod
    def _build_dados(nfe: NFe, config) -> DadosNFe:
        emitente = Emitente(
            cnpj=config.cnpj,
            razao_social=config.razao_social,
            nome_fantasia=config.nome_fantasia,
            inscricao_estadual=config.inscricao_estadual,
            regime_tributario=RegimeTributario(config.regime_tributario),
            endereco=Endereco(
                logradouro=config.logradouro,
                numero=config.numero,
                complemento=config.complemento,
                bairro=config.bairro,
                municipio=config.municipio,
                cod_municipio_ibge=config.cod_municipio_ibge,
                uf=config.uf,
                cep=config.cep,
            ),
            inscricao_municipal=config.inscricao_municipal,
            cnae_fiscal=config.cnae_fiscal,
        )

        endereco_dest_raw = json.loads(nfe.destinatario_endereco or "{}")
        endereco_dest = None
        if endereco_dest_raw:
            endereco_dest = Endereco(
                logradouro=endereco_dest_raw.get("logradouro", ""),
                numero=endereco_dest_raw.get("numero", "S/N"),
                complemento=endereco_dest_raw.get("complemento"),
                bairro=endereco_dest_raw.get("bairro", ""),
                municipio=endereco_dest_raw.get("municipio", ""),
                cod_municipio_ibge=endereco_dest_raw.get("cod_municipio_ibge", ""),
                uf=endereco_dest_raw.get("uf", ""),
                cep=strip_non_digits(endereco_dest_raw.get("cep", "")),
            )

        destinatario = Destinatario(
            nome=nfe.destinatario_nome,
            documento=nfe.destinatario_documento,
            inscricao_estadual=nfe.destinatario_ie,
            email=nfe.destinatario_email,
            endereco=endereco_dest,
        )

        identificacao = IdentificacaoNFe(
            numero=nfe.numero,
            serie=nfe.serie,
            data_emissao=nfe.data_emissao or datetime.now(timezone.utc),
            modelo=ModeloDocumento(nfe.modelo),
            tipo_operacao=TipoOperacao(nfe.tipo_operacao),
            finalidade=FinalidadeEmissao(nfe.finalidade),
            indicador_presenca=IndicadorPresenca(nfe.indicador_presenca),
            natureza_operacao=nfe.natureza_operacao,
            ambiente=AmbienteSEFAZ(nfe.ambiente),
        )

        itens = tuple(
            ItemFiscal(
                numero_item=item.numero_item,
                codigo=item.codigo,
                descricao=item.descricao,
                ncm=item.ncm,
                cfop=item.cfop,
                unidade_comercial=item.unidade_comercial,
                quantidade=Decimal(str(item.quantidade)),
                valor_unitario=Decimal(str(item.valor_unitario)),
                csosn=CSOSN(item.csosn),
                origem=item.origem,
                ean=item.ean,
            )
            for item in nfe.itens
        )

        return DadosNFe(
            identificacao=identificacao,
            emitente=emitente,
            destinatario=destinatario,
            itens=itens,
            informacoes_adicionais=nfe.informacoes_adicionais,
        )
