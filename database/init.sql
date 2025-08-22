-- SRT Search Database Initialization
-- Creates tables with optimized indexes for full-text search

BEGIN;

-- Create extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    basename VARCHAR(255) UNIQUE NOT NULL,
    rel_path TEXT NOT NULL,
    ext VARCHAR(10) NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    segment_count INTEGER DEFAULT 0,
    duration_ms BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    indexed_at TIMESTAMP WITH TIME ZONE
);

-- Segments table with optimized structure
CREATE TABLE IF NOT EXISTS segments (
    id SERIAL PRIMARY KEY,
    video_id INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    start_ms BIGINT NOT NULL,
    end_ms BIGINT NOT NULL,
    text TEXT NOT NULL,
    text_vector tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_basename ON videos(basename);
CREATE INDEX IF NOT EXISTS idx_videos_indexed_at ON videos(indexed_at);
CREATE INDEX IF NOT EXISTS idx_segments_video_id ON segments(video_id);
CREATE INDEX IF NOT EXISTS idx_segments_time_range ON segments(start_ms, end_ms);
CREATE INDEX IF NOT EXISTS idx_segments_text_gin ON segments USING gin(text_vector);
CREATE INDEX IF NOT EXISTS idx_segments_text_gist ON segments USING gist(text_vector);

-- Trigram index for fuzzy search
CREATE INDEX IF NOT EXISTS idx_segments_text_trgm ON segments USING gin(text gin_trgm_ops);

-- Function to automatically update text_vector
CREATE OR REPLACE FUNCTION update_text_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.text_vector := to_tsvector('english', NEW.text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update text_vector on insert/update
DROP TRIGGER IF EXISTS trigger_update_text_vector ON segments;
CREATE TRIGGER trigger_update_text_vector
    BEFORE INSERT OR UPDATE ON segments
    FOR EACH ROW
    EXECUTE FUNCTION update_text_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for videos table
DROP TRIGGER IF EXISTS trigger_update_videos_updated_at ON videos;
CREATE TRIGGER trigger_update_videos_updated_at
    BEFORE UPDATE ON videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes after initial data load for better performance
-- These will be created automatically when needed

COMMIT;

-- Additional performance configurations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 2048;
ALTER SYSTEM SET pg_stat_statements.track = 'all';

-- Optimize for text search
ALTER SYSTEM SET default_text_search_config = 'pg_catalog.english';

-- Log configuration for debugging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries taking more than 1 second
ALTER SYSTEM SET log_statement = 'ddl';  -- Log DDL statements