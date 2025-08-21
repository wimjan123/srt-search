import sqlite3
import os
from typing import List, Optional
import logging
from .models import Video, Segment

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "srt_search.db"):
        self.db_path = db_path
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        # Performance optimizations
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA temp_store=MEMORY")
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            # Create videos table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS videos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    basename TEXT UNIQUE NOT NULL,
                    rel_path TEXT NOT NULL,
                    abs_path TEXT NOT NULL,
                    ext TEXT NOT NULL,
                    duration_ms INTEGER,
                    has_srt INTEGER NOT NULL DEFAULT 0
                )
            """)

            # Create segments table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS segments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    video_id INTEGER NOT NULL,
                    start_ms INTEGER NOT NULL,
                    end_ms INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
                )
            """)

            # Create index on video_id and start_ms
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_segments_video_start 
                ON segments(video_id, start_ms)
            """)

            # Create FTS5 virtual table
            conn.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS segments_fts USING fts5(
                    text,
                    content='segments',
                    content_rowid='id',
                    tokenize='porter'
                )
            """)

            # Create triggers to keep FTS in sync
            conn.execute("""
                CREATE TRIGGER IF NOT EXISTS segments_ai AFTER INSERT ON segments BEGIN
                    INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
                END
            """)

            conn.execute("""
                CREATE TRIGGER IF NOT EXISTS segments_ad AFTER DELETE ON segments BEGIN
                    INSERT INTO segments_fts(segments_fts, rowid, text) VALUES('delete', old.id, old.text);
                END
            """)

            conn.execute("""
                CREATE TRIGGER IF NOT EXISTS segments_au AFTER UPDATE ON segments BEGIN
                    INSERT INTO segments_fts(segments_fts, rowid, text) VALUES('delete', old.id, old.text);
                    INSERT INTO segments_fts(rowid, text) VALUES (new.id, new.text);
                END
            """)

            conn.commit()

    def upsert_video(self, video: Video) -> int:
        with self.get_connection() as conn:
            cursor = conn.execute("""
                INSERT OR REPLACE INTO videos (basename, rel_path, abs_path, ext, duration_ms, has_srt)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (video.basename, video.rel_path, video.abs_path, video.ext, video.duration_ms, video.has_srt))
            return cursor.lastrowid

    def get_video_by_basename(self, basename: str) -> Optional[Video]:
        with self.get_connection() as conn:
            row = conn.execute("SELECT * FROM videos WHERE basename = ?", (basename,)).fetchone()
            if row:
                return Video(**dict(row))
            return None

    def delete_segments_for_video(self, video_id: int):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM segments WHERE video_id = ?", (video_id,))

    def insert_segments_bulk(self, segments: List[Segment]):
        with self.get_connection() as conn:
            data = [(s.video_id, s.start_ms, s.end_ms, s.text) for s in segments]
            conn.executemany("""
                INSERT INTO segments (video_id, start_ms, end_ms, text)
                VALUES (?, ?, ?, ?)
            """, data)

    def get_all_videos(self) -> List[dict]:
        with self.get_connection() as conn:
            cursor = conn.execute("""
                SELECT v.basename, v.ext, v.rel_path, v.has_srt,
                       COALESCE(COUNT(s.id), 0) as segment_count
                FROM videos v
                LEFT JOIN segments s ON v.id = s.video_id
                GROUP BY v.id, v.basename, v.ext, v.rel_path, v.has_srt
                ORDER BY v.basename
            """)
            return [dict(row) for row in cursor.fetchall()]

    def clear_all_data(self):
        with self.get_connection() as conn:
            conn.execute("DELETE FROM segments")
            conn.execute("DELETE FROM videos")
            conn.commit()

# Global database instance
db = Database()