#!/bin/bash
set -e

echo "🚀 Setting up SRT Search development environment..."

# Check if we're in the right directory
if [[ ! -f "requirements.txt" ]]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create .env if it doesn't exist
if [[ ! -f ".env" ]]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and set your MEDIA_DIR path before continuing"
fi

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Create data directory
echo "📁 Creating data directory..."
mkdir -p data

# Generate test data
echo "🎬 Would you like to generate test media? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "Creating test media structure..."
    python scripts/make_fake_srt.py --output ./test_media --count 15
    echo "✅ Test media created in ./test_media"
    echo "💡 Update your .env file to set MEDIA_DIR=./test_media"
fi

echo ""
echo "🎉 Development setup complete!"
echo ""
echo "To start development:"
echo "  1. Set MEDIA_DIR in .env file"
echo "  2. Backend:  export MEDIA_DIR=/your/path && python -m uvicorn backend.app:app --reload --host 0.0.0.0 --port 3456"
echo "  3. Frontend: cd frontend && npm run dev"
echo "  4. Open http://localhost:5173"
echo ""
echo "Or use Docker:"
echo "  docker-compose up -d"
echo "  Open http://localhost:3456"