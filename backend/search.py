import re
import sqlite3
from typing import List, Optional, Tuple
from Levenshtein import distance as levenshtein_distance
from .db import db
from .models import SearchResult
from .srt_parser import format_timecode

def prepare_fts_query(query: str) -> str:
    """Prepare query string for FTS5"""
    # Handle quoted phrases
    quoted_phrases = re.findall(r'"([^"]+)"', query)
    
    # Remove quoted phrases from query temporarily
    query_without_quotes = re.sub(r'"[^"]+"', '', query)
    
    # Split remaining words and handle prefix search
    words = query_without_quotes.split()
    processed_words = []
    
    for word in words:
        word = word.strip()
        if not word:
            continue
            
        # Handle OR operator
        if word.upper() == 'OR':
            processed_words.append('OR')
            continue
            
        # Handle prefix search (words ending with *)
        if word.endswith('*'):
            processed_words.append(f'"{word}"')
        else:
            processed_words.append(f'"{word}"')
    
    # Reconstruct query
    result_parts = []
    
    # Add quoted phrases back
    for phrase in quoted_phrases:
        result_parts.append(f'"{phrase}"')
    
    # Add processed words
    if processed_words:
        result_parts.extend(processed_words)
    
    return ' '.join(result_parts) if result_parts else query

def highlight_snippet(text: str, query: str, context_chars: int = 100) -> str:
    """Create highlighted snippet from text"""
    # Extract words from query (ignore operators and quotes)
    query_words = re.findall(r'\b\w+\b', query.lower())
    
    if not query_words:
        return text[:context_chars * 2] + ("..." if len(text) > context_chars * 2 else "")
    
    # Find first occurrence of any query word
    text_lower = text.lower()
    first_match_pos = len(text)
    
    for word in query_words:
        # Handle prefix search
        if word.endswith('*'):
            word = word[:-1]
        
        pos = text_lower.find(word)
        if pos != -1 and pos < first_match_pos:
            first_match_pos = pos
    
    if first_match_pos == len(text):
        # No match found, return beginning of text
        snippet_start = 0
    else:
        # Center the snippet around the first match
        snippet_start = max(0, first_match_pos - context_chars)
    
    snippet_end = min(len(text), snippet_start + context_chars * 2)
    snippet = text[snippet_start:snippet_end]
    
    # Add ellipsis if truncated
    if snippet_start > 0:
        snippet = "..." + snippet
    if snippet_end < len(text):
        snippet = snippet + "..."
    
    # Highlight matches
    for word in query_words:
        if word.endswith('*'):
            # Prefix search - match word beginnings
            word_pattern = word[:-1]
            pattern = r'\b(' + re.escape(word_pattern) + r'\w*)'
        else:
            pattern = r'\b(' + re.escape(word) + r')\b'
        
        snippet = re.sub(pattern, r'<mark>\1</mark>', snippet, flags=re.IGNORECASE)
    
    return snippet

