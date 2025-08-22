"""
PostgreSQL database implementation for SRT Search
Provides enhanced full-text search capabilities using PostgreSQL
"""

import os
import logging
from typing import List, Optional, Dict, Any
import asyncpg
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text, and_
from .models import Video, Segment

logger = logging.getLogger(__name__)

class PostgreSQLDatabase:
    def __init__(self, database_url: str = None):
        if not database_url:
            database_url = os.getenv("DATABASE_URL", "postgresql://srt_user:srt_secure_pass_2024@localhost:5432/srt_search")
        
        self.database_url = database_url
        self.engine = create_async_engine(
            database_url,
            echo=False,  # Set to True for SQL debugging
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self.async_session = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
    
    async def get_connection(self):
        """Get an async database session"""
        async with self.async_session() as session:
            yield session
    
    async def init_db(self):
        """Initialize database - tables should be created by init.sql"""
        try:
            async with self.engine.begin() as conn:
                # Test connection and verify tables exist
                result = await conn.execute(text(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                ))
                tables = [row[0] for row in result.fetchall()]
                
                if 'videos' not in tables or 'segments' not in tables:
                    logger.error("Database tables not found. Please run the init.sql script.")
                    raise Exception("Database not properly initialized")
                
                logger.info(f"Database initialized successfully. Tables: {', '.join(tables)}")
                
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def add_video(self, video_data: Dict[str, Any]) -> int:
        """Add a video record and return its ID"""
        async with self.async_session() as session:
            try:
                result = await session.execute(
                    text("""
                        INSERT INTO videos (basename, rel_path, ext, size_bytes, segment_count, duration_ms, indexed_at)
                        VALUES (:basename, :rel_path, :ext, :size_bytes, :segment_count, :duration_ms, CURRENT_TIMESTAMP)
                        ON CONFLICT (basename) 
                        DO UPDATE SET 
                            rel_path = EXCLUDED.rel_path,
                            ext = EXCLUDED.ext,
                            size_bytes = EXCLUDED.size_bytes,
                            segment_count = EXCLUDED.segment_count,
                            duration_ms = EXCLUDED.duration_ms,
                            indexed_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        RETURNING id
                    """),
                    video_data
                )
                video_id = result.scalar()
                await session.commit()
                return video_id
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding video: {e}")
                raise
    
    async def add_segments(self, video_id: int, segments: List[Dict[str, Any]]) -> int:
        """Add multiple segments for a video"""
        async with self.async_session() as session:
            try:
                # First, delete existing segments for this video
                await session.execute(
                    text("DELETE FROM segments WHERE video_id = :video_id"),
                    {"video_id": video_id}
                )
                
                # Insert new segments
                if segments:
                    await session.execute(
                        text("""
                            INSERT INTO segments (video_id, segment_index, start_ms, end_ms, text)
                            VALUES (:video_id, :segment_index, :start_ms, :end_ms, :text)
                        """),
                        [{"video_id": video_id, **segment} for segment in segments]
                    )
                
                await session.commit()
                return len(segments)
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error adding segments: {e}")
                raise
    
    async def search_segments(
        self, 
        query: str, 
        file_filter: Optional[str] = None,
        offset: int = 0, 
        limit: int = 50,
        fuzzy: bool = False
    ) -> Dict[str, Any]:
        """Search segments using PostgreSQL full-text search"""
        async with self.async_session() as session:
            try:
                # Base query parameters
                params = {
                    "query": query,
                    "offset": offset,
                    "limit": limit
                }
                
                # Build WHERE clause
                where_conditions = []
                if file_filter:
                    where_conditions.append("v.basename = :file_filter")
                    params["file_filter"] = file_filter
                
                where_clause = " AND ".join(where_conditions)
                if where_conditions:
                    where_clause = "AND " + where_clause
                else:
                    where_clause = ""
                
                if fuzzy:
                    # Use trigram similarity for fuzzy search
                    search_condition = "s.text % :query"
                    order_by = "similarity(s.text, :query) DESC, s.start_ms"
                else:
                    # Use full-text search
                    search_condition = "s.text_vector @@ plainto_tsquery('english', :query)"
                    order_by = "ts_rank(s.text_vector, plainto_tsquery('english', :query)) DESC, s.start_ms"
                
                # Main search query
                search_query = text(f"""
                    SELECT 
                        s.id,
                        v.basename as video_basename,
                        v.rel_path,
                        v.ext,
                        s.start_ms,
                        s.end_ms,
                        EXTRACT(EPOCH FROM (INTERVAL '1 millisecond' * s.start_ms))::int AS start_seconds,
                        TO_CHAR((INTERVAL '1 millisecond' * s.start_ms), 'HH24:MI:SS') as timecode,
                        s.text,
                        ts_headline('english', s.text, plainto_tsquery('english', :query), 
                                   'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15, ShortWord=3, HighlightAll=false, MaxFragments=1, FragmentDelimiter=" ... "') as snippet_html
                    FROM segments s
                    JOIN videos v ON s.video_id = v.id
                    WHERE {search_condition} {where_clause}
                    ORDER BY {order_by}
                    LIMIT :limit OFFSET :offset
                """)
                
                # Count query
                count_query = text(f"""
                    SELECT COUNT(*)
                    FROM segments s
                    JOIN videos v ON s.video_id = v.id  
                    WHERE {search_condition} {where_clause}
                """)
                
                # Execute queries
                results = await session.execute(search_query, params)
                count_result = await session.execute(count_query, params)
                
                segments = results.fetchall()
                total = count_result.scalar()
                
                # Format results
                items = []
                for row in segments:
                    items.append({
                        "id": row.id,
                        "video_basename": row.video_basename,
                        "rel_path": row.rel_path,
                        "ext": row.ext,
                        "start_ms": row.start_ms,
                        "end_ms": row.end_ms,
                        "timecode": row.timecode,
                        "text": row.text,
                        "snippet_html": row.snippet_html
                    })
                
                return {
                    "items": items,
                    "total": total,
                    "offset": offset,
                    "limit": limit
                }
                
            except Exception as e:
                logger.error(f"Search error: {e}")
                # Fallback to simple text search if full-text search fails
                if not fuzzy:
                    logger.info("Falling back to fuzzy search")
                    return await self.search_segments(query, file_filter, offset, limit, fuzzy=True)
                raise
    
    async def get_files(self) -> List[Dict[str, Any]]:
        """Get all indexed files"""
        async with self.async_session() as session:
            try:
                result = await session.execute(text("""
                    SELECT basename, rel_path, ext, size_bytes, segment_count, 
                           (segment_count > 0) as has_srt,
                           indexed_at
                    FROM videos 
                    ORDER BY basename
                """))
                
                files = []
                for row in result.fetchall():
                    files.append({
                        "basename": row.basename,
                        "rel_path": row.rel_path,
                        "ext": row.ext,
                        "size_bytes": row.size_bytes,
                        "segment_count": row.segment_count,
                        "has_srt": row.has_srt,
                        "indexed_at": row.indexed_at.isoformat() if row.indexed_at else None
                    })
                
                return files
                
            except Exception as e:
                logger.error(f"Error getting files: {e}")
                raise
    
    async def get_transcript(self, video_basename: str) -> Optional[Dict[str, Any]]:
        """Get full transcript for a video"""
        async with self.async_session() as session:
            try:
                # Get video info
                video_result = await session.execute(
                    text("SELECT id, basename, rel_path, ext FROM videos WHERE basename = :basename"),
                    {"basename": video_basename}
                )
                video_row = video_result.fetchone()
                
                if not video_row:
                    return None
                
                # Get segments
                segments_result = await session.execute(
                    text("""
                        SELECT segment_index, start_ms, end_ms, text,
                               TO_CHAR((INTERVAL '1 millisecond' * start_ms), 'HH24:MI:SS') as timecode
                        FROM segments 
                        WHERE video_id = :video_id 
                        ORDER BY segment_index
                    """),
                    {"video_id": video_row.id}
                )
                
                segments = []
                for row in segments_result.fetchall():
                    segments.append({
                        "index": row.segment_index,
                        "start_ms": row.start_ms,
                        "end_ms": row.end_ms,
                        "timecode": row.timecode,
                        "text": row.text
                    })
                
                return {
                    "video_basename": video_row.basename,
                    "rel_path": video_row.rel_path,
                    "ext": video_row.ext,
                    "segments": segments
                }
                
            except Exception as e:
                logger.error(f"Error getting transcript: {e}")
                raise
    
    async def clear_all_data(self):
        """Clear all data from the database"""
        async with self.async_session() as session:
            try:
                await session.execute(text("DELETE FROM segments"))
                await session.execute(text("DELETE FROM videos"))
                await session.commit()
                logger.info("All data cleared from database")
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Error clearing data: {e}")
                raise
    
    async def close(self):
        """Close database connections"""
        if self.engine:
            await self.engine.dispose()

# Global database instance
_db_instance = None

async def get_database():
    """Get the global database instance"""
    global _db_instance
    if _db_instance is None:
        database_url = os.getenv("DATABASE_URL")
        if database_url and database_url.startswith("postgresql"):
            _db_instance = PostgreSQLDatabase(database_url)
        else:
            # Fallback to SQLite for development
            from .db import Database
            _db_instance = Database()
        
        await _db_instance.init_db()
    
    return _db_instance