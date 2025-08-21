import re
from typing import List, Tuple
import chardet
from .models import Segment

def parse_timecode(timecode_str: str) -> int:
    """Convert SRT timecode to milliseconds"""
    # Format: HH:MM:SS,mmm
    pattern = r'(\d{2}):(\d{2}):(\d{2}),(\d{3})'
    match = re.match(pattern, timecode_str)
    if not match:
        raise ValueError(f"Invalid timecode format: {timecode_str}")
    
    hours, minutes, seconds, milliseconds = map(int, match.groups())
    return hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds

def format_timecode(ms: int) -> str:
    """Convert milliseconds to HH:MM:SS format"""
    hours = ms // 3600000
    minutes = (ms % 3600000) // 60000
    seconds = (ms % 60000) // 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"

def parse_srt_file(file_path: str) -> List[Segment]:
    """Parse SRT file and return list of segments"""
    try:
        # Try UTF-8 first
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        # Fallback to chardet detection
        with open(file_path, 'rb') as f:
            raw_data = f.read()
            detected = chardet.detect(raw_data)
            encoding = detected.get('encoding', 'utf-8')
            content = raw_data.decode(encoding, errors='ignore')
    
    segments = []
    
    # Split into blocks by double newlines
    blocks = re.split(r'\n\s*\n', content.strip())
    
    for block in blocks:
        if not block.strip():
            continue
            
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
            
        # First line should be the sequence number
        try:
            seq_num = int(lines[0].strip())
        except ValueError:
            continue
            
        # Second line should be the timecode
        timecode_line = lines[1].strip()
        timecode_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', timecode_line)
        
        if not timecode_match:
            continue
            
        start_time, end_time = timecode_match.groups()
        
        try:
            start_ms = parse_timecode(start_time)
            end_ms = parse_timecode(end_time)
        except ValueError:
            continue
            
        # Remaining lines are the subtitle text
        text = '\n'.join(lines[2:]).strip()
        
        # Remove HTML tags and normalize whitespace
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text).strip()
        
        if text:  # Only add if there's actual text
            segments.append(Segment(
                id=None,
                video_id=0,  # Will be set when inserting
                start_ms=start_ms,
                end_ms=end_ms,
                text=text
            ))
    
    return segments