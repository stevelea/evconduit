#!/usr/bin/env python3
"""
Test script to send SMS verification to a user by email
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.lib.supabase import get_supabase_admin_client
from app.services.sms_service import get_sms_service

async def get_user_by_email(email: str):
    """Get user details by email"""
    supabase = get_supabase_admin_client()
    result = supabase.table("users").select(
        "id, email, name, phone_number, phone_verified"
    ).eq("email", email).maybe_single().execute()
    return result.data

async def test_sms_for_user(email: str, phone_override: str = None):
    """Test SMS sending for a specific user"""
    print(f"\n📧 Looking up user: {email}")

    user = await get_user_by_email(email)

    if not user:
        print(f"❌ User not found: {email}")
        return

    print(f"✅ Found user:")
    print(f"   ID: {user['id']}")
    print(f"   Name: {user.get('name', 'N/A')}")
    print(f"   Phone: {user.get('phone_number', 'Not set')}")
    print(f"   Phone Verified: {user.get('phone_verified', False)}")

    # Determine which phone number to use
    phone_to_use = phone_override or user.get('phone_number')

    if not phone_to_use:
        print("\n⚠️  No phone number found for this user.")
        print("   Please provide a phone number to test with.")
        print("   Usage: python test_sms.py <email> <phone_number>")
        print("   Example: python test_sms.py stevelea@gmail.com +14155551234")
        return

    print(f"\n📱 Sending SMS verification to: {phone_to_use}")

    sms_service = get_sms_service()

    if not sms_service.enabled:
        print("❌ SMS service is not enabled. Check Twilio credentials.")
        print(f"   TWILIO_ACCOUNT_SID: {'Set' if os.getenv('TWILIO_ACCOUNT_SID') else 'Not set'}")
        print(f"   TWILIO_AUTH_TOKEN: {'Set' if os.getenv('TWILIO_AUTH_TOKEN') else 'Not set'}")
        print(f"   TWILIO_FROM_NUMBER: {'Set' if os.getenv('TWILIO_FROM_NUMBER') else 'Not set'}")
        return

    result = await sms_service.send_verification_code(user['id'], phone_to_use)

    if result['success']:
        print(f"✅ {result['message']}")
        print(f"\n📬 A verification code has been sent to {phone_to_use}")
    else:
        print(f"❌ {result['message']}")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "stevelea@gmail.com"
    phone = sys.argv[2] if len(sys.argv) > 2 else None

    asyncio.run(test_sms_for_user(email, phone))
