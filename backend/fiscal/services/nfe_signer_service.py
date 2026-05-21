"""NFeSignerService: assinatura digital do XML da NF-e com certificado A1.

Encapsula o uso de PyNFe/AssinaturaA1 + xmlsec. O service recebe o XML
em string e o material do certificado (em memória) e devolve o XML
assinado, sem nunca persistir o PFX em disco.
"""
from __future__ import annotations

import os
import tempfile
from typing import Protocol

from backend.fiscal.domain.exceptions import CertificateError
from backend.fiscal.services.certificate_service import CertificateMaterial


class XmlSigner(Protocol):
    def sign(self, xml: str, material: CertificateMaterial) -> str: ...


class PyNFeXmlSigner:
    def sign(self, xml: str, material: CertificateMaterial) -> str:
        from lxml import etree
        from pynfe.processador.assinatura import AssinaturaA1

        # PyNFe lê o PFX de disco. Para não persistir o material em claro,
        # usamos um arquivo temporário com permissão restrita e o apagamos
        # imediatamente após o uso.
        fd, path = tempfile.mkstemp(suffix=".pfx", prefix="rr_fiscal_")
        try:
            os.write(fd, material.pfx_bytes)
            os.close(fd)
            os.chmod(path, 0o600)

            signer = AssinaturaA1(certificado=path, senha=material.password)
            arvore = etree.fromstring(xml.encode("utf-8"))
            arvore_assinada = signer.assinar(arvore)
            return etree.tostring(arvore_assinada, encoding="unicode")
        except Exception as exc:  # noqa: BLE001
            raise CertificateError(f"Falha ao assinar XML: {exc}") from exc
        finally:
            try:
                os.remove(path)
            except OSError:
                pass


def get_default_signer() -> XmlSigner:
    return PyNFeXmlSigner()
