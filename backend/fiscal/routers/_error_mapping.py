"""Mapeamento de exceções do domínio fiscal para HTTPException.

Mantém os services HTTP-agnósticos. Os routers chamam `handle_fiscal_errors`
ao redor da chamada de service para traduzir erros uniformemente.
"""
from __future__ import annotations

from contextlib import contextmanager

from fastapi import HTTPException, status

from backend.fiscal.domain.exceptions import (
    CertificateError,
    CertificateExpiredError,
    CertificateInvalidError,
    CertificateNotFoundError,
    FiscalConfigError,
    FiscalValidationError,
    NFeNotFoundError,
    NFeStateError,
    SefazError,
    SefazRejectedError,
)


@contextmanager
def handle_fiscal_errors():
    try:
        yield
    except FiscalValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except FiscalConfigError as exc:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail=str(exc))
    except CertificateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail=str(exc))
    except CertificateExpiredError as exc:
        raise HTTPException(status_code=status.HTTP_412_PRECONDITION_FAILED, detail=str(exc))
    except CertificateInvalidError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except CertificateError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except NFeNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except NFeStateError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except SefazRejectedError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": str(exc), "codigo": exc.codigo, "motivo": exc.motivo},
        )
    except SefazError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
