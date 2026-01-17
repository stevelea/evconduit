#!/usr/bin/env python3
"""
Test script to send a test email via Brevo
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.services.email.brevo_service import BrevoEmailService
from app.config import BREVO_API_KEY, FROM_EMAIL, FROM_NAME

async def test_email(recipient_email: str):
    """Send a test email"""
    print(f"\n📧 Email Configuration:")
    print(f"   BREVO_API_KEY: {'Set (' + BREVO_API_KEY[:8] + '...)' if BREVO_API_KEY else 'Not set'}")
    print(f"   FROM_EMAIL: {FROM_EMAIL}")
    print(f"   FROM_NAME: {FROM_NAME}")

    if not BREVO_API_KEY:
        print("\n❌ BREVO_API_KEY not configured")
        return

    print(f"\n📬 Sending test email to: {recipient_email}")

    brevo = BrevoEmailService()

    result = await brevo.send_transactional_email(
        recipient_email=recipient_email,
        recipient_name="Test User",
        subject="EVConduit - Test Email",
        html_content="""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>🚗 EVConduit Test Email</h2>
            <p>This is a test email from EVConduit.</p>
            <p>If you received this, the email service is working correctly!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                Sent at: """ + __import__('datetime').datetime.now().isoformat() + """
            </p>
        </body>
        </html>
        """,
        text_content="EVConduit Test Email\n\nThis is a test email from EVConduit.\nIf you received this, the email service is working correctly!"
    )

    if result:
        print(f"✅ Email sent successfully to {recipient_email}")
    else:
        print(f"❌ Failed to send email")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "stevelea@gmail.com"
    asyncio.run(test_email(email))
