from fastapi import APIRouter, HTTPException
from typing import List
from ..models import FileInfo
from ..db import db
from ..srt_parser import format_timecode

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

@router.get("/api/transcript/{video_basename}")
async def get_transcript(video_basename: str):
    """Get full transcript for a video"""
    video = db.get_video_by_basename(video_basename)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if not video.has_srt:
        raise HTTPException(status_code=404, detail="No transcript available for this video")
    
    with db.get_connection() as conn:
        segments = conn.execute("""
            SELECT start_ms, end_ms, text
            FROM segments
            WHERE video_id = ?
            ORDER BY start_ms
        """, (video.id,)).fetchall()
        
        transcript_segments = []
        for segment in segments:
            transcript_segments.append({
                "start_ms": segment["start_ms"],
                "end_ms": segment["end_ms"],
                "timecode": format_timecode(segment["start_ms"]),
                "text": segment["text"]
            })
        
        return {
            "video_basename": video.basename,
            "rel_path": video.rel_path,
            "ext": video.ext,
            "segments": transcript_segments
        }