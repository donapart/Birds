-- ================================================================
-- BirdSound PostgreSQL Initialization Script
-- ================================================================
-- This script runs when the PostgreSQL container starts for the first time

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE birdsound TO birdsound;

-- Create indexes for performance (tables created by Alembic)
-- These are placeholder comments, actual indexes in migrations

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'BirdSound database initialized successfully';
END $$;
