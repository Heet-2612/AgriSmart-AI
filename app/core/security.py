import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from app.config import settings

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    # Convert password to bytes, hash it, and convert the hash back to a string for storage
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against the hashed password."""
    try:
        return bcrypt.checkpw(
            password=plain_password.encode('utf-8'),
            hashed_password=hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def create_access_token(subject: str) -> str:
    """Create a new JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")
    return encoded_jwt
