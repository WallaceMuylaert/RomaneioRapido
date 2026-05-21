"""Módulo fiscal: emissão e gestão de NF-e (NF-e 4.00 / SEFAZ).

Organização (bounded context):
    - domain/        : enums, exceções e value objects (sem dependências externas)
    - validators/    : validação e formatação de campos fiscais (SRP)
    - models/        : entidades SQLAlchemy
    - schemas/       : DTOs Pydantic
    - repositories/  : acesso a dados
    - services/      : regras de negócio (criptografia, certificado, XML, SEFAZ, DANFE)
    - routers/       : endpoints HTTP

Princípios:
    - SRP: cada classe/módulo tem uma única razão para mudar.
    - DIP: services dependem de abstrações (interfaces), não de implementações.
    - DRY: validadores e formatadores reutilizáveis em todo o módulo.
"""
