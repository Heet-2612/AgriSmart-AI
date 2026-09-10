# AgriSmart AI Database

PostgreSQL 17.x storage layer for prediction logs, metadata, and history tracking.

## Overview

The database records inference requests, user feedback, and metadata to support model monitoring and auditability.

## Schema Migrations

Managed via Alembic and SQLAlchemy.

```bash
# Run migrations
alembic upgrade head
```

## Seeding

Initial database seed scripts are in `database/seed/`.
The seed script avoids hardcoded or fabricated disease classes and will be populated upon official organizer announcement.
