"""
Rate limiting configuration for the API
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter instance
limiter = Limiter(key_func=get_remote_address)
