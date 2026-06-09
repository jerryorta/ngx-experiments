# Madge Dependency Analysis

This directory contains tools and scripts for analyzing module dependencies in the Gigasoftware workspace using [madge](https://github.com/pahen/madge).

## Quick Start

### Basic Commands

```bash
# Quick circular dependency check
npm run madge:check

# Find circular dependencies
npm run madge:circular

# Find orphaned files
npm run madge:orphans

# Generate dependency summary
npm run madge:summary

# Generate visual dependency graph
npm run madge:image

# Comprehensive analysis
npm run madge:analyze
```

### Project-Specific Analysis

```bash
# Analyze specific parts of the workspace
npm run madge:libs    # Libraries only
npm run madge:apps    # All apps
npm run madge:ec      # Evolving Cognition app
npm run madge:re      # Real Estate app
npm run madge:giga    # Gigasoftware marketing app
```

## Detailed Analysis

### Comprehensive Analysis Script

Run the comprehensive analysis to get detailed reports:

```bash
npm run madge:analyze
```

This will create an `analysis/madge/` directory with detailed reports:

- **circular-deps-all.txt** - All circular dependencies in the workspace
- **circular-deps-libs.txt** - Circular dependencies in libraries
- **circular-deps-apps.txt** - Circular dependencies in apps
- **circular-deps-ec.txt** - Evolving Cognition specific issues
- **circular-deps-re.txt** - Real Estate specific issues
- **circular-deps-giga.txt** - Gigasoftware marketing specific issues
- **orphaned-files.txt** - Files not imported anywhere
- **dependency-summary.txt** - Overall statistics
- **dependency-graph.svg** - Visual dependency graph
- **dependency-graph.dot** - DOT format for custom visualization

### Manual Commands

You can also run madge directly with custom options:

```bash
# Check specific directory
npx madge --extensions ts,js --circular libs/ui/

# Generate image for specific app
npx madge --extensions ts,js --image ec-deps.svg apps/evolving-cognition/

# Get JSON output
npx madge --extensions ts,js --json apps/real-estate/

# Exclude specific patterns
npx madge --extensions ts,js --exclude "**/test/**" --circular .
```

## Configuration

Madge is configured via `.madgerc` in the workspace root:

```json
{
  "detective": {
    "ts": {
      "skipTypeImports": true
    }
  },
  "exclude": [
    "node_modules/**",
    "dist/**",
    "tmp/**",
    ".angular/**",
    ".nx/**",
    "**/*.spec.ts",
    "**/*.test.ts",
    "**/*.stories.ts",
    "**/*.d.ts"
  ],
  "fileExtensions": ["ts", "js"],
  "includeNpm": false,
  "tsConfig": "./tsconfig.base.json"
}
```

## Common Use Cases

### 1. Pre-commit Hook

Add circular dependency check to your pre-commit workflow:

```bash
# In pre-commit hook
npm run madge:check
```

### 2. CI/CD Integration

Add to your CI pipeline to catch dependency issues:

```bash
# In CI script
npm run madge:check || exit 1
```

### 3. Refactoring Assistance

Before major refactoring, generate dependency graphs:

```bash
# Generate before refactoring
npm run madge:image
mv deps.svg before-refactor.svg

# After refactoring
npm run madge:image
mv deps.svg after-refactor.svg
```

### 4. Code Review

Use for code reviews to understand impact:

```bash
# Check what files depend on a specific file
npx madge --extensions ts,js --depends src/app/core/services/auth.service.ts .

# Check what a file depends on
npx madge --extensions ts,js --json . | jq '.["src/app/core/services/auth.service.ts"]'
```

## Troubleshooting

### Common Issues

1. **Large SVG files**: For large projects, the SVG generation might fail or create huge files. Use DOT format instead:

   ```bash
   npm run madge:dot
   # Then use Graphviz to render: dot -Tsvg deps.dot -o deps.svg
   ```

2. **TypeScript resolution errors**: Make sure `tsconfig.base.json` paths are correctly configured in `.madgerc`

3. **Memory issues**: For very large projects, you might need to analyze smaller chunks:
   ```bash
   npx madge --extensions ts,js libs/specific-lib/
   ```

### Getting Help

- Run `npx madge --help` for all options
- Check the [madge documentation](https://github.com/pahen/madge)
- Use `npm run madge:summary` to understand your project structure

## Best Practices

1. **Regular Checks**: Run `npm run madge:check` regularly during development
2. **Clean Architecture**: Use the dependency graphs to maintain clean separation between layers
3. **Nx Boundaries**: Combine with Nx's module boundary rules for better architecture
4. **Documentation**: Keep dependency graphs updated in your documentation
5. **Refactoring**: Use before/after graphs to validate refactoring improvements
