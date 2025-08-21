from typing import Optional
from pydantic import BaseModel
from dataclasses import dataclass

@dataclass
class Video:
    id: Optional[int]
    basename: str
    rel_path: str
    abs_path: str
    ext: str
    duration_ms: Optional[int]
    has_srt: int

@dataclass
class Segment:
    id: Optional[int]
    video_id: int
    start_ms: int
    end_ms: int
    text: str

class SearchQuery(BaseModel):
    q: str
    file: str = ""
    offset: int = 0
    limit: int = 25
    fuzzy: int = 0

class SearchResult(BaseModel):
    video_basename: str
    rel_path: str
    ext: str
    start_ms: int
    end_ms: int
    timecode: str
    snippet_html: str

class SearchResponse(BaseModel):
    total: int
    items: list[SearchResult]

class FileInfo(BaseModel):
    basename: str
    ext: str
    rel_path: str
    has_srt: bool
    segment_count: int