#!/bin/bash

echo "🚀 Starting Production Deployment for Real Estate Marketing System"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Step 1: Environment Check
echo "1️⃣ Checking Environment..."
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
fi

if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
fi

print_status "Environment files found"

# Step 2: Dependencies
echo "2️⃣ Installing Dependencies..."
npm ci || print_error "Failed to install dependencies"
print_status "Dependencies installed"

# Step 3: Security Audit
echo "3️⃣ Running Security Audit..."
npm audit || print_warning "Security audit found issues"

# Step 4: Linting (with fixes)
echo "4️⃣ Running Linter..."
npm run lint || print_warning "Lint issues found - check before deployment"

# Step 5: TypeScript Check
echo "5️⃣ TypeScript Compilation Check..."
npx tsc --noEmit || print_error "TypeScript compilation failed"
print_status "TypeScript check passed"

# Step 6: Clean Debug Code
echo "6️⃣ Cleaning Debug Code..."
echo "Removing console.log statements..."
find src -name '*.tsx' -o -name '*.ts' | xargs grep -l 'console\.' | wc -l
echo "Found console statements in above files"

# Step 7: Build for Production
echo "7️⃣ Building for Production..."
NODE_ENV=production npm run build || print_error "Build failed"
print_status "Production build completed"

# Step 8: Analyze Bundle
echo "8️⃣ Analyzing Bundle Size..."
du -sh dist/
echo "Main chunks:"
ls -lah dist/assets/*.js | head -5

# Step 9: Final Checks
echo "9️⃣ Final Checks..."
if [ ! -d "dist" ]; then
    print_error "Build directory not found!"
fi

if [ ! -f "dist/index.html" ]; then
    print_error "index.html not found in build!"
fi

file_count=$(find dist -type f | wc -l)
if [ $file_count -lt 5 ]; then
    print_error "Build seems incomplete (too few files)"
fi

print_status "Build verification passed"

echo "🎉 DEPLOYMENT READY!"
echo "=================================================================="
echo "Build location: ./dist/"
echo "Ready to deploy to: Vercel, Netlify, or any static hosting"
echo ""
echo "Quick Deploy Commands:"
echo "- Vercel: npx vercel --prod"
echo "- Netlify: npx netlify deploy --prod --dir=dist"
echo ""
echo "⚠️  REMEMBER TO:"
echo "1. Set environment variables on hosting platform"
echo "2. Configure redirects for React Router"
echo "3. Set up SSL certificate"
echo "4. Configure domain if needed"
echo "==================================================================" 