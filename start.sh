#!/bin/bash

# LogoGen Startup Script

echo "🎨 Starting LogoGen - AI Logo & Icon Generator"
echo "============================================="

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your API configuration:"
    echo "   - API_KEY: Your image generation API key"
    echo "   - API_BASE_URL: Your API endpoint (default: https://api.x.ai/v1)"
    echo "   - MODEL_NAME: Model name to use (default: grok-imagine-image-2.0)"
    echo ""
    echo "After configuring .env, run this script again."
    exit 1
fi

# Check if API_KEY is set
source .env
if [ -z "$API_KEY" ] || [ "$API_KEY" = "your_api_key_here" ]; then
    echo "❌ API_KEY not configured in .env file"
    echo "Please edit .env and set your API key"
    exit 1
fi

echo "✅ Configuration looks good!"
echo "🚀 Starting server..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create necessary directories
mkdir -p public/generated temp

# Start the server
npm start
