import os

# Set fallback test environment variables if not provided
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-agrismart-sih2026")
os.environ.setdefault("ENVIRONMENT", "testing")
