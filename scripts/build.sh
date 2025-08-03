#!/bin/bash

# Production build script for Finance Forecaster

echo "🏗️  Building Finance Forecaster for Production"
echo "=============================================="

# Create build directory
mkdir -p dist

echo "📦 Installing dependencies..."

# Install backend dependencies
echo "Installing Python dependencies..."
poetry install --no-root --only main

# Install frontend dependencies and build
echo "Installing Node.js dependencies..."
cd frontend
npm ci
echo "Building React app..."
npm run build
cd ..

# Copy backend files
echo "📁 Copying backend files..."
cp -r backend dist/
cp -r artifacts dist/ 2>/dev/null || echo "No artifacts directory found, skipping..."
cp pyproject.toml poetry.lock dist/

# Copy built frontend to backend static directory
echo "📱 Copying frontend build..."
mkdir -p dist/static
cp -r frontend/dist/* dist/static/

echo "✅ Build complete!"
echo "   📂 Build output: ./dist/"
echo "   🚀 Ready for deployment"

# Create simple production startup script
cat > dist/start.sh << 'EOF'
#!/bin/bash
echo "Starting Finance Forecaster Production Server..."
export PYTHONPATH=.
poetry run uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --workers 2
EOF

chmod +x dist/start.sh

echo "   ▶️  Run in production: cd dist && ./start.sh"
