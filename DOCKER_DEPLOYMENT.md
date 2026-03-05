# Report Processing System - Docker Deployment Guide

## Docker Architecture Overview

### Containerized Deployment Benefits
- **Consistency**: Identical environment across development, testing, and production
- **Portability**: Run anywhere Docker is supported
- **Isolation**: Dependencies contained within containers
- **Scalability**: Easy horizontal scaling with container orchestration
- **Simplified Deployment**: Single command deployment

### Docker Component Structure

```
REPORT PROCESSING SYSTEM (Dockerized)
├── Frontend Container (React/Vue.js)
├── Backend Container (Python Flask)
├── Database Container (PostgreSQL)
├── Redis Container (Caching)
└── Nginx Container (Load Balancer/Reverse Proxy)
```

---

## Docker Configuration Files

### 1. Dockerfile - Backend Service

```dockerfile
# Backend Dockerfile
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads processed temp logs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "app:app"]
```

### 2. Dockerfile - Frontend Service

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine as build

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database Service
  database:
    image: postgres:15-alpine
    container_name: report_db
    environment:
      POSTGRES_DB: report_processing
      POSTGRES_USER: report_user
      POSTGRES_PASSWORD: report_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - report_network
    restart: unless-stopped

  # Redis Cache Service
  redis:
    image: redis:7-alpine
    container_name: report_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - report_network
    restart: unless-stopped

  # Backend Service
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    container_name: report_backend
    environment:
      - DATABASE_URL=postgresql://report_user:report_password@database:5432/report_processing
      - REDIS_URL=redis://redis:6379
      - FLASK_ENV=production
    ports:
      - "8080:8080"
    volumes:
      - ./uploads:/app/uploads
      - ./processed:/app/processed
      - ./logs:/app/logs
    depends_on:
      - database
      - redis
    networks:
      - report_network
    restart: unless-stopped

  # Frontend Service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: report_frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - report_network
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: report_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - frontend
      - backend
    networks:
      - report_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  report_network:
    driver: bridge
```

---

## Deployment Scenarios

### 1. Development Environment

```bash
# Development docker-compose
version: '3.8'

services:
  backend:
    build: ./backend
    environment:
      - FLASK_ENV=development
      - DEBUG=True
    ports:
      - "8080:8080"
    volumes:
      - ./backend:/app  # Live code reloading
    depends_on:
      - database
      - redis

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: report_dev
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password

  redis:
    image: redis:7-alpine
```

### 2. Production Environment

```bash
# Production deployment with resource limits
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
```

---

## Docker Build and Deployment Commands

### Basic Deployment
```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Scale backend services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Container Management
```bash
# List running containers
docker ps

# View container logs
docker logs report_backend

# Execute commands in container
docker exec -it report_backend bash

# Check container health
docker inspect --format='{{json .State.Health}}' report_backend
```

---

## Environment Configuration

### Environment Variables (.env file)
```env
# Database Configuration
POSTGRES_DB=report_processing
POSTGRES_USER=report_user
POSTGRES_PASSWORD=secure_password_here

# Application Configuration
FLASK_ENV=production
SECRET_KEY=your_secret_key_here
DEBUG=False

# Redis Configuration
REDIS_URL=redis://redis:6379

# API Keys
OPENAI_API_KEY=your_openai_key_here
GOOGLE_API_KEY=your_google_key_here

# File Storage
UPLOAD_FOLDER=/app/uploads
PROCESSED_FOLDER=/app/processed
MAX_FILE_SIZE=52428800  # 50MB
```

### Nginx Configuration
```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:8080;
    }
    
    upstream frontend {
        server frontend:80;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        # Frontend routing
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        # API routing
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
        
        # WebSocket support
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

---

## Monitoring and Maintenance

### Health Checks
```dockerfile
# Backend health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Database health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD pg_isready -U report_user -d report_processing || exit 1
```

### Backup Strategy
```bash
#!/bin/bash
# backup.sh
docker exec report_db pg_dump -U report_user report_processing > backup_$(date +%Y%m%d_%H%M%S).sql
docker exec report_redis redis-cli SAVE
```

### Monitoring Setup
```yaml
# Add to docker-compose.yml
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

---

## Scaling and Performance

### Horizontal Scaling
```bash
# Scale backend services
docker-compose up -d --scale backend=3 --scale frontend=2

# Load balancing with multiple instances
version: '3.8'
services:
  load_balancer:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/load_balancer.conf:/etc/nginx/nginx.conf
```

### Resource Optimization
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
```

---

## Security Considerations

### Container Security
- Use official base images
- Run containers as non-root user
- Implement network segmentation
- Regular security updates
- Vulnerability scanning

### Network Security
```yaml
# Isolated networks
networks:
  frontend_network:
    driver: bridge
  backend_network:
    driver: bridge
    internal: true  # No external access
```

### Secrets Management
```yaml
# Use Docker secrets
version: '3.8'
services:
  backend:
    secrets:
      - db_password
      - api_keys

secrets:
  db_password:
    file: ./secrets/db_password.txt
  api_keys:
    file: ./secrets/api_keys.txt
```

---

## Troubleshooting

### Common Issues
```bash
# Container won't start
docker-compose logs <service_name>

# Database connection issues
docker exec -it report_db psql -U report_user -d report_processing

# Port conflicts
docker-compose down && docker-compose up -d

# Volume permissions
sudo chown -R $(id -u):$(id -g) ./uploads ./processed
```

### Performance Monitoring
```bash
# Container resource usage
docker stats

# System logs
docker-compose logs --tail=100

# Network inspection
docker network inspect report_network
```

This Docker deployment approach provides a robust, scalable, and maintainable solution for the Report Processing System that can be easily deployed in any environment supporting Docker.