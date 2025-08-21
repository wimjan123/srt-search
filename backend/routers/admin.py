from fastapi import APIRouter, BackgroundTasks, HTTPException
import os
import logging
from ..indexing import reindex_media

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/reindex")
async def reindex(background_tasks: BackgroundTasks):
    """Trigger full reindex of media files"""
    media_dir = os.getenv("MEDIA_DIR")
    if not media_dir:
        raise HTTPException(status_code=500, detail="MEDIA_DIR environment variable not set")
    
    if not os.path.exists(media_dir):
        raise HTTPException(status_code=400, detail=f"Media directory does not exist: {media_dir}")
    
    # Run indexing in background
    background_tasks.add_task(reindex_media, media_dir)
    
    return {"status": "Reindexing started", "media_dir": media_dir}

@router.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}