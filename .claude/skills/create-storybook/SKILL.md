---
name: create-storybook
description: Generate Storybook story files for an Angular component. Creates the 4-file story set (stories.ts, wrapper component .ts/.html/.scss) with GigaStorybookReviewContainerComponent, theme switching, and Storybook controls. Use when creating stories for new or existing components, or when the user says "add a story", "create storybook", or "write stories for".
---

# Create Storybook Story Files

Generate a complete Storybook story set for an Angular component. Every story uses the `GigaStorybookReviewContainerComponent` wrapper which provides theme switching, review status badges, and GitHub source links.

## When to Use

- Creating stories for a new component
- Adding story coverage to an existing component that lacks stories
- The user says "add a story", "create storybook", "write stories for [component]"

## Phase 1: Identify the Target Component

Parse `$ARGUMENTS` to determine:
1. **Component path** — if a full path is given, use it directly
2. **Component name** — if only a name is given, search for it:
   ```
   Glob pattern: "**/<component-name>/<component-name>.component.ts"
   ```

Read the component's `.ts`, `.html`, and `.scss` files to understand:
- The selector (e.g., `dlc-input-code`)
- Signal inputs (`input()`, `input.required()`)
- Legacy inputs (`@Input()`)
- Outputs (`output()`)
- Imports (what Angular Material / other components it uses)
- Any required providers (Store, services, etc.)

## Phase 2: Determine the Story Directory

Stories live in a `stories/` subdirectory alongside (or near) the component:

```
libs/<domain>/<lib>/src/lib/components/<feature>/
├── <component>/
│   ├── <component>.component.ts
│   ├── <component>.component.html
│   └── <component>.component.scss
└── stories/
    └── <story-name>/
        ├── <story-name>.stories.ts
        ├── <story-name>-stories.component.ts
        ├── <story-name>-stories.component.html
        └── <story-name>-stories.component.scss
```

Look for an existing `stories/` directory near the component. If none exists, create one.

The `<story-name>` is typically the component name without the prefix (e.g., `dlc-input-code` → `input-code`).

## Phase 3: Generate the 4 Files

### File 1: Wrapper Component TypeScript (`<story-name>-stories.component.ts`)

```typescript
import { Component, ViewEncapsulation } from '@angular/core';
import {
  GigaStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@gigasoftware/themes/storybook';
// Import the component under review
import { TargetComponent } from '../../path-to-component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: '<story-name>-stories',
  },
  imports: [
    GigaStorybookReviewContainerComponent,
    TargetComponent,
    // Add any other required imports (CommonModule, Material modules, etc.)
  ],
  selector: '<story-name>-stories',
  standalone: true,
  styleUrl: './<story-name>-stories.component.scss',
  templateUrl: './<story-name>-stories.component.html',
})
export class <StoryName>StoriesComponent {
  // Path used for GitHub source link in the footer
  storybookFilePath = 'libs/<domain>/<lib>/src/lib/components/<feature>/stories/<story-name>';

  // Review status badge — use DRAFT for new stories
  reviewStatus = REVIEW_STATUS.DRAFT;

  // Component state — use signals for internal state
  // Map @Input() properties from the target component to controls here
}
```

**Key rules:**
- `ViewEncapsulation.None` — required for UI design library stories
- `host.class` must match the selector
- `storybookFilePath` — relative path from repo root (without leading `/`)
- `reviewStatus` — start with `DRAFT` for new stories
- Import the actual component being tested

### File 2: Wrapper Component Template (`<story-name>-stories.component.html`)

```html
<giga-storybook-review-container
  [reviewStatus]="reviewStatus"
  [storybookFilePath]="storybookFilePath"
>
  <!-- Section headings describe each example -->
  <h4>Default</h4>
  <target-component></target-component>

  <!-- Add more sections showing different configurations -->
  <h4>With Options</h4>
  <target-component [someInput]="someValue"></target-component>
</giga-storybook-review-container>
```

**Template guidelines:**
- Always wrap in `<giga-storybook-review-container>`
- Pass `[reviewStatus]` and `[storybookFilePath]`
- Use `<h4>` tags to label different examples/sections
- Show multiple configurations of the component (default, with options, disabled, error state, etc.)
- Use Tailwind for layout (`flex`, `gap`, `grid`)
- For signal values, invoke the getter: `{{ mySig() }}`

### File 3: Wrapper Component Styles (`<story-name>-stories.component.scss`)

```scss
.<story-name>-stories {
  // Add minimal styles for story layout
  // Most styling should use Tailwind in the template
}
```

Keep this minimal — use Tailwind in the template for layout. Only add SCSS for things Tailwind can't handle.

### File 4: Stories Configuration (`<story-name>.stories.ts`)

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { <StoryName>StoriesComponent } from './<story-name>-stories.component';

const meta: Meta<<StoryName>StoriesComponent> = {
  component: <StoryName>StoriesComponent,
  title: '<Story Title>',
  decorators: [
    applicationConfig({
      providers: [
        provideHttpClient(),
        provideAnimationsAsync(),
        // Add NgRx store, services, etc. if the component needs them
      ],
    }),
  ],
  argTypes: {
    // Map component inputs to Storybook controls
    // Example:
    // color: {
    //   control: { type: 'select' },
    //   options: ['primary', 'accent', 'warn'],
    // },
    // disabled: {
    //   control: { type: 'boolean' },
    // },
  },
};

export default meta;
type Story = StoryObj<<StoryName>StoriesComponent>;

export const Default: Story = {
  args: {
    // Default values for controls
  },
};
```

**Stories file rules:**
- `title` controls Storybook sidebar navigation — use a short descriptive name
- `decorators` with `applicationConfig()` provides Angular DI context
- Always include `provideHttpClient()` and `provideAnimationsAsync()`
- Add `provideStore()` if the component uses NgRx
- `argTypes` maps wrapper component properties to Storybook controls
- Export at least one story (`Default`)

### Storybook Control Types

| Input type | argType control |
|-----------|----------------|
| `boolean` | `{ control: { type: 'boolean' } }` |
| `string` | `{ control: { type: 'text' } }` |
| `number` | `{ control: { type: 'number' } }` |
| `enum/union` | `{ control: { type: 'select' }, options: [...] }` |
| `color` | `{ control: { type: 'color' } }` |

## Phase 4: Verify

1. **Check Storybook config** — Ensure the library's stories are included in:
   - `apps/storybook-app/.storybook/main.ts` (story discovery)
   - `apps/storybook-app/.storybook/tsconfig.json` (TypeScript compilation)

   See `docs/reference/storybook.md` for how to add a new library.

2. **Build check** — If Storybook is running, the new story should appear automatically via HMR.

## Reference: Existing Story Patterns

When unsure about conventions, read an existing story as a reference:

| Component | Path |
|-----------|------|
| Input | `libs/shared/ui-design-library/src/lib/components/input/stories/input/` |
| Input Code | `libs/shared/ui-design-library/src/lib/components/input/stories/input-code/` |
| Button | `libs/shared/ui-design-library/src/lib/components/button/stories/buttons/` |
| Autocomplete | `libs/shared/ui-design-library/src/lib/components/autocomplete/stories/` |
| Charts | `libs/shared/charts/src/lib/giga-chart/stories/` |