def fuzzy_search_segments(query: str, file_basename: str = "", limit: int = 25, offset: int = 0) -> Tuple[List[SearchResult], int]:
    """Perform fuzzy search using trigram matching"""
    # Simple fuzzy search - find segments with words similar to query words
    query_words = re.findall(r'\b\w+\b', query.lower())
    
    if not query_words:
        return [], 0
    
    with db.get_connection() as conn:
        # Build SQL query
        if file_basename:
            base_query = """
                SELECT s.start_ms, s.end_ms, s.text, v.basename, v.rel_path, v.ext,
                       COUNT(*) OVER() as total_count
                FROM segments s
                JOIN videos v ON s.video_id = v.id
                WHERE v.basename = ?
            """
            params = [file_basename]
        else:
            base_query = """
                SELECT s.start_ms, s.end_ms, s.text, v.basename, v.rel_path, v.ext,
                       COUNT(*) OVER() as total_count
                FROM segments s
                JOIN videos v ON s.video_id = v.id
                WHERE 1=1
            """
            params = []
        
        # Get all segments and filter by fuzzy matching
        all_segments = conn.execute(base_query, params).fetchall()
        
        fuzzy_matches = []
        for row in all_segments:
            text_lower = row['text'].lower()
            
            # Check if any query word has a fuzzy match
            match_score = 0
            for word in query_words:
                # Find the best match for this word in the text
                text_words = re.findall(r'\b\w+\b', text_lower)
                best_distance = float('inf')
                
                for text_word in text_words:
                    if len(text_word) >= 3 and len(word) >= 3:  # Only compare words of reasonable length
                        dist = levenshtein_distance(word, text_word)
                        # Allow up to 2 character differences for words 6+ chars, 1 for shorter
                        max_dist = 2 if len(word) >= 6 else 1
                        if dist <= max_dist:
                            best_distance = min(best_distance, dist)
                
                if best_distance != float('inf'):
                    match_score += (3 - best_distance)  # Higher score for closer matches
            
            if match_score > 0:
                fuzzy_matches.append((row, match_score))
        
        # Sort by match score (descending) then by start time
        fuzzy_matches.sort(key=lambda x: (-x[1], x[0]['start_ms']))
        
        # Paginate
        total = len(fuzzy_matches)
        paginated = fuzzy_matches[offset:offset + limit]
        
        results = []
        for row, score in paginated:
            result = SearchResult(
                video_basename=row['basename'],
                rel_path=row['rel_path'],
                ext=row['ext'],
                start_ms=row['start_ms'],
                end_ms=row['end_ms'],
                timecode=format_timecode(row['start_ms']),
                snippet_html=highlight_snippet(row['text'], query)
            )
            results.append(result)
        
        return results, total

def search_segments(query: str, file_basename: str = "", limit: int = 25, offset: int = 0, fuzzy: bool = False) -> Tuple[List[SearchResult], int]:
    """Search segments using FTS5 or fuzzy matching"""
    
    if fuzzy:
        return fuzzy_search_segments(query, file_basename, limit, offset)
    
    # Prepare FTS query
    fts_query = prepare_fts_query(query)
    
    with db.get_connection() as conn:
        if file_basename:
            search_sql = """
                SELECT s.start_ms, s.end_ms, s.text, v.basename, v.rel_path, v.ext,
                       segments_fts.rank as rank,
                       COUNT(*) OVER() as total_count
                FROM segments_fts
                JOIN segments s ON segments_fts.rowid = s.id
                JOIN videos v ON s.video_id = v.id
                WHERE segments_fts MATCH ? AND v.basename = ?
                ORDER BY rank, s.start_ms
                LIMIT ? OFFSET ?
            """
            params = [fts_query, file_basename, limit, offset]
        else:
            search_sql = """
                SELECT s.start_ms, s.end_ms, s.text, v.basename, v.rel_path, v.ext,
                       segments_fts.rank as rank,
                       COUNT(*) OVER() as total_count
                FROM segments_fts
                JOIN segments s ON segments_fts.rowid = s.id
                JOIN videos v ON s.video_id = v.id
                WHERE segments_fts MATCH ?
                ORDER BY rank, s.start_ms
                LIMIT ? OFFSET ?
            """
            params = [fts_query, limit, offset]
        
        try:
            rows = conn.execute(search_sql, params).fetchall()
            
            if not rows:
                # If no FTS results and fuzzy is requested as fallback
                if not fuzzy:
                    return [], 0
                return fuzzy_search_segments(query, file_basename, limit, offset)
            
            total = rows[0]['total_count'] if rows else 0
            
            results = []
            for row in rows:
                result = SearchResult(
                    video_basename=row['basename'],
                    rel_path=row['rel_path'],
                    ext=row['ext'],
                    start_ms=row['start_ms'],
                    end_ms=row['end_ms'],
                    timecode=format_timecode(row['start_ms']),
                    snippet_html=highlight_snippet(row['text'], query)
                )
                results.append(result)
            
            return results, total
            
        except sqlite3.OperationalError as e:
            # FTS query failed, try fuzzy search as fallback
            if "fts5" in str(e).lower():
                return fuzzy_search_segments(query, file_basename, limit, offset)
            raise