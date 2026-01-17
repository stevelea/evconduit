import jwt
from jwt import PyJWKClient
from typing import Dict
from fastapi import HTTPException, Header
from typing import Optional

# Initialize JWKS client
jwks_client = PyJWKClient("https://pynxbiclcdhkstglldvh.supabase.co/auth/v1/.well-known/jwks.json")

def verify_supabase_jwt(token: str) -> Dict:
    """
    Verify ES256 JWT from Supabase using JWKS
    """
    try:
        # Get signing key from JWKS
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Verify and decode token
        decoded = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )
        
        return decoded
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Token decode failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

async def get_supabase_user(authorization: Optional[str] = Header(None)) -> Dict:
    """
    FastAPI dependency to extract and verify Supabase JWT or API key from Authorization header.
    Supports both JWT tokens (for web users) and API keys (for Home Assistant).
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    # Extract Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")
    
    token = parts[1]
    
    # Try JWT validation first
    try:
        return verify_supabase_jwt(token)
    except HTTPException:
        # JWT failed, try API key
        pass
    
    # Try API key validation
    from app.storage.api_key import get_user_by_api_key
    user = await get_user_by_api_key(token)
    
    if user:
        # Convert User object to dict format expected by endpoints
        return {
            "sub": user.id,
            "id": user.id,
            "email": user.email,
            "user_metadata": {
                "role": getattr(user, 'role', 'user')
            }
        }
    
    # Both JWT and API key failed
    raise HTTPException(status_code=401, detail="Invalid JWT or API key")
