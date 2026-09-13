import secrets
import hashlib

class VerificationService:
    @staticmethod
    def generate_token() -> str:
        """Generates a cryptographically secure URL-safe token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Hashes the raw token for secure database storage using SHA-256."""
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
