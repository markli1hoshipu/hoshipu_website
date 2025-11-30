"""
Simple authentication module for Prelude Platform
This provides basic Google OAuth authentication functionality
"""

import os
import time
import jwt
import httpx
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Any
from urllib.parse import urlencode
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

logger = logging.getLogger(__name__)
security = HTTPBearer()

class SimpleAuthProvider:
    def __init__(self, client_id: str, client_secret: str, microsoft_client_id: str = None, microsoft_client_secret: str = None, microsoft_tenant_id: str = None):
        self.client_id = client_id
        self.client_secret = client_secret
        self.microsoft_client_id = microsoft_client_id or client_id
        self.microsoft_client_secret = microsoft_client_secret or client_secret
        self.microsoft_tenant_id = microsoft_tenant_id or "common"

        # Google OAuth URLs
        self.google_token_url = "https://oauth2.googleapis.com/token"
        self.google_userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.google_auth_url = "https://accounts.google.com/o/oauth2/auth"

        # Microsoft OAuth URLs
        self.microsoft_token_url = f"https://login.microsoftonline.com/{self.microsoft_tenant_id}/oauth2/v2.0/token"
        self.microsoft_userinfo_url = "https://graph.microsoft.com/v1.0/me"
        self.microsoft_auth_url = f"https://login.microsoftonline.com/{self.microsoft_tenant_id}/oauth2/v2.0/authorize"
    
    def generate_secure_state(self) -> str:
        """Generate a cryptographically secure random state parameter for OAuth"""
        return secrets.token_urlsafe(32)
    
    def get_authorization_url(self, redirect_uri: str, service_name: str = "google", state: str = None) -> str:
        """Get OAuth authorization URL for Google or Microsoft"""
        if state is None:
            # Generate state in the format expected by frontend: serviceName_randomString
            random_part = self.generate_secure_state()
            state = f"{service_name}_{random_part}"

        if service_name == "microsoft":
            params = {
                "client_id": self.microsoft_client_id,
                "redirect_uri": redirect_uri,
                "scope": "openid email profile offline_access User.Read Mail.Send Mail.ReadWrite Calendars.ReadWrite",
                "response_type": "code",
                "response_mode": "query",
                "state": state,
                "prompt": "consent"
            }
            return f"{self.microsoft_auth_url}?{urlencode(params)}"
        else:
            params = {
                "client_id": self.client_id,
                "redirect_uri": redirect_uri,
                "scope": "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar",
                "response_type": "code",
                "access_type": "offline",
                "prompt": "consent",
                "state": state
            }

            # Use proper URL encoding
            return f"{self.google_auth_url}?{urlencode(params)}"
    
    async def exchange_code_for_tokens(self, code: str, redirect_uri: str, service_name: str = "google") -> Dict[str, Any]:
        """Exchange authorization code for tokens"""
        async with httpx.AsyncClient() as client:
            if service_name == "microsoft":
                response = await client.post(
                    self.microsoft_token_url,
                    data={
                        "client_id": self.microsoft_client_id,
                        "client_secret": self.microsoft_client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                        "scope": "openid email profile offline_access User.Read Mail.Send Mail.ReadWrite Calendars.ReadWrite"
                    }
                )
            else:
                response = await client.post(
                    self.google_token_url,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    }
                )

            if response.status_code != 200:
                error_detail = f"Failed to exchange code for tokens: {response.text}"
                logger.error(f"Token exchange failed for {service_name}: {error_detail}")
                raise HTTPException(status_code=400, detail=error_detail)

            tokens = response.json()
            tokens['provider'] = service_name
            return tokens
    
    async def get_user_info(self, access_token: str, service_name: str = "google") -> Dict[str, Any]:
        """Get user information from Google or Microsoft"""
        async with httpx.AsyncClient() as client:
            if service_name == "microsoft":
                response = await client.get(
                    self.microsoft_userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                if response.status_code != 200:
                    error_detail = f"Failed to get Microsoft user info: {response.text}"
                    raise HTTPException(status_code=400, detail=error_detail)

                # Transform Microsoft user info to match Google format
                ms_user = response.json()
                return {
                    "id": ms_user.get("id"),
                    "email": ms_user.get("mail") or ms_user.get("userPrincipalName"),
                    "name": ms_user.get("displayName"),
                    "given_name": ms_user.get("givenName"),
                    "family_name": ms_user.get("surname"),
                    "picture": None,
                    "provider": "microsoft"
                }
            else:
                response = await client.get(
                    self.google_userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                if response.status_code != 200:
                    error_detail = f"Failed to get user info: {response.text}"
                    raise HTTPException(status_code=400, detail=error_detail)

                user_info = response.json()
                user_info['provider'] = 'google'
                return user_info

    async def refresh_token(self, refresh_token: str, service_name: str = "google") -> Dict[str, Any]:
        """
        Refresh access token using refresh token.

        Args:
            refresh_token: The refresh token
            service_name: 'google' or 'microsoft' (default: 'google')

        Returns:
            Dict with new access_token and optionally new refresh_token
        """
        if service_name == "microsoft":
            # Microsoft token refresh
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.microsoft_token_url,
                    data={
                        "client_id": self.microsoft_client_id,
                        "client_secret": self.microsoft_client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token",
                        "scope": "openid email profile offline_access Calendars.ReadWrite"
                    }
                )

                if response.status_code != 200:
                    error_detail = f"Failed to refresh Microsoft token: {response.text}"
                    logger.error(f"Microsoft token refresh failed: {error_detail}")
                    raise HTTPException(status_code=400, detail=error_detail)

                tokens = response.json()
                tokens['provider'] = 'microsoft'
                return tokens
        else:
            # Google token refresh
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.google_token_url,
                    data={
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "refresh_token": refresh_token,
                        "grant_type": "refresh_token"
                    }
                )

                if response.status_code != 200:
                    error_detail = f"Failed to refresh Google token: {response.text}"
                    logger.error(f"Google token refresh failed: {error_detail}")
                    raise HTTPException(status_code=400, detail=error_detail)

                tokens = response.json()
                tokens['provider'] = 'google'
                return tokens

