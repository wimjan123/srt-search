# SRT Search - Local-First Subtitle Search Tool

A powerful local-first web application for searching through SRT subtitle files across your video collection. Built with FastAPI (Python) backend and React (TypeScript) frontend.

## Features

- **Full-Text Search**: Search through subtitle text using SQLite FTS5 with BM25 ranking
- **Advanced Query Syntax**: Support for quoted phrases, prefix search (*), and boolean OR
- **Fuzzy Search**: Optional Levenshtein distance-based fuzzy matching when exact search fails
- **Video Playback**: HTML5 video player with timestamp jumping and playback controls
- **Large Scale**: Designed to handle ~3,000 videos efficiently
- **Local-First**: All data stored locally, no external dependencies
- **Responsive UI**: Three-column layout with keyboard shortcuts and virtualized results

## Quick Start

### Using Docker (Recommended)

1. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env and set MEDIA_DIR to your video folder path
   ```

2. **Start the application**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Open http://localhost:3456 in your browser
   - Click "Reindex" to scan your media folder
   - Start searching!

### Manual Setup (Development)

1. **Backend setup**:
   ```bash
   # Install Python dependencies
   pip install -r requirements.txt
   
   # Set environment variable
   export MEDIA_DIR=/path/to/your/videos
   
   # Start backend server
   python -m uvicorn backend.app:app --host 0.0.0.0 --port 3456 --reload
   ```

2. **Frontend setup** (in new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the application**:
   - Development: http://localhost:5173
   - Production: http://localhost:3456

## Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Required: Path to your media directory
MEDIA_DIR=/absolute/path/to/your/videos

# Optional: Bind only to localhost (default: 0 = bind to all interfaces)
BIND_LOCAL_ONLY=0

# Optional: Custom port (default: 3456)
PORT=3456

# Optional: Environment mode
ENV=development  # or production
```

### Media Directory Structure

Your media directory should contain video files (`.mp4`, `.avi`) and corresponding SRT files:

```
media/
├── Movie1.mp4
├── Movie1.srt
├── subfolder/
│   ├── Documentary.avi
│   └── Documentary.srt
└── VideoWithoutSubs.mp4  # Will appear as "Unindexed"
```

**Important**: SRT files must have the same basename as video files. The tool will match:
- `Video.mp4` ↔ `Video.srt`
- If multiple SRT files exist with the same basename, it prefers same-directory matches

## Usage Guide

### Search Syntax

The search engine supports advanced FTS5 query syntax:

| Query Type | Example | Description |
|------------|---------|-------------|
| Simple words | `machine learning` | Find segments containing both words |
| Quoted phrases | `"hello world"` | Exact phrase matching |
| Prefix search | `democra*` | Words starting with "democra" |
| Boolean OR | `cat OR dog` | Segments with either word |
| Combined | `"deep learning" OR neural*` | Complex queries |

### Fuzzy Search

When enabled, fuzzy search provides approximate matching using Levenshtein distance:
- Automatically falls back when FTS5 finds no results
- Allows 1-2 character differences depending on word length
- Useful for handling typos or variations

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next result |
| `k` / `↑` | Previous result |
| `Enter` | Jump to selected timestamp |
| `Esc` | Clear search |

### Video Player Features

- **Format Support**: MP4 (full support), AVI (browser-dependent)
- **Controls**: Play/pause, ±5s seeking, volume control
- **Timestamp Jump**: Click search results to jump to exact moment
- **Download**: Get original video file for unsupported formats
- **Timecode Copy**: Copy current timestamp to clipboard

## API Reference

The backend exposes a REST API for integration:

### Endpoints

```bash
# Get all video files with metadata
GET /api/files
Response: [{"basename": "video1", "ext": ".mp4", "rel_path": "video1.mp4", "has_srt": true, "segment_count": 250}]

# Search subtitle segments
GET /api/search?q=query&file=basename&offset=0&limit=25&fuzzy=0
Response: {"total": 100, "items": [{"video_basename": "...", "snippet_html": "...", ...}]}

# Trigger reindexing
POST /api/reindex
Response: {"status": "Reindexing started", "media_dir": "/path"}

# Health check
GET /api/health
Response: {"status": "ok"}

# Serve video files
GET /media/{relative_path}
Response: Video file stream
```

### Search Parameters

