---
applyTo: '**'
---

# Angular File Rename Instructions

This instruction provides a standardized procedure for renaming Angular component, pipe, directive, service, and other TypeScript files while updating all references throughout the workspace.

## Usage

To rename Angular files, use commands like:

### Component Renaming

```
rename component delete-task-goal-dialogue to delete-goal-dialogue
rename component user-profile-card remove "user"
rename component src/app/features/task-management remove "task"
```

### Service/Pipe/Directive Renaming

```
rename service auth-user-service to auth-service
rename pipe format-task-date-pipe remove "task"
rename directive highlight-task-directive remove "task"
```

### Pattern-Based Renaming

```
rename files in libs/ui/components remove "legacy"
rename all files matching "*-task-*" remove "task"
```

## Procedure

Follow this exact sequence for each file rename operation:

### 1. Identify Files to Rename

- Scan the specified directory/path for matching files
- Include all related files:
  - `.ts` (component/service/pipe/directive)
  - `.html` (template files)
  - `.scss/.css` (style files)
  - `.spec.ts` (test files)
  - `.stories.ts` (Storybook files if present)

### 2. Find All References

Before renaming, search for all import statements and file references:

```bash
# Search for imports of the file
grep -r "from './old-file-name" --include="*.ts"
grep -r "import.*old-file-name" --include="*.ts"
```

### 3. Rename Files

Rename files using the terminal `mv` command:

```bash
mv old-file-name.component.ts new-file-name.component.ts
mv old-file-name.component.html new-file-name.component.html
mv old-file-name.component.scss new-file-name.component.scss
mv old-file-name.component.spec.ts new-file-name.component.spec.ts
```

### 4. Update Internal File References

Update references within the renamed files themselves:

#### Component Files

- Update `styleUrl` and `templateUrl` paths
- Update any relative imports within the file

#### Test Files

- Update import statements to point to renamed files

#### Storybook Files

- Update component imports

### 5. Update External References

Update all files that import or reference the renamed files:

#### Import Statements

```typescript
// Before
import { OldComponent } from './path/old-file-name.component';

// After
import { OldComponent } from './path/new-file-name.component';
```

#### Type Imports

```typescript
// Before
import type { OldInterface } from './old-file-name.component';

// After
import type { OldInterface } from './new-file-name.component';
```

### 6. Verify No Errors

Check for compilation errors in all affected files:

- Use the `get_errors` tool to validate changes
- Fix any broken references or imports

## Important Guidelines

### What to Rename

- **File names only** - rename the actual files
- **File path references** - update styleUrl, templateUrl, imports
- **NOT class names** - keep component/service/pipe class names unchanged
- **NOT selectors** - keep component selectors unchanged unless specifically requested
- **NOT interfaces** - keep interface names unchanged unless specifically requested

### Naming Patterns

#### Components

- `old-component-name.component.ts` → `new-component-name.component.ts`
- `old-component-name.component.html` → `new-component-name.component.html`
- `old-component-name.component.scss` → `new-component-name.component.scss`
- `old-component-name.component.spec.ts` → `new-component-name.component.spec.ts`

#### Services

- `old-service-name.service.ts` → `new-service-name.service.ts`
- `old-service-name.service.spec.ts` → `new-service-name.service.spec.ts`

#### Pipes

- `old-pipe-name.pipe.ts` → `new-pipe-name.pipe.ts`
- `old-pipe-name.pipe.spec.ts` → `new-pipe-name.pipe.spec.ts`

#### Directives

- `old-directive-name.directive.ts` → `new-directive-name.directive.ts`
- `old-directive-name.directive.spec.ts` → `new-directive-name.directive.spec.ts`

### Pattern Matching Rules

When using "remove" or "replace" patterns:

#### Remove Pattern

```
remove "task" from delete-task-goal-dialogue
Result: delete-goal-dialogue
```

#### Replace Pattern

```
replace "legacy" with "modern" in legacy-user-component
Result: modern-user-component
```

#### Prefix/Suffix Operations

```
add prefix "dlc" to user-profile → dlc-user-profile
remove suffix "widget" from chart-widget → chart
```

## Error Handling

### If File Rename Fails

1. Check file permissions
2. Verify file exists
3. Check if file is currently open/locked
4. Try closing VS Code and reopening

### If Import Updates Fail

1. Search for additional references using different patterns
2. Check for dynamic imports or string-based references
3. Look for references in configuration files

### If Compilation Errors Occur

1. Run TypeScript compilation to see specific errors
2. Check for missing imports
3. Verify all path references are correct
4. Look for circular dependencies

## Directory Structure Considerations

### Nx Workspace

- Respect Nx project boundaries
- Update any project.json references if needed
- Consider impact on import paths between libs

### Angular Standalone Components

- Update imports in bootstrap files
- Check route configurations
- Verify lazy-loaded module references

### Barrel Exports

- Update index.ts files that re-export renamed components
- Check public-api.ts files in libraries

## Examples

### Example 1: Remove Word from Component

```
Input: rename component delete-task-goal-dialogue remove "task"

Steps:
1. delete-task-goal-dialogue.component.ts → delete-goal-dialogue.component.ts
2. delete-task-goal-dialogue.component.html → delete-goal-dialogue.component.html
3. delete-task-goal-dialogue.component.scss → delete-goal-dialogue.component.scss
4. delete-task-goal-dialogue.component.spec.ts → delete-goal-dialogue.component.spec.ts
5. Update styleUrl: './delete-goal-dialogue.component.scss'
6. Update templateUrl: './delete-goal-dialogue.component.html'
7. Update all import statements referencing the old file names
```

### Example 2: Replace Word in Service

```
Input: rename service user-auth-service replace "user-auth" with "authentication"

Steps:
1. user-auth-service.service.ts → authentication-service.service.ts
2. user-auth-service.service.spec.ts → authentication-service.service.spec.ts
3. Update all imports from './user-auth-service.service' to './authentication-service.service'
```

### Example 3: Directory-Wide Renaming

```
Input: rename all files in src/components/legacy remove "legacy"

Steps:
1. Find all files matching pattern in directory
2. For each file, apply rename pattern
3. Update all cross-references between renamed files
4. Update external imports
```

## Success Validation

After completing the rename operation:

1. **No Compilation Errors**: All TypeScript files compile successfully
2. **No Missing Imports**: All import statements resolve correctly
3. **Tests Pass**: Unit tests run without import errors
4. **Storybook Works**: Stories load correctly if present
5. **Runtime Success**: Application runs without module resolution errors

## Integration Notes

- Works with Nx 21.1.3 workspace structure
- Compatible with Angular standalone components
- Supports Angular Material components
- Handles TypeScript strict mode
- Preserves existing code style and formatting
- Maintains git history (files are moved, not deleted/recreated)

## Tool Usage

This instruction integrates with existing workspace tools:

- Uses `run_in_terminal` for file operations
- Uses `replace_string_in_file` for updating references
- Uses `get_errors` for validation
- Uses `grep_search` for finding references
- Uses `semantic_search` for comprehensive reference discovery
