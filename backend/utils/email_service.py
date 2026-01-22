"""
Email Service Module
Handles sending verification emails using SMTP
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import random
import string
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)


class EmailService:
    """Email service for sending verification codes"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", 587))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "HealthVault")
    
    @staticmethod
    def generate_verification_code(length: int = 6) -> str:
        """Generate a random numeric verification code"""
        return ''.join(random.choices(string.digits, k=length))
    
    def send_verification_email(self, to_email: str, first_name: str, verification_code: str, pin: str) -> bool:
        """
        Send verification email with the code and PIN reminder
        
        Parameters:
        - to_email: Recipient email address
        - first_name: User's first name for personalization
        - verification_code: 6-digit verification code
        - pin: User's chosen PIN (masked for security)
        
        Returns:
        - True if email sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"HealthVault - Email Verification Code: {verification_code}"
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            # Mask the PIN (show first and last digit)
            masked_pin = f"{pin[0]}****{pin[-1]}" if len(pin) >= 2 else "******"
            
            # Plain text version
            text_content = f"""
Hello {first_name},

Welcome to HealthVault! To complete your registration, please verify your email address.

Your Verification Code: {verification_code}

This code will expire in 10 minutes.

Your Security PIN: {masked_pin}
(Keep this PIN safe - you'll use it to log in)

If you didn't create a HealthVault account, please ignore this email.

Best regards,
The HealthVault Team
            """
            
            # HTML version
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🏥 HealthVault</h1>
                <p style="color: #e0f7fa; margin: 10px 0 0 0; font-size: 14px;">Secure Health Records Management</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hello {first_name}! 👋</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Welcome to HealthVault! To complete your registration and secure your health records, 
                    please verify your email address using the code below.
                </p>
                
                <div style="background: linear-gradient(135deg, #f0fdfa 0%, #e0f7fa 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px 0; border: 1px solid #99f6e4;">
                    <p style="color: #0d9488; font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Verification Code</p>
                    <div style="font-size: 36px; font-weight: bold; color: #0f766e; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                        {verification_code}
                    </div>
                    <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
                        ⏱️ This code expires in 10 minutes
                    </p>
                </div>
                
                <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin: 0 0 30px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">🔐 Your Security PIN</p>
                    <p style="color: #78350f; font-size: 20px; font-weight: bold; margin: 0; font-family: 'Courier New', monospace;">
                        {masked_pin}
                    </p>
                    <p style="color: #92400e; font-size: 12px; margin: 10px 0 0 0;">
                        Keep this PIN safe - you'll use it to log in to your account
                    </p>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0;">
                    If you didn't create a HealthVault account, you can safely ignore this email.
                </p>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © 2026 HealthVault. All rights reserved.<br>
                    This is an automated message, please do not reply.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            # Attach both versions
            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)
            
            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Verification email sent successfully to {to_email}")
            return True
            
        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication failed: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending email: {e}")
            return False
        except Exception as e:
            logger.error(f"Error sending verification email: {e}")
            return False
    
    def send_welcome_email(self, to_email: str, first_name: str) -> bool:
        """
        Send a welcome email after successful registration
        
        Parameters:
        - to_email: Recipient email address
        - first_name: User's first name
        
        Returns:
        - True if email sent successfully, False otherwise
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Welcome to HealthVault! 🎉"
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            
            html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
            <td style="padding: 40px 30px; text-align: center; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome to HealthVault!</h1>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0;">Congratulations, {first_name}!</h2>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    Your email has been verified and your HealthVault account is now active. 
                    You can now securely manage your health records, connect with doctors, and more.
                </p>
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                    <strong>What's next?</strong>
                </p>
                <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
                    <li>Log in to your dashboard</li>
                    <li>Upload your medical reports</li>
                    <li>Set up fingerprint authentication for quick access</li>
                    <li>Connect with your healthcare providers</li>
                </ul>
            </td>
        </tr>
        <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    © 2026 HealthVault. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            msg.attach(MIMEText(html_content, "html"))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Welcome email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending welcome email: {e}")
            return False


# Singleton instance for easy import
email_service = EmailService()
