#!/bin/bash
# ================================================================
# BirdSound - Android App Build Script
# ================================================================
# Usage: bash android_build.sh [debug|release]
# ================================================================

set -e

MODE=${1:-debug}
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🐦 BirdSound Android Build                          ║"
echo "╚════════════════════════════════════════════════════════════╝"

cd "$PROJECT_DIR"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js nicht gefunden"; exit 1; }
command -v npx >/dev/null 2>&1 || { echo "❌ npx nicht gefunden"; exit 1; }

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installiere npm dependencies..."
    npm install
fi

# Build
if [ "$MODE" == "release" ]; then
    echo "🔨 Erstelle Release APK..."
    cd android
    ./gradlew assembleRelease
    
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        echo ""
        echo "✅ Release APK erstellt: $APK_PATH"
        ls -lh "$APK_PATH"
    fi
else
    echo "🔨 Erstelle Debug APK..."
    cd android
    ./gradlew assembleDebug
    
    APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        echo ""
        echo "✅ Debug APK erstellt: $APK_PATH"
        ls -lh "$APK_PATH"
    fi
fi

echo ""
echo "📱 Zum Installieren auf Gerät:"
echo "   adb install -r $APK_PATH"
