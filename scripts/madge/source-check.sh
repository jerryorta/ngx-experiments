#!/bin/bash

# Source-only Circular Dependency Check
# This script checks for circular dependencies in source code only

echo "🔍 Source Code Circular Dependency Check"
echo "========================================"

echo ""
echo "Checking libraries..."
CIRCULAR_LIBS=$(npx madge --extensions ts --circular --no-spinner \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "spec.ts" \
  --exclude "test.ts" \
  --exclude "stories.ts" \
  --exclude "d.ts" \
  libs/)

if [ -n "$CIRCULAR_LIBS" ]; then
    echo "❌ Circular dependencies found in libraries:"
    echo "$CIRCULAR_LIBS"
    echo ""
else
    echo "✅ No circular dependencies found in libraries!"
fi

echo ""
echo "Checking source apps..."
CIRCULAR_APPS=$(npx madge --extensions ts --circular --no-spinner \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "build" \
  --exclude "android" \
  --exclude "ios" \
  --exclude "public" \
  --exclude "lib" \
  --exclude "www" \
  --exclude "functions" \
  --exclude "spec.ts" \
  --exclude "test.ts" \
  --exclude "stories.ts" \
  --exclude "d.ts" \
  apps/*/app/src apps/*/auth/src apps/*/marketing/src)

if [ -n "$CIRCULAR_APPS" ]; then
    echo "❌ Circular dependencies found in apps:"
    echo "$CIRCULAR_APPS"
    echo ""
else
    echo "✅ No circular dependencies found in apps!"
fi

# Check if any circular dependencies were found
if [ -n "$CIRCULAR_LIBS" ] || [ -n "$CIRCULAR_APPS" ]; then
    echo "💡 Run 'npm run madge:analyze' for detailed analysis"
    exit 1
else
    echo ""
    echo "🎉 All source code checks passed!"
fi
