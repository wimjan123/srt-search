FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Verify build output
RUN ls -la ../backend/static/ || echo "Static directory not found"
RUN ls -la ../backend/static/assets/ || echo "Assets directory not found"

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/ ./backend/
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend
COPY --from=frontend-builder /app/backend/static ./backend/static

# Create directory for SQLite database
RUN mkdir -p /app/data

# Expose port
EXPOSE 3456

# Set environment variables
ENV PYTHONPATH=/app
ENV DATABASE_PATH=/app/data/srt_search.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3456/api/health || exit 1

# Run the application
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "3456"]