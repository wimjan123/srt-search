import os
import logging
from pathlib import Path
from typing import Dict, List, Set
from .models import Video, Segment
from .srt_parser import parse_srt_file
from .db import db

logger = logging.getLogger(__name__)

class VideoIndexer:
    def __init__(self, media_dir: str):
        self.media_dir = Path(media_dir)
        if not self.media_dir.exists():
            raise ValueError(f"Media directory does not exist: {media_dir}")

    def find_media_files(self) -> Dict[str, Dict[str, str]]:
        """Find all video and SRT files, grouped by basename"""
        files_by_basename = {}
        
        # Supported video extensions
        video_extensions = {'.mp4', '.avi'}
        
        # Recursively scan for files
        for file_path in self.media_dir.rglob('*'):
            if not file_path.is_file():
                continue
                
            ext = file_path.suffix.lower()
            basename = file_path.stem
            rel_path = file_path.relative_to(self.media_dir)
            
            if basename not in files_by_basename:
                files_by_basename[basename] = {}
            
            if ext in video_extensions:
                files_by_basename[basename]['video'] = {
                    'path': str(file_path),
                    'rel_path': str(rel_path),
                    'ext': ext
                }
            elif ext == '.srt':
                files_by_basename[basename]['srt'] = str(file_path)
        
        # Only keep entries that have video files
        return {k: v for k, v in files_by_basename.items() if 'video' in v}

    def match_srt_to_video(self, basename: str, files: Dict[str, str], all_srts: Dict[str, List[str]]) -> str:
        """Find the best matching SRT file for a video"""
        if 'srt' in files:
            return files['srt']
            
        # Look for SRT files with the same basename in any directory
        video_dir = Path(files['video']['path']).parent
        
        # Check if there's an SRT in the same directory
        potential_srt = video_dir / f"{basename}.srt"
        if potential_srt.exists():
            return str(potential_srt)
            
        # If multiple SRT files exist with the same basename, prefer same folder
        if basename in all_srts:
            for srt_path in all_srts[basename]:
                if Path(srt_path).parent == video_dir:
                    return srt_path
            # If no same-folder match, return the first one
            return all_srts[basename][0]
            
        return None

    def find_all_srts(self) -> Dict[str, List[str]]:
        """Find all SRT files grouped by basename"""
        srts_by_basename = {}
        
        for srt_path in self.media_dir.rglob('*.srt'):
            basename = srt_path.stem
            if basename not in srts_by_basename:
                srts_by_basename[basename] = []
            srts_by_basename[basename].append(str(srt_path))
            
        return srts_by_basename

    def index_all_videos(self):
        """Index all videos and their subtitles"""
        logger.info(f"Starting indexing of {self.media_dir}")
        
        # Clear existing data
        db.clear_all_data()
        
        files_by_basename = self.find_media_files()
        all_srts = self.find_all_srts()
        
        total_videos = len(files_by_basename)
        indexed_count = 0
        
        for basename, files in files_by_basename.items():
            try:
                video_info = files['video']
                srt_path = self.match_srt_to_video(basename, files, all_srts)
                
                # Create video record
                video = Video(
                    id=None,
                    basename=basename,
                    rel_path=video_info['rel_path'],
                    abs_path=video_info['path'],
                    ext=video_info['ext'],
                    duration_ms=None,  # Could be populated later with ffprobe
                    has_srt=1 if srt_path else 0
                )
                
                video_id = db.upsert_video(video)
                
                # Parse and index SRT if available
                if srt_path:
                    try:
                        segments = parse_srt_file(srt_path)
                        # Set video_id for all segments
                        for segment in segments:
                            segment.video_id = video_id
                        
                        if segments:
                            db.insert_segments_bulk(segments)
                            logger.debug(f"Indexed {len(segments)} segments for {basename}")
                        
                    except Exception as e:
                        logger.error(f"Error parsing SRT {srt_path}: {e}")
                
                indexed_count += 1
                if indexed_count % 100 == 0:
                    logger.info(f"Indexed {indexed_count}/{total_videos} videos")
                    
            except Exception as e:
                logger.error(f"Error indexing {basename}: {e}")
                continue
        
        logger.info(f"Indexing complete: {indexed_count}/{total_videos} videos indexed")

def reindex_media(media_dir: str):
    """Convenience function to reindex all media"""
    indexer = VideoIndexer(media_dir)
    indexer.index_all_videos()