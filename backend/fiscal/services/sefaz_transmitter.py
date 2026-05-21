"""SefazTransmitter: envia XML assinado para a SEFAZ e devolve o resultado.

Strategy/Adapter pattern: o orquestrador (NFeService) depende apenas da
interface `SefazTransmitter`. Concretizações podem usar PyNFe, NFe.IO,
Focus NFe, etc. — sem impacto no resto do código.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol

from backend.fiscal.domain.enums import AmbienteSEFAZ
from backend.fiscal.domain.exceptions import SefazError, SefazRejectedError
from backend.fiscal.domain.value_objects import ResultadoTransmissao
from backend.fiscal.services.certificate_service import CertificateMaterial


@dataclass(frozen=True)
class TransmissaoContext:
    uf: str
    ambiente: AmbienteSEFAZ
    material: CertificateMaterial


class SefazTransmitter(Protocol):
    def transmitir(self, xml_assinado: str, contexto: TransmissaoContext) -> ResultadoTransmissao: ...


class PyNFeSefazTransmitter:
    """Implementação concreta usando PyNFe."""

    _CHAVE_RE = re.compile(r"<chNFe>(\d{44})</chNFe>")
    _PROT_RE = re.compile(r"<nProt>(\d+)</nProt>")
    _CSTAT_RE = re.compile(r"<cStat>(\d+)</cStat>")
    _XMOTIVO_RE = re.compile(r"<xMotivo>([^<]+)</xMotivo>")

    def transmitir(self, xml_assinado: str, contexto: TransmissaoContext) -> ResultadoTransmissao:
        import os
        import tempfile

        from pynfe.processador.comunicacao import ComunicacaoSefaz

        fd, path = tempfile.mkstemp(suffix=".pfx", prefix="rr_fiscal_")
        try:
            os.write(fd, contexto.material.pfx_bytes)
            os.close(fd)
            os.chmod(path, 0o600)

            comm = ComunicacaoSefaz(
                uf=contexto.uf,
                certificado=path,
                certificado_senha=contexto.material.password,
                homologacao=(contexto.ambiente is AmbienteSEFAZ.HOMOLOGACAO),
            )
            envio = comm.autorizacao(modelo="nfe", nota_fiscal=xml_assinado)
        except Exception as exc:  # noqa: BLE001 — falha de rede/SEFAZ
            raise SefazError(f"Falha na comunicação com a SEFAZ: {exc}") from exc
        finally:
            try:
                os.remove(path)
            except OSError:
                pass

        # `envio` é uma tupla (codigo_http, xml_resposta). Padronizamos abaixo.
        xml_resposta = envio[1] if isinstance(envio, tuple) and len(envio) >= 2 else str(envio)
        return self._parse_resposta(xml_resposta)

    def _parse_resposta(self, xml_resposta: str) -> ResultadoTransmissao:
        cstat_match = self._CSTAT_RE.search(xml_resposta)
        xmotivo_match = self._XMOTIVO_RE.search(xml_resposta)
        prot_match = self._PROT_RE.search(xml_resposta)
        chave_match = self._CHAVE_RE.search(xml_resposta)

        codigo = cstat_match.group(1) if cstat_match else "999"
        motivo = xmotivo_match.group(1) if xmotivo_match else "Sem motivo retornado"

        if codigo != "100":
            raise SefazRejectedError(
                f"NF-e rejeitada pela SEFAZ: {motivo} (cStat {codigo})",
                codigo=codigo,
                motivo=motivo,
            )

        return ResultadoTransmissao(
            sucesso=True,
            status_codigo=codigo,
            status_motivo=motivo,
            protocolo=prot_match.group(1) if prot_match else None,
            chave_acesso=chave_match.group(1) if chave_match else None,
            xml_autorizado=xml_resposta,
            data_autorizacao=datetime.now(timezone.utc),
        )


def get_default_transmitter() -> SefazTransmitter:
    return PyNFeSefazTransmitter()
