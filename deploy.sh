#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest images (authentication already handled)
echo "📦 Pulling latest Docker images..."
docker-compose pull

# Stop and remove old containers
echo "🛑 Stopping old containers..."
docker-compose down

# Start new containers
echo "✅ Starting new containers..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

# Clean up old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo "✨ Deployment completed successfully!"
