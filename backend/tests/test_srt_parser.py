import pytest
from pathlib import Path
import tempfile
import os
from backend.srt_parser import parse_srt_file, parse_timecode, format_timecode

def test_parse_timecode():
    """Test timecode parsing"""
    assert parse_timecode("00:01:30,500") == 90500
    assert parse_timecode("01:23:45,123") == 5025123
    assert parse_timecode("00:00:00,000") == 0

def test_format_timecode():
    """Test timecode formatting"""
    assert format_timecode(90500) == "00:01:30"
    assert format_timecode(5025123) == "01:23:45"
    assert format_timecode(0) == "00:00:00"

def test_parse_srt_file():
    """Test SRT file parsing"""
    srt_content = """1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:05,500 --> 00:00:08,000
This is a test subtitle

3
00:00:10,000 --> 00:00:12,500
Final subtitle with <b>HTML</b> tags
"""
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.srt', delete=False, encoding='utf-8') as f:
        f.write(srt_content)
        temp_file = f.name
    
    try:
        segments = parse_srt_file(temp_file)
        
        assert len(segments) == 3
        
        # Check first segment
        assert segments[0].start_ms == 1000
        assert segments[0].end_ms == 3000
        assert segments[0].text == "Hello world"
        
        # Check second segment
        assert segments[1].start_ms == 5500
        assert segments[1].end_ms == 8000
        assert segments[1].text == "This is a test subtitle"
        
        # Check HTML tag removal
        assert segments[2].text == "Final subtitle with HTML tags"
        
    finally:
        os.unlink(temp_file)

def test_parse_malformed_srt():
    """Test parsing malformed SRT content"""
    malformed_content = """1
invalid_timecode
Hello world

2
00:00:05,500 --> 00:00:08,000
Valid subtitle
"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.srt', delete=False, encoding='utf-8') as f:
        f.write(malformed_content)
        temp_file = f.name
    
    try:
        segments = parse_srt_file(temp_file)
        # Should only parse the valid subtitle
        assert len(segments) == 1
        assert segments[0].text == "Valid subtitle"
        
    finally:
        os.unlink(temp_file)