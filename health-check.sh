#!/bin/bash

# Health Check Script for LogoGen

echo "🏥 LogoGen Health Check"
echo "======================"

# Check if server is running
echo "📡 Checking server status..."

HEALTH_URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
HTTP_CODE=${RESPONSE: -3}
BODY=${RESPONSE%???}

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is running and healthy"
    echo "📊 Server info:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo "❌ Server is not responding (HTTP $HTTP_CODE)"
    echo "🔍 Common issues:"
    echo "   - Server not started (run ./start.sh)"
    echo "   - Wrong port (check PORT in .env)"
    echo "   - API_KEY not configured"
    exit 1
fi

echo ""
echo "🌐 Application URL: http://localhost:3000"
echo "📚 API Documentation: See DEVELOPMENT.md"
