#!/bin/bash

# Madge Analysis Script for Gigasoftware Workspace
# This script runs comprehensive dependency analysis using madge

echo "🔍 Running Madge Dependency Analysis for Gigasoftware Workspace"
echo "=============================================================="

# Create analysis directory
mkdir -p analysis/madge
cd analysis/madge

echo ""
echo "📊 1. Circular Dependencies Analysis"
echo "-----------------------------------"
echo "Checking for circular dependencies in apps/ and libs/ directories..."
npx madge --extensions ts,js --circular --no-spinner ../../apps/ ../../libs/ > circular-deps-all.txt
if [ -s circular-deps-all.txt ]; then
    echo "❌ Circular dependencies found! Check analysis/madge/circular-deps-all.txt"
    cat circular-deps-all.txt
else
    echo "✅ No circular dependencies found in the workspace!"
fi

echo ""
echo "📊 2. Orphaned Files Analysis"
echo "-----------------------------"
echo "Finding orphaned files (files not imported by any other file)..."
npx madge --extensions ts,js --orphans --no-spinner ../../apps/ ../../libs/ > orphaned-files.txt
if [ -s orphaned-files.txt ]; then
    echo "🔍 Orphaned files found! Check analysis/madge/orphaned-files.txt"
    echo "First 10 orphaned files:"
    head -10 orphaned-files.txt
else
    echo "✅ No orphaned files found!"
fi

echo ""
echo "📊 3. Dependency Summary"
echo "-----------------------"
echo "Generating overall dependency summary..."
npx madge --extensions ts,js --summary ../../apps/ ../../libs/ > dependency-summary.txt
cat dependency-summary.txt

echo ""
echo "📊 4. Library Analysis"
echo "----------------------"
echo "Analyzing libs/ directory for circular dependencies..."
npx madge --extensions ts,js --circular --no-spinner ../../libs/ > circular-deps-libs.txt
if [ -s circular-deps-libs.txt ]; then
    echo "❌ Circular dependencies found in libs! Check analysis/madge/circular-deps-libs.txt"
else
    echo "✅ No circular dependencies found in libs!"
fi

echo ""
echo "📊 5. Apps Analysis"
echo "-------------------"
echo "Analyzing apps/ directory for circular dependencies..."
npx madge --extensions ts,js --circular --no-spinner ../../apps/ > circular-deps-apps.txt
if [ -s circular-deps-apps.txt ]; then
    echo "❌ Circular dependencies found in apps! Check analysis/madge/circular-deps-apps.txt"
else
    echo "✅ No circular dependencies found in apps!"
fi

echo ""
echo "📊 6. Individual App Analysis"
echo "-----------------------------"

# Evolving Cognition App
echo "Analyzing Evolving Cognition app..."
npx madge --extensions ts,js --circular --no-spinner ../../apps/evolving-cognition/ > circular-deps-ec.txt
if [ -s circular-deps-ec.txt ]; then
    echo "❌ Circular dependencies found in Evolving Cognition app!"
else
    echo "✅ No circular dependencies in Evolving Cognition app!"
fi

# Real Estate App
echo "Analyzing Real Estate app..."
npx madge --extensions ts,js --circular --no-spinner ../../apps/real-estate/ > circular-deps-re.txt
if [ -s circular-deps-re.txt ]; then
    echo "❌ Circular dependencies found in Real Estate app!"
else
    echo "✅ No circular dependencies in Real Estate app!"
fi

# Gigasoftware App
echo "Analyzing Gigasoftware marketing app..."
npx madge --extensions ts,js --circular --no-spinner ../../apps/gigasoftware/ > circular-deps-giga.txt
if [ -s circular-deps-giga.txt ]; then
    echo "❌ Circular dependencies found in Gigasoftware app!"
else
    echo "✅ No circular dependencies in Gigasoftware app!"
fi

echo ""
echo "📊 7. Generating Visual Dependency Graph"
echo "----------------------------------------"
echo "Creating SVG dependency graph (this may take a while for large projects)..."
npx madge --extensions ts,js --image dependency-graph.svg ../../apps/ ../../libs/ 2>/dev/null
if [ -f dependency-graph.svg ]; then
    echo "✅ Visual dependency graph created: analysis/madge/dependency-graph.svg"
else
    echo "⚠️  Could not create visual graph (project might be too large)"
fi

echo ""
echo "📊 8. Generating DOT file"
echo "------------------------"
echo "Creating DOT file for custom visualization..."
npx madge --extensions ts,js --dot ../../apps/ ../../libs/ > dependency-graph.dot 2>/dev/null
if [ -f dependency-graph.dot ]; then
    echo "✅ DOT file created: analysis/madge/dependency-graph.dot"
else
    echo "⚠️  Could not create DOT file"
fi

echo ""
echo "📊 Analysis Complete!"
echo "===================="
echo "📁 All analysis files are saved in: analysis/madge/"
echo ""
echo "📋 Files created:"
echo "  • circular-deps-all.txt     - All circular dependencies"
echo "  • circular-deps-libs.txt    - Circular dependencies in libs"
echo "  • circular-deps-apps.txt    - Circular dependencies in apps"
echo "  • circular-deps-ec.txt      - Evolving Cognition circular deps"
echo "  • circular-deps-re.txt      - Real Estate circular deps"
echo "  • circular-deps-giga.txt    - Gigasoftware circular deps"
echo "  • orphaned-files.txt        - Files not imported anywhere"
echo "  • dependency-summary.txt    - Overall dependency statistics"
echo "  • dependency-graph.svg      - Visual dependency graph (if created)"
echo "  • dependency-graph.dot      - DOT format for custom visualization"
echo ""
echo "💡 Tip: You can also run individual commands using npm scripts:"
echo "   npm run madge:circular   - Check for circular dependencies"
echo "   npm run madge:orphans    - Find orphaned files"
echo "   npm run madge:summary    - Show dependency summary"
echo "   npm run madge:image      - Generate visual graph"
