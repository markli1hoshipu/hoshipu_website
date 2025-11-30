"""
OAuth Authentication Router
============================

Handles Google and Microsoft OAuth authentication flows.
Migrated from prelude-chatbot to centralize authentication in user-settings service.

Endpoints:
- POST /api/auth/oauth/login - Initiate OAuth flow
- POST /api/auth/oauth/token - Exchange code for tokens
- GET /api/auth/oauth/protected - Verify authentication
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

# Import OAuth providers module (not the globals directly to avoid import-time issues)
from auth import providers as oauth_providers
from auth.providers import (
    verify_auth_token,
    LoginRequest,
    TokenRequest
)

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/auth/oauth", tags=["OAuth Authentication"])

# Frontend redirect URI - must match OAuth provider settings
FRONTEND_REDIRECT_URI = os.environ.get("FRONTEND_REDIRECT_URI", "http://localhost:8000/auth/callback")

# --- OAuth Endpoints ---

@router.post("/login", summary="Initiate OAuth Authentication Flow")
async def post_authorization_url_endpoint(request_body: LoginRequest):
    """
    Initiates the authentication flow for Google or Microsoft OAuth.
    Returns the authorization URL the frontend should redirect to.

    Request body:
        {
            "service": "google" | "microsoft"
        }

    Response:
        {
            "authorization_url": "https://accounts.google.com/o/oauth2/auth?..."
        }
    """
    service = request_body.service
    logger.info(f"Endpoint: Received POST request for authorization URL for service: {service}")

    if service not in ["google", "microsoft"]:
        raise HTTPException(status_code=400, detail=f"Unsupported authentication service: {service}")

    try:
        # Use the OAuth provider to get authorization URL with secure random state
        authorization_url = oauth_providers.auth_provider.get_authorization_url(
            redirect_uri=FRONTEND_REDIRECT_URI,
            service_name=service
            # state is automatically generated securely by the auth provider
        )
        logger.info(f"Endpoint: Successfully initiated auth flow for {service}.")
        return {"authorization_url": authorization_url}

    except Exception as e:
        logger.error(f"Endpoint Error: Failed to initiate auth flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initiate authentication flow") from e


@router.post("/token", summary="Exchange Authorization Code for Tokens")
async def exchange_code_for_tokens_endpoint(request_body: TokenRequest):
    """
    Exchanges the authorization code for tokens with Google or Microsoft.
    Also handles token refresh if refresh_token is provided.

    Request body:
        {
            "code": "authorization_code_from_provider",
            "state": "optional_state_parameter",
            "provider": "google" | "microsoft",
            "refresh_token": "optional_refresh_token"
        }

    Response:
        {
            "access_token": "jwt_token",
            "id_token": "jwt_token",
            "token_type": "bearer",
            "user_info": {
                "id": "user_id",
                "email": "user@example.com",
                "name": "User Name",
                "picture": "https://..."
            },
            "oauth_access_token": "provider_access_token",
            "oauth_refresh_token": "provider_refresh_token",
            "oauth_expires_in": 3600,
            "provider": "google"
        }
    """
    logger.info(f"Endpoint: Received token request")
    logger.info(f"Request body: code={request_body.code[:20] if request_body.code else None}..., provider={getattr(request_body, 'provider', 'not set')}, refresh_token={bool(getattr(request_body, 'refresh_token', None))}")

    try:
        # Determine the provider from the request - TokenRequest has provider as optional field
        provider = request_body.provider  # This will use the default "google" if not provided
        logger.info(f"Using provider: {provider}")

        # Handle token refresh if refresh_token is provided
        if request_body.refresh_token:
            logger.info(f"Refreshing token for provider: {provider}")
            token_data = await oauth_providers.auth_provider.refresh_token(
                refresh_token=request_body.refresh_token,
                service_name=provider
            )
        else:
            # Exchange code for tokens
            token_data = await oauth_providers.auth_provider.exchange_code_for_tokens(
                code=request_body.code,
                redirect_uri=FRONTEND_REDIRECT_URI,
                service_name=provider
            )

        # Get user info
        try:
            user_info = await oauth_providers.auth_provider.get_user_info(
                token_data["access_token"],
                service_name=provider
            )
        except Exception as e:
            logger.error(f"Failed to get user info for {provider}: {e}")
            raise

        # Create JWT token with provider info
        jwt_token = oauth_providers.jwt_manager.create_token({
            "sub": user_info["id"],
            "email": user_info["email"],
            "name": user_info.get("name", ""),
            "picture": user_info.get("picture", ""),
            "provider": provider  # Include provider in JWT
        })

        logger.info("Endpoint: Token exchange successful.")
        return {
            "access_token": jwt_token,
            "id_token": jwt_token,        # Frontend expects this field
            "token_type": "bearer",
            "user_info": user_info,
            # Include OAuth tokens for email API access
            "oauth_access_token": token_data["access_token"],
            "oauth_refresh_token": token_data.get("refresh_token"),
            "oauth_expires_in": token_data.get("expires_in"),
            "provider": provider
        }

    except Exception as e:
        logger.error(f"Endpoint Error: Token exchange failed: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Failed to exchange code for tokens") from e


@router.options("/protected", summary="Protected Endpoint Options")
async def protected_endpoint_options():
    """CORS preflight handler for protected endpoint"""
    return {"message": "OK"}


@router.get("/protected", summary="Protected Endpoint")
async def protected_endpoint(authenticated_user: dict = Depends(verify_auth_token)):
    """
    Protected endpoint that requires authentication.
    Used to verify JWT token validity.

    Requires:
        Authorization: Bearer <jwt_token>

    Returns:
        {
            "message": "You are authenticated",
            "user": {
                "email": "user@example.com",
                "name": "User Name",
                ...
            }
        }
    """
    return {
        "message": "You are authenticated",
        "user": authenticated_user
    }


@router.get("/dev-token", summary="Development Token")
async def get_dev_token():
    """
    Get test token for development - allows viewing all leads.
    Only for development/testing purposes.
    """
    return {
        "access_token": "dev-test-token-12345",
        "token_type": "bearer",
        "user": {
            "email": "test@example.com",
            "name": "Test User",
            "sub": "test-user-123"
        }
    }
