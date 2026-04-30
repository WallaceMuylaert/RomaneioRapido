import smtplib
from datetime import datetime
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Tuple
from backend.core.config import settings
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("mail")

EmailRecipient = Tuple[str, str]


def _smtp_is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASS)


def _send_message(email_to: str, subject: str, html_content: str) -> bool:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM or settings.SMTP_USER
    message["To"] = email_to
    message.attach(MIMEText(html_content, "html"))

    try:
        timeout = 10
        port = settings.SMTP_PORT or 587

        if port == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, port, timeout=timeout) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(message["From"], email_to, message.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, port, timeout=timeout) as server:
                if port == 587:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(message["From"], email_to, message.as_string())

        return True
    except ConnectionRefusedError:
        logger.error(f"ConexÃ£o recusada ao tentar enviar e-mail para {email_to} via {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        return False
    except smtplib.SMTPAuthenticationError:
        logger.error(f"Falha de autenticaÃ§Ã£o SMTP para o usuÃ¡rio {settings.SMTP_USER}")
        return False
    except smtplib.SMTPConnectError:
        logger.error(f"Erro de conexÃ£o SMTP para {settings.SMTP_HOST}")
        return False
    except Exception as e:
        logger.error(f"Erro inesperado ao enviar e-mail para {email_to}: {type(e).__name__}: {e}")
        return False


def _build_admin_email_html(recipient_name: str, subject: str, message: str) -> str:
    safe_name = escape(recipient_name or "cliente")
    safe_subject = escape(subject)
    safe_message = "<br>".join(escape(message).splitlines())

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; -webkit-font-smoothing: antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: left;">
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.3px;">{settings.PROJECT_NAME}</h1>
                </td>
            </tr>
            <tr>
                <td style="padding: 40px 48px;">
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">Olá, <strong>{safe_name}</strong>.</p>
                    <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 20px 0; letter-spacing: -0.5px;">{safe_subject}</h2>
                    <div style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0;">{safe_message}</div>
                </td>
            </tr>
            <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        Â© {datetime.now().year} {settings.PROJECT_NAME}.<br>
                        Este e-mail foi enviado pela equipe administrativa.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def send_admin_bulk_email(recipients: List[EmailRecipient], subject: str, message: str) -> Dict[str, object]:
    if not _smtp_is_configured():
        logger.warning("SMTP nÃ£o configurado. Envio em massa cancelado.")
        return {
            "sent": 0,
            "failed": len(recipients),
            "failed_emails": [email for email, _name in recipients[:10]],
            "smtp_configured": False,
        }

    sent = 0
    failed_emails: List[str] = []

    for email_to, recipient_name in recipients:
        html_content = _build_admin_email_html(recipient_name, subject, message)
        if _send_message(email_to, subject, html_content):
            sent += 1
        else:
            failed_emails.append(email_to)

    logger.info(f"Envio em massa finalizado. Enviados: {sent}, falhas: {len(failed_emails)}")
    return {
        "sent": sent,
        "failed": len(failed_emails),
        "failed_emails": failed_emails[:10],
        "smtp_configured": True,
    }


def send_reset_password_email(email_to: str, token: str):
    if not _smtp_is_configured():
        logger.warning(f"SMTP não configurado. Link de recuperação para {email_to}: {settings.FRONTEND_URL}/reset-password?token={token}")
        return False

    subject = f"Recuperação de Senha - {settings.PROJECT_NAME}"
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7fa; -webkit-font-smoothing: antialiased;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <!-- Header Section -->
            <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 0; text-align: center;">
                    <div style="background-color: rgba(255, 255, 255, 0.1); width: 64px; height: 64px; border-radius: 16px; margin: 0 auto; display: inline-block; line-height: 64px;">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                </td>
            </tr>
            <!-- Content Section -->
            <tr>
                <td style="padding: 40px 48px;">
                    <h1 style="color: #0f172a; font-size: 24px; font-weight: 800; margin: 0 0 16px 0; letter-spacing: -0.5px;">Recuperação de Acesso</h1>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">
                        Olá,<br><br>
                        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>{settings.PROJECT_NAME}</strong>.
                        Se foi você, maravilha! Basta clicar no botão abaixo para definir sua nova senha. Este link é válido e seguro por <strong>30 minutos</strong>.
                    </p>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="{link}" style="background-color: #2563eb; color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2); text-transform: uppercase; letter-spacing: 0.5px;">Redefinir Minha Senha</a>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; padding: 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <strong>Aviso:</strong> Se você não solicitou essa alteração, nenhuma ação é necessária. Sua atual senha continuará funcionando normalmente.
                    </p>
                </td>
            </tr>
            <!-- Footer Section -->
            <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © {datetime.now().year} {settings.PROJECT_NAME}. Gerando resultados com agilidade.<br>
                        Este é um e-mail automático, por favor não responda.
                    </p>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM or settings.SMTP_USER
    message["To"] = email_to
    message.attach(MIMEText(html_content, "html"))

    try:
        # SMTP_PORT 465 geralmente usa SSL/TLS direto
        # SMTP_PORT 587 geralmente usa STARTTLS
        timeout = 10  # segundos
        
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(message["From"], email_to, message.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout) as server:
                if settings.SMTP_PORT == 587:
                    server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(message["From"], email_to, message.as_string())
                
        logger.info(f"E-mail de recuperação enviado para {email_to}")
        return True
    except ConnectionRefusedError:
        logger.error(f"Conexão recusada ao tentar enviar e-mail para {email_to} via {settings.SMTP_HOST}:{settings.SMTP_PORT}")
        return False
    except smtplib.SMTPAuthenticationError:
        logger.error(f"Falha de autenticação SMTP para o usuário {settings.SMTP_USER}")
        return False
    except smtplib.SMTPConnectError:
        logger.error(f"Erro de conexão SMTP para {settings.SMTP_HOST}")
        return False
    except Exception as e:
        logger.error(f"Erro inesperado ao enviar e-mail para {email_to}: {type(e).__name__}: {e}")
        return False
