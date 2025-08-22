#!/bin/bash

# SRT Search Multi-Container Startup Script
# This script sets up and starts the multi-container SRT Search application

set -e

echo "🚀 Starting SRT Search Multi-Container Setup..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo "   Especially set MEDIA_DIR to point to your video files directory."
    read -p "Press Enter to continue after editing .env file..."
fi

# Source environment variables
set -a
source .env
set +a

# Validate required environment variables
if [ -z "$MEDIA_DIR" ] || [ "$MEDIA_DIR" = "/path/to/your/media/files" ]; then
    echo "❌ Please set MEDIA_DIR in .env file to your actual media directory"
    exit 1
fi

if [ ! -d "$MEDIA_DIR" ]; then
    echo "❌ MEDIA_DIR ($MEDIA_DIR) does not exist"
    exit 1
fi

echo "📁 Media directory: $MEDIA_DIR"
echo "🔌 Web port: ${WEB_PORT:-3456}"

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose -f docker-compose.multi.yml down --remove-orphans

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f docker-compose.multi.yml up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
timeout 120 bash -c '
    while true; do
        if docker-compose -f docker-compose.multi.yml ps | grep -q "unhealthy\|starting"; then
            echo "   Services still starting..."
            sleep 5
        else
            break
        fi
    done
'

# Check service status
echo "📊 Service Status:"
docker-compose -f docker-compose.multi.yml ps

# Show logs for any unhealthy services
unhealthy=$(docker-compose -f docker-compose.multi.yml ps --filter health=unhealthy -q)
if [ ! -z "$unhealthy" ]; then
    echo "❌ Some services are unhealthy. Showing logs:"
    docker-compose -f docker-compose.multi.yml logs --tail=50
    exit 1
fi

echo ""
echo "✅ SRT Search is now running!"
echo ""
echo "🌐 Access the application at: http://localhost:${WEB_PORT:-3456}"
echo "📊 View logs: docker-compose -f docker-compose.multi.yml logs -f"
echo "🛑 Stop services: docker-compose -f docker-compose.multi.yml down"
echo ""
echo "📝 Next steps:"
echo "   1. Open http://localhost:${WEB_PORT:-3456} in your browser"
echo "   2. Click 'Reindex' to scan your media directory for videos with subtitles"
echo "   3. Start searching your video content!"
echo ""