#!/bin/bash

# Bomberman Game Setup and Launcher Script
# This script helps set up and run the Bomberman game

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
GAME_DIR="$PROJECT_ROOT/game"

echo "🎮 Bomberman Game Setup"
echo "======================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Install dependencies
if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo ""
    echo "📦 Installing server dependencies..."
    cd "$SERVER_DIR"
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Server dependencies already installed"
fi

echo ""
echo "🚀 Starting server..."
cd "$SERVER_DIR"
npm start &
SERVER_PID=$!

echo ""
echo "✅ Server started with PID: $SERVER_PID"
echo "📡 WebSocket server running on ws://localhost:8080"
echo ""
echo "🎮 Game ready to play!"
echo "📂 Open this file in your browser: $GAME_DIR/index.html"
echo ""
echo "Or use Python HTTP server:"
echo "  cd $GAME_DIR && python -m http.server 8000"
echo "  Then visit: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"

# Keep the script running
wait $SERVER_PID
