# Multi-stage build: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy source code and build
COPY frontend/ ./
RUN npm run build

# Production stage: Nginx server
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/backend/static /usr/share/nginx/html

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Create nginx user and set permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to nginx user for security
USER nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]