-- =============================================
-- SHAPASH WEDDING PLANNING - SUPABASE SETUP
-- =============================================

-- 1. Enable the pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Main unified table for all wedding content
CREATE TABLE IF NOT EXISTS public.documents_enhanced (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Common fields used by both content types
    title TEXT NOT NULL,
    author TEXT,
    content TEXT NOT NULL,
    source_type TEXT NOT NULL, -- 'csv_vendors' or 'pdf_podcasts'
    category TEXT,             -- Common field: vendor category or podcast category
    
    -- Standard RAG fields
    doc_type TEXT DEFAULT 'Wedding Content',
    genre TEXT DEFAULT 'Wedding Planning',
    topic TEXT,
    difficulty TEXT DEFAULT 'General',
    tags TEXT,
    summary TEXT,
    
    -- Technical fields
    embedding vector(1536),    -- OpenAI embeddings
    chunk_id INTEGER DEFAULT 1,
    total_chunks INTEGER DEFAULT 1,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Flexible metadata for type-specific fields
    metadata JSONB DEFAULT '{}' -- This will store different schemas per content type
);

-- CSV Vendor Metadata Example:
-- {
--   "email": "contact@venue.com",
--   "county": "Yorkshire", 
--   "website": "www.venue.com",
--   "supplier": "Wedding Venues Ltd",
--   "address": "123 High Street",
--   "phone": "+44 1234 567890",
--   "price_range": "£££",
--   "capacity": 150
-- }

-- PDF Podcast Metadata Example:
-- {
--   "tone": "informative",
--   "audience": "engaged couples",
--   "episode_number": 42,
--   "duration": "45 minutes",
--   "podcast_series": "Wedding Planning Weekly",
--   "key_topics": ["venue selection", "budgeting"]
-- }

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS documents_enhanced_title_idx ON public.documents_enhanced (title);
CREATE INDEX IF NOT EXISTS documents_enhanced_source_type_idx ON public.documents_enhanced (source_type);
CREATE INDEX IF NOT EXISTS documents_enhanced_category_idx ON public.documents_enhanced (category);
CREATE INDEX IF NOT EXISTS documents_enhanced_created_at_idx ON public.documents_enhanced (created_at);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS documents_enhanced_embedding_idx ON public.documents_enhanced 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- JSONB indexes for common metadata queries
CREATE INDEX IF NOT EXISTS documents_enhanced_metadata_county_idx ON public.documents_enhanced 
USING GIN ((metadata->'county'));
CREATE INDEX IF NOT EXISTS documents_enhanced_metadata_email_idx ON public.documents_enhanced 
USING GIN ((metadata->'email'));

-- 4. Feedback system table
CREATE TABLE IF NOT EXISTS public.feedback (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    feedback TEXT NOT NULL CHECK (feedback IN ('helpful', 'not_helpful', 'partial', 'detailed')),
    user_id TEXT DEFAULT 'anonymous',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_created_at_idx ON public.feedback (created_at);
CREATE INDEX IF NOT EXISTS feedback_user_id_idx ON public.feedback (user_id);

-- 5. Document tracker for statistics
CREATE TABLE IF NOT EXISTS public.document_tracker (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT DEFAULT 'Unknown',
    summary TEXT,
    type TEXT DEFAULT 'Wedding Content',
    genre TEXT DEFAULT 'Wedding Planning',
    topic TEXT,
    difficulty TEXT DEFAULT 'General',
    source_type TEXT NOT NULL,
    tags TEXT,
    chunks INTEGER DEFAULT 0,
    chunk_size INTEGER,
    chunk_overlap INTEGER,
    file_hash TEXT,
    file_name TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_tracker_title_idx ON public.document_tracker (title);
CREATE INDEX IF NOT EXISTS document_tracker_source_type_idx ON public.document_tracker (source_type);

-- 6. Enhanced vector search function for wedding content
CREATE OR REPLACE FUNCTION match_wedding_content (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.1,
  match_count int DEFAULT 10,
  content_type text DEFAULT NULL,
  location_filter text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  title text,
  author text,
  content text,
  source_type text,
  category text,
  metadata jsonb,
  similarity float,
  match_type text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.author,
    d.content,
    d.source_type,
    d.category,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity,
    CASE 
      WHEN d.source_type = 'csv_vendors' THEN 'vendor'
      WHEN d.source_type = 'pdf_podcasts' THEN 'advice'
      ELSE 'general'
    END as match_type
  FROM documents_enhanced d
  WHERE 
    (1 - (d.embedding <=> query_embedding)) > match_threshold
    AND (content_type IS NULL OR d.source_type = content_type)
    AND (location_filter IS NULL OR d.metadata->>'county' ILIKE '%' || location_filter || '%')
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Vendor search function
CREATE OR REPLACE FUNCTION search_vendors_by_location (
  location_query text,
  vendor_category text DEFAULT NULL,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id text,
  title text,
  email text,
  website text,
  county text,
  category text,
  supplier text,
  content text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.title,
    d.metadata->>'email' as email,
    d.metadata->>'website' as website,
    d.metadata->>'county' as county,
    d.category,
    d.metadata->>'supplier' as supplier,
    d.content
  FROM documents_enhanced d
  WHERE 
    d.source_type = 'csv_vendors'
    AND (location_query IS NULL OR d.metadata->>'county' ILIKE '%' || location_query || '%')
    AND (vendor_category IS NULL OR d.category ILIKE '%' || vendor_category || '%')
  ORDER BY d.title
  LIMIT limit_count;
END;
$$;

-- 8. Row Level Security (optional)
ALTER TABLE public.documents_enhanced ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tracker ENABLE ROW LEVEL SECURITY;

-- Allow public access policies
CREATE POLICY "Allow public read access" ON public.documents_enhanced FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.documents_enhanced FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.documents_enhanced FOR UPDATE USING (true);

CREATE POLICY "Allow public read access" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.feedback FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access" ON public.document_tracker FOR SELECT USING (true);
CREATE POLICY "Allow public insert access" ON public.document_tracker FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON public.document_tracker FOR UPDATE USING (true);

-- =============================================
-- SETUP COMPLETE! 
-- Your Shapash wedding planning database is ready.
-- ============================================= 