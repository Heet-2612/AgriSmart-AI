-- AgriSmart AI: Database Seed Script
-- Note: Do NOT hard-code unofficial or fabricated disease classes.
-- Official classes and metadata will be seeded here once released by the SIH 2026 organizers.

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    predicted_class VARCHAR(120),
    confidence NUMERIC(5, 4),
    model_version VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Placeholder for official disease registry:
-- CREATE TABLE IF NOT EXISTS diseases (
--     id SERIAL PRIMARY KEY,
--     class_id INT UNIQUE NOT NULL,
--     common_name VARCHAR(150) NOT NULL,
--     scientific_name VARCHAR(150),
--     treatment_summary TEXT
-- );
