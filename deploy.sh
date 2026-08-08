#!/bin/bash
set -e

echo "🚀 Deploying SnapCap to production..."

ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ $ENV_FILE not found! Please copy .env.production and fill in values."
    exit 1
fi

echo "📋 Validating environment..."
source $ENV_FILE

REQUIRED_VARS=(
    "FIREBASE_API_KEY"
    "FIREBASE_AUTH_DOMAIN"
    "FIREBASE_PROJECT_ID"
    "FIREBASE_STORAGE_BUCKET"
    "EXTENSION_URL"
    "CORS_ORIGIN"
    "GRAFANA_PASSWORD"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required variable $var is not set in $ENV_FILE"
        exit 1
    fi
done

echo "✅ Environment validation passed"

if [ ! -f "backend/serviceAccountKey.json" ]; then
    echo "❌ backend/serviceAccountKey.json not found!"
    echo "Please download from Firebase Console > Project Settings > Service Accounts"
    exit 1
fi

echo "🔨 Building images..."
docker compose -f $COMPOSE_FILE build --no-cache

echo "🛑 Stopping existing containers..."
docker compose -f $COMPOSE_FILE down

echo "🚀 Starting services..."
docker compose -f $COMPOSE_FILE up -d

echo "⏳ Waiting for services to be healthy..."
sleep 10

for i in {1..30}; do
    if curl -sf http://localhost/api/health > /dev/null; then
        echo "✅ API is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 30 attempts"
        docker compose -f $COMPOSE_FILE logs api
        exit 1
    fi
    sleep 2
done

echo "🔍 Running smoke tests..."
if curl -sf http://localhost/api/health | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi

echo ""
echo "🎉 Deployment successful!"
echo ""
echo "Services running:"
echo "  - API: https://your-domain.com/api"
echo "  - Grafana: https://your-domain.com/grafana (admin / \$GRAFANA_PASSWORD)"
echo "  - Prometheus: http://localhost:9090 (internal)"
echo ""
echo "Next steps:"
echo "  1. Configure DNS to point to this server"
echo "  2. Run certbot to get SSL certificates:"
echo "     docker compose -f $COMPOSE_FILE run --rm certbot certonly --webroot -w /var/www/certbot -d your-domain.com"
echo "  3. Restart nginx: docker compose -f $COMPOSE_FILE restart nginx"
echo "  4. Update extension config with API URL: $EXTENSION_URL"