"""Authentication module for User Settings Service."""

# Export OAuth authentication functions (new implementation)
from .oauth_providers import (
    init_auth,
    auth_provider,
    jwt_manager,
    verify_auth_token,
    SimpleAuthProvider,
    JWTManager,
    LoginRequest,
    TokenRequest
)

# Note: providers.py contains old implementation, kept for compatibility
# but NOT imported to avoid conflicts

__all__ = [
    'init_auth',
    'auth_provider',
    'jwt_manager',
    'verify_auth_token',
    'SimpleAuthProvider',
    'JWTManager',
    'LoginRequest',
    'TokenRequest'
]
