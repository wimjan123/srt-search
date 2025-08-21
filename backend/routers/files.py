from fastapi import APIRouter
from typing import List
from ..models import FileInfo
from ..db import db

router = APIRouter()

@router.get("/api/files", response_model=List[FileInfo])
async def get_files():
    """Get list of all video files with metadata"""
    videos = db.get_all_videos()
    
    return [
        FileInfo(
            basename=video['basename'],
            ext=video['ext'],
            rel_path=video['rel_path'],
            has_srt=bool(video['has_srt']),
            segment_count=video['segment_count']
        )
        for video in videos
    ]