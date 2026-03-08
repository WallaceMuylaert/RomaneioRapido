import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from backend.core.config import settings
from backend.config.logger import get_dynamic_logger

logger = get_dynamic_logger("mail")

def send_reset_password_email(email_to: str, token: str):
    if not all([settings.SMTP_HOST, settings.SMTP_USER, settings.SMTP_PASS]):
        logger.warning(f"SMTP não configurado. Link de recuperação para {email_to}: {settings.FRONTEND_URL}/reset-password?token={token}")
        return False

    subject = f"Recuperação de Senha - {settings.PROJECT_NAME}"
    link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #007bff;">Recuperação de Senha</h2>
                <p>Olá,</p>
                <p>Você solicitou a recuperação de senha para sua conta no <strong>{settings.PROJECT_NAME}</strong>.</p>
                <p>Clique no botão abaixo para definir uma nova senha. Este link expira em 1 hora.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{link}" style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Redefinir Senha</a>
                </div>
                <p>Se você não solicitou isso, ignore este e-mail.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8em; color: #777;">Este é um e-mail automático, por favor não responda.</p>
            </div>
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
