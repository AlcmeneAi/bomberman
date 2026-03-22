#!/bin/bash

echo "========================================"
echo "  Bomberman Server Launcher"
echo "========================================"
echo

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed."
    echo "Install it from https://nodejs.org/ or via your package manager."
    exit 1
fi

echo "Node.js found: $(node --version)"

# Install dependencies
cd "$SCRIPT_DIR/server"

if [ ! -d "node_modules" ]; then
    echo
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install dependencies."
        exit 1
    fi
    echo "Dependencies installed."
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed."
    echo "Install it via your package manager (e.g. sudo apt install python3)."
    exit 1
fi

echo
echo "Starting Bomberman WebSocket server..."
npm start &
SERVER_PID=$!

cd "$SCRIPT_DIR/game"

echo "Starting HTTP server for the game client..."
echo
echo "========================================"
echo "  Open http://localhost:8000 in your browser"
echo "  Open 2-4 tabs to play multiplayer"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo

# Cleanup both processes on exit
trap "kill $SERVER_PID 2>/dev/null; exit" INT TERM
python3 -m http.server 8000

kill $SERVER_PID 2>/dev/null
