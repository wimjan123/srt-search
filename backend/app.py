import os
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .routers import files, search, admin
from .indexing import reindex_media

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database and optionally reindex
    media_dir = os.getenv("MEDIA_DIR")
    if media_dir and os.path.exists(media_dir):
        logger.info(f"Media directory: {media_dir}")
        # Uncomment to auto-reindex on startup
        # logger.info("Starting initial indexing...")
        # reindex_media(media_dir)
        # logger.info("Initial indexing complete")
    else:
        logger.warning("MEDIA_DIR not set or directory doesn't exist")
    
    yield
    # Shutdown: cleanup if needed

app = FastAPI(
    title="SRT Search API",
    description="Search through SRT subtitle files",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for development
if os.getenv("ENV", "production") == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include routers
app.include_router(files.router)
app.include_router(search.router)
app.include_router(admin.router)

# Media file serving
@app.get("/media/{file_path:path}")
async def serve_media(file_path: str, request: Request):
    """Serve media files from MEDIA_DIR"""
    media_dir = os.getenv("MEDIA_DIR")
    if not media_dir:
        raise HTTPException(status_code=500, detail="MEDIA_DIR not configured")
    
    # Sanitize path to prevent directory traversal
    media_dir_path = Path(media_dir).resolve()
    requested_file = (media_dir_path / file_path).resolve()
    
    # Ensure the requested file is within the media directory
    try:
        requested_file.relative_to(media_dir_path)
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not requested_file.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not requested_file.is_file():
        raise HTTPException(status_code=404, detail="Not a file")
    
    return FileResponse(
        requested_file,
        media_type="video/mp4" if requested_file.suffix.lower() == ".mp4" else "video/x-msvideo"
    )

# Serve static frontend files (for production)
frontend_dist = Path(__file__).parent / "static"
if frontend_dist.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist)), name="static")
    
    @app.get("/")
    async def serve_frontend():
        index_file = frontend_dist / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"message": "Frontend not built. Run in development mode or build frontend first."}
else:
    @app.get("/")
    async def root():
        return {"message": "SRT Search API - Frontend not available"}

if __name__ == "__main__":
    import uvicorn
    
    # Check for local binding preference
    host = "127.0.0.1" if os.getenv("BIND_LOCAL_ONLY") == "1" else "0.0.0.0"
    port = int(os.getenv("PORT", "3456"))
    
    uvicorn.run(
        "backend.app:app",
        host=host,
        port=port,
        reload=True if os.getenv("ENV") == "development" else False
    )