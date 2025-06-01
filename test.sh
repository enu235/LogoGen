#!/bin/bash

# Test Script for LogoGen

echo "🧪 LogoGen Test Suite"
echo "===================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# Function to test API endpoint
test_api() {
    echo -e "${YELLOW}📡 Testing API endpoint: $1${NC}"
    
    RESPONSE=$(curl -s -w "%{http_code}" "$1" 2>/dev/null)
    HTTP_CODE=${RESPONSE: -3}
    
    if [ "$HTTP_CODE" = "200" ]; then
        return 0
    else
        echo "   HTTP Code: $HTTP_CODE"
        return 1
    fi
}

echo "🔍 Running pre-flight checks..."

# Check if .env exists
if [ -f ".env" ]; then
    print_result 0 ".env file exists"
else
    print_result 1 ".env file missing"
    echo "   Run: cp .env.example .env"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_result 0 "Dependencies installed"
else
    print_result 1 "Dependencies missing"
    echo "   Run: npm install"
fi

# Check if directories exist
if [ -d "public/generated" ]; then
    print_result 0 "Generated images directory exists"
else
    print_result 1 "Generated images directory missing"
    echo "   Run: mkdir -p public/generated"
fi

if [ -d "temp" ]; then
    print_result 0 "Temp directory exists"
else
    print_result 1 "Temp directory missing"
    echo "   Run: mkdir -p temp"
fi

echo ""
echo "🌐 Testing server endpoints..."

# Test health endpoint
test_api "http://localhost:3000/api/health"
print_result $? "Health endpoint"

# Test main page
test_api "http://localhost:3000/"
print_result $? "Main page"

echo ""
echo "📝 Test Summary:"
echo "   If any tests failed, make sure:"
echo "   1. You've run './start.sh' or 'npm start'"
echo "   2. Your .env file is properly configured"
echo "   3. All dependencies are installed"
echo ""
echo "🚀 Ready to generate images at http://localhost:3000"
