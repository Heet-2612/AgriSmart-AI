import smtplib
import logging
from email.message import EmailMessage
from app.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_verification_email(to_email: str, raw_token: str):
        """
        Sends an email with a verification link.
        If SMTP_HOST is not configured, logs the verification link for local testing.
        """
        verification_link = f"{settings.EMAIL_VERIFICATION_BASE_URL}?token={raw_token}"
        
        # Simple farmer-appropriate content
        subject = "Verify your AgriSmart AI Account"
        body = f"""Hello,

Welcome to AgriSmart AI!

To verify your email address and activate your account, please click the link below:

{verification_link}

This link will expire in {settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_MINUTES // 60} hours.

If you did not create an account, you can safely ignore this email.

Best regards,
The AgriSmart AI Team
"""
        
        if not settings.SMTP_HOST:
            if settings.ENVIRONMENT == "development":
                logger.info("SMTP_HOST not configured. Mocking email delivery in development mode.")
                logger.info("-------------------- MOCKED EMAIL --------------------")
                logger.info(f"To: {to_email}")
                logger.info(f"Subject: {subject}")
                logger.info(f"Body:\n{body}")
                logger.info("------------------------------------------------------")
                return
            else:
                from app.core.errors import AppError
                from fastapi import status
                logger.error("SMTP_HOST not configured in production.")
                raise AppError(
                    message="Email service is temporarily unavailable. Please try again later.",
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE
                )

        msg = EmailMessage()
        msg.set_content(body)
        msg['Subject'] = subject
        msg['From'] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg['To'] = to_email

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info(f"Verification email sent to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send verification email to {to_email}: {str(e)}")
            from app.core.errors import AppError
            from fastapi import status
            raise AppError(
                message="Email service is temporarily unavailable. Please try again later.",
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE
            )