- `q` (required): Search query string
- `file` (optional): Filter by video basename
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Results per page (default: 25, max: 100)
- `fuzzy` (optional): Enable fuzzy search (0 or 1)

## Architecture

### Database Schema

SQLite database with FTS5 for full-text search:

```sql
-- Video metadata
CREATE TABLE videos (
    id INTEGER PRIMARY KEY,
    basename TEXT UNIQUE,
    rel_path TEXT,
    abs_path TEXT,
    ext TEXT,
    duration_ms INTEGER,
    has_srt INTEGER DEFAULT 0
);

-- Subtitle segments
CREATE TABLE segments (
    id INTEGER PRIMARY KEY,
    video_id INTEGER REFERENCES videos(id),
    start_ms INTEGER,
    end_ms INTEGER,
    text TEXT
);

-- FTS5 virtual table for search
CREATE VIRTUAL TABLE segments_fts USING fts5(
    text,
    content='segments',
    content_rowid='id',
    tokenize='porter'
);
```

### Performance Optimizations

- **SQLite WAL Mode**: Better concurrency for reads/writes
- **FTS5 BM25**: Relevance ranking for search results
- **Bulk Inserts**: Transaction-wrapped batch operations
- **Virtualized UI**: React-window for large result sets
- **Debounced Search**: 150ms delay to reduce API calls
- **Indexed Queries**: Optimized joins and filtering

## Troubleshooting

### Common Issues

**Videos not appearing after reindex**:
- Check that MEDIA_DIR path is correct and accessible
- Ensure video files have supported extensions (.mp4, .avi)
- Check container logs: `docker-compose logs srt-search`

**Search returns no results**:
- Verify SRT files exist and are readable
- Check SRT encoding (tool handles UTF-8 and auto-detects others)
- Try fuzzy search for typos
- Ensure segments were parsed correctly (check segment_count in file list)

**Video playback issues**:
- MP4 files should work in all modern browsers
- AVI files depend on browser codec support
- Use download button for unsupported formats
- Check browser console for media errors

**Performance with large libraries**:
- SQLite handles 3000+ videos efficiently
- Consider SSD storage for better I/O performance
- Monitor memory usage during large reindexes
- Use pagination for large search results

### Docker Issues

**Container won't start**:
```bash
# Check logs
docker-compose logs srt-search

# Verify mount paths
docker-compose config

# Rebuild if needed
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Media files not accessible**:
- Ensure MEDIA_DIR in .env points to absolute path
- Check directory permissions (container needs read access)
- Verify bind mount in docker-compose.yml

### Development Setup

**Frontend development**:
```bash
cd frontend
npm run dev  # Hot reload at localhost:5173
```

**Backend development**:
```bash
export ENV=development
export MEDIA_DIR=/your/media/path
python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 3456
```

## Security Considerations

⚠️ **Important**: This application has no built-in authentication and serves files directly from your media directory.

### Security Recommendations

1. **Network Access**: 
   - Use `BIND_LOCAL_ONLY=1` to restrict to localhost only
   - Run behind a reverse proxy with authentication for remote access
   - Consider VPN access instead of exposing publicly

2. **File System**:
   - The `/media/{path}` endpoint includes path traversal protection
   - Media directory is mounted read-only in Docker
   - SQLite database is isolated from media files

3. **Production Deployment**:
   - Use HTTPS in production environments
   - Consider adding basic authentication via reverse proxy
   - Monitor access logs for suspicious activity

## Testing

### Generate Test Data

Create fake video and SRT files for testing:

```bash
# Create test media structure with 20 videos
python scripts/make_fake_srt.py --output ./test_media --count 20

# Create only SRT files for testing parser
python scripts/make_fake_srt.py --srt-only --output ./test_srts --count 10
```

### Unit Tests

```bash
# Backend tests
python -m pytest backend/tests/

# Frontend tests
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Follow existing code style and patterns
5. Submit a pull request with clear description

### Code Style

- **Backend**: Black formatting, type hints, docstrings
- **Frontend**: TypeScript strict mode, functional components
- **Database**: Descriptive column names, proper indexes
- **API**: RESTful conventions, proper status codes

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.0
- Initial release with full-text search
- React frontend with three-column layout
- Docker deployment support
- Fuzzy search capabilities
- Video player with timestamp jumping
- Keyboard navigation and shortcuts