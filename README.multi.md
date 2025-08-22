# 🎬 SRT Search - Multi-Container Architecture

A modern, scalable subtitle search application with beautiful UI and powerful full-text search capabilities.

## 🏗️ **Multi-Container Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx Web     │    │   FastAPI API    │    │  PostgreSQL DB  │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   (Database)    │
│                 │    │                  │    │                 │
│ • React UI      │    │ • REST API       │    │ • Full-text     │
│ • Static Assets │    │ • Media Serving  │    │   search        │
│ • Reverse Proxy │    │ • Search Logic   │    │ • Persistence   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## ✨ **Features**

- 🎨 **Beautiful Modern UI** - Glass morphism design with gradients and animations
- 🔍 **Powerful Search** - PostgreSQL full-text search with fuzzy matching
- 🐳 **Multi-Container** - Separate services for scalability and maintainability  
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 🚀 **High Performance** - Optimized database queries and caching
- 🔒 **Security** - Non-root containers, rate limiting, proper isolation

## 🚀 **Quick Start**

### Prerequisites
- Docker & Docker Compose installed
- Directory with video files and .srt subtitle files

### Setup & Launch
```bash
# 1. Run the setup script
./start-multi-container.sh

# 2. Edit .env file with your media directory
# 3. Press Enter to continue

# The script will build and start all services automatically
```

### Manual Setup
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env file - especially set MEDIA_DIR
nano .env

# 3. Start services
docker-compose -f docker-compose.multi.yml up --build -d
```

## 📁 **Project Structure**

```
srt-base/
├── docker/                    # Container configurations
│   ├── api.Dockerfile        # FastAPI backend container
│   ├── web.Dockerfile        # Nginx frontend container  
│   └── nginx.conf            # Nginx configuration
├── database/
│   └── init.sql              # PostgreSQL initialization
├── backend/                  # FastAPI application
│   ├── app.py               # Main application
│   ├── db_postgres.py       # PostgreSQL database layer
│   └── ...                  # Other backend modules
├── frontend/                 # React application
│   ├── src/                 # Source code with beautiful UI
│   └── ...                  # Built assets
├── docker-compose.multi.yml  # Multi-container orchestration
├── start-multi-container.sh  # Setup and launch script
└── .env.example             # Environment template
```

## 🔧 **Configuration**

### Environment Variables (.env)
```bash
# Database
DB_PASSWORD=your-secure-password
DATABASE_URL=postgresql://srt_user:password@database:5432/srt_search

# Security  
SECRET_KEY=your-secret-key-for-production

# Media Files
MEDIA_DIR=/path/to/your/video/files

# Web Server
WEB_PORT=3456
```

## 🐳 **Services**

### Database Service (PostgreSQL)
- **Image**: `postgres:15-alpine`
- **Port**: Internal only (5432)
- **Features**: Full-text search, trigram matching, optimized indexes
- **Volume**: `db_data` for persistence

### API Service (FastAPI)
- **Build**: Custom Python image with FastAPI
- **Port**: Internal only (8000)  
- **Features**: REST API, media serving, search logic
- **Volumes**: Media files (read-only), API logs

### Web Service (Nginx)
- **Build**: Custom Nginx image with React frontend
- **Port**: `3456` (configurable)
- **Features**: Static serving, API proxy, compression, security headers
- **Health Check**: HTTP endpoint monitoring

## 🛠️ **Management Commands**

```bash
# View service status
docker-compose -f docker-compose.multi.yml ps

# View logs
docker-compose -f docker-compose.multi.yml logs -f

# Stop services  
docker-compose -f docker-compose.multi.yml down

# Rebuild and restart
docker-compose -f docker-compose.multi.yml up --build -d

# Access database directly
docker-compose -f docker-compose.multi.yml exec database psql -U srt_user -d srt_search

# Scale API service (if needed)
docker-compose -f docker-compose.multi.yml up -d --scale api=3
```

## 🔍 **Database Features**

### Full-Text Search
- **PostgreSQL tsvector** - Fast text indexing
- **Trigram matching** - Fuzzy search capabilities  
- **Ranking** - Relevance-based result ordering
- **Highlighting** - Search term highlighting in results

### Performance Optimizations
- **GIN indexes** - Fast text search
- **Partial indexes** - Optimized queries
- **Connection pooling** - Efficient database connections
- **Query optimization** - Tuned for subtitle search patterns

## 📊 **Monitoring & Health**

All services include health checks:
- **Database**: Connection and query tests
- **API**: HTTP endpoint checks  
- **Web**: Nginx status verification

View health status:
```bash
docker-compose -f docker-compose.multi.yml ps
```

## 🔒 **Security Features**

- **Non-root containers** - All services run as non-root users
- **Network isolation** - Database only accessible internally  
- **Rate limiting** - API request throttling
- **Security headers** - XSS, CSRF, and other protections
- **Input validation** - Sanitized search queries

## 🚀 **Scaling & Production**

### Horizontal Scaling
```bash
# Scale API service
docker-compose -f docker-compose.multi.yml up -d --scale api=3

# Load balancer configuration in nginx.conf handles multiple API instances
```

### Production Deployment
1. Use strong passwords in `.env`
2. Set up external PostgreSQL if needed
3. Configure reverse proxy (Traefik, nginx)  
4. Set up monitoring and logging
5. Regular database backups

## 🆘 **Troubleshooting**

### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.multi.yml logs

# Check disk space
df -h

# Rebuild containers
docker-compose -f docker-compose.multi.yml build --no-cache
```

### Database Connection Issues
```bash
# Test database connectivity
docker-compose -f docker-compose.multi.yml exec api curl -f http://localhost:8000/api/health

# Access database directly
docker-compose -f docker-compose.multi.yml exec database psql -U srt_user -d srt_search
```

### Performance Issues
- Check PostgreSQL query performance
- Monitor container resource usage
- Optimize media file storage location
- Consider database tuning parameters

## 📝 **Development**

For development with hot reload:
```bash
# Start only database
docker-compose -f docker-compose.multi.yml up database -d

# Run API and frontend locally with your development tools
```

## 🎯 **Next Steps**

After setup:
1. 🌐 Open http://localhost:3456
2. 🔄 Click "Reindex" to scan media files  
3. 🔍 Start searching your video content!
4. 📱 Test on mobile devices
5. ⚡ Enjoy lightning-fast subtitle search!

---

**Made with ❤️ using Docker, PostgreSQL, FastAPI, and React**