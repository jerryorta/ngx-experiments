#!/bin/bash

# Quick Circular Dependency Check
# This script quickly checks for circular dependencies in the workspace

echo "🔍 Quick Circular Dependency Check"
echo "================================="

echo ""
echo "Checking apps/ and libs/ directories..."
CIRCULAR_ALL=$(npx madge --extensions ts,js --circular --no-spinner apps/ libs/)
if [ -n "$CIRCULAR_ALL" ]; then
    echo "❌ Circular dependencies found:"
    echo "$CIRCULAR_ALL"
    echo ""
    echo "💡 Run 'npm run madge:analyze' for detailed analysis"
    exit 1
else
    echo "✅ No circular dependencies found in the workspace!"
fi

echo ""
echo "🎉 All checks passed!"