class JWTManager:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_token(self, user_data: Dict[str, Any], expires_delta: timedelta = None) -> str:
        """Create JWT token"""
        if expires_delta is None:
            expires_delta = timedelta(hours=24)
        
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode = user_data.copy()
        to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

# Global instances
auth_provider = None
jwt_manager = None

def init_auth(client_id: str, client_secret: str, jwt_secret: str,
               microsoft_client_id: str = None, microsoft_client_secret: str = None,
               microsoft_tenant_id: str = None):
    """Initialize authentication providers"""
    global auth_provider, jwt_manager
    if not client_id or not client_secret:
        raise ValueError("Google OAuth credentials are required")
    if not jwt_secret:
        raise ValueError("JWT secret is required")

    auth_provider = SimpleAuthProvider(
        client_id,
        client_secret,
        microsoft_client_id=microsoft_client_id,
        microsoft_client_secret=microsoft_client_secret,
        microsoft_tenant_id=microsoft_tenant_id
    )
    jwt_manager = JWTManager(jwt_secret)

async def verify_auth_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """FastAPI dependency to verify authentication token"""
    if not jwt_manager:
        raise HTTPException(status_code=500, detail="Authentication not initialized")
    
    try:
        if not credentials:
            raise HTTPException(status_code=401, detail="No credentials provided")
        
        if not credentials.credentials:
            raise HTTPException(status_code=401, detail="No token provided")
        
        user_claims = jwt_manager.verify_token(credentials.credentials)
        
        # Track user activity - skip for now to avoid import issues
        # TODO: Fix user tracking import
        
        return user_claims
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Pydantic models for FastAPI compatibility
class LoginRequest(BaseModel):
    service: str

class TokenRequest(BaseModel):
    code: str
    state: Optional[str] = None
    refresh_token: Optional[str] = None
    provider: Optional[str] = "google" 