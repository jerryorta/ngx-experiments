---
name: create-chart-storybook
description: Generate the 3-subdirectory Storybook story set for a GigaChart chart type (usage, theming, interaction). Creates 12 files total with GigaStorybookReviewContainerComponent, factory-based configs, signal inputs for interaction controls, and code examples in usage stories. Use when creating chart stories, or when the user says "add chart stories", "create chart storybook", "write stories for [chart type]", or mentions stories for bar/line/bullet/grouped-bar/scatter/diverging-bar charts.
---

# Create Chart Storybook Stories

Generate the complete 3-subdirectory Storybook story set for a chart type. Each chart type gets **usage**, **theming**, and **interaction** subdirectories — 4 files each, 12 files total. This is different from the `/create-storybook` skill which creates a single 4-file story set for UI components.

## When to Use

- Creating stories for a new chart type (e.g., scatter chart, diverging bar chart)
- Adding the 3-story structure to a chart that only has partial coverage
- The user says "add chart stories", "create chart storybook", "write stories for [chart] chart"

## Phase 1: Identify the Chart Type

Parse `$ARGUMENTS` to determine the chart type. Common chart types:

| Chart Type | Preset Factory | Data Point Type |
|-----------|---------------|----------------|
| `bar-chart` | `createBarChartConfig()` | `GigaBarDataPoint` |
| `line-chart` | `createLineChartConfig()` | `GigaLineDataPoint` |
| `bullet-chart` | `createBulletChartConfig()` | `GigaBulletDataPoint` |
| `grouped-bar-chart` | `createGroupedBarChartConfig()` | `GigaGroupedBarDataPoint` |
| `scatter-chart` | `createScatterChartConfig()` | (check preset) |
| `diverging-bar-chart` | `createDivergingBarChartConfig()` | (check preset) |

1. **Find the preset** to understand the config API:
   ```
   Glob pattern: "libs/shared/charts/src/lib/presets/<chart-type>.preset.ts"
   ```
   Read it to identify: factory function name, data point type, available options (orientation, showLabels, tooltip, etc.)

2. **Find the config types** for the chart's layer:
   ```
   Glob pattern: "libs/shared/charts/src/lib/core/config.ts"
   ```
   Read to understand: data point interface, theme interface, config shape.

3. **Check for existing stories**:
   ```
   Glob pattern: "libs/shared/charts/src/lib/giga-chart/stories/<chart-type>/**/*"
   ```
   If all 3 subdirectories already exist, inform the user.

## Phase 2: Directory Structure

Stories live at:
```
libs/shared/charts/src/lib/giga-chart/stories/<chart-type>/
├── usage/
│   ├── <chart-type>-usage-stories.component.ts
│   ├── <chart-type>-usage-stories.component.html
│   ├── <chart-type>-usage-stories.component.scss
│   └── <chart-type>-usage.stories.ts
├── theming/
│   ├── <chart-type>-theming.component.ts           ← NOTE: no "-stories" suffix
│   ├── <chart-type>-theming.component.html
│   ├── <chart-type>-theming.component.scss
│   └── <chart-type>-theming.stories.ts
└── interaction/
    ├── <chart-type>-interaction-stories.component.ts
    ├── <chart-type>-interaction-stories.component.html
    ├── <chart-type>-interaction-stories.component.scss
    └── <chart-type>-interaction.stories.ts
```

**Naming rules:**
- Usage and interaction wrapper components: `<chart-type>-<subdir>-stories.component.*`
- Theming wrapper component: `<chart-type>-theming.component.*` (NO `-stories` suffix)
- All `.stories.ts` files: `<chart-type>-<subdir>.stories.ts`
- Class names follow the same pattern:
  - Usage: `<ChartType>UsageStoriesComponent`
  - Theming: `<ChartType>ThemingComponent` (NO "Stories" suffix)
  - Interaction: `<ChartType>InteractionStoriesComponent`

## Phase 3: Generate the 12 Files

### Subdirectory 1: Usage (4 files)

**Purpose:** Show multiple real-world examples with inline code blocks. No Storybook controls — this is a documentation-style story.

#### `<chart-type>-usage-stories.component.ts`

```typescript
import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { GigaStorybookReviewContainerComponent, REVIEW_STATUS } from '@gigasoftware/themes/storybook';

import type { <DataPointType> } from '../../../../core/config';
import type { GigaChartLayerClickEvent } from '../../../../core/layer';
import { <factoryFunction> } from '../../../../presets/<chart-type>.preset';
import { GigaChartComponent } from '../../../giga-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: '<chart-type>-usage-stories',
  },
  imports: [GigaChartComponent, GigaStorybookReviewContainerComponent],
  selector: '<chart-type>-usage-stories',
  standalone: true,
  styleUrl: './<chart-type>-usage-stories.component.scss',
  templateUrl: './<chart-type>-usage-stories.component.html',
})
export class <ChartType>UsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/giga-chart/stories/<chart-type>/usage';

  // EXAMPLE 1: Basic Usage
  basicData: <DataPointType>[] = [/* sample data */];
  basicConfig = <factoryFunction>({
    data: this.basicData,
    showLabels: true,
  });

  // EXAMPLE 2: Click Handling
  lastClicked = signal<string>('None');
  clickableConfig = <factoryFunction>({
    data: this.basicData,
    onClick: (event: GigaChartLayerClickEvent<<DataPointType>>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    showLabels: true,
  });

  // EXAMPLE 3: Dynamic Data with Signals
  dynamicData = signal<<DataPointType>[]>([/* data */]);
  dynamicConfig = computed(() =>
    <factoryFunction>({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    // Regenerate data with random values
  }

  // Add more examples as appropriate for the chart type
}
```

**Key rules for usage stories:**
- Include 5-9 numbered examples covering the chart's API surface
- Always include: basic usage, click handling, dynamic signals, and chart-specific features
- Use `signal()` and `computed()` for dynamic examples
- Import `GigaChartLayerClickEvent` for click handling examples
- Add additional Angular imports (CurrencyPipe, etc.) only when needed for formatting

#### `<chart-type>-usage-stories.component.html`

```html
<giga-storybook-review-container
  [reviewStatus]="reviewStatus"
  [storybookFilePath]="storybookFilePath"
>
<div class="stories-container">
  <h2><Chart Type> - Usage Examples</h2>
  <p class="intro-text">
    Practical examples showing common usage patterns for the <chart type>.
  </p>

  <!-- EXAMPLE 1: Basic Usage -->
  <section class="story-section">
    <h4>1. Basic Usage</h4>
    <p class="story-description">
      Simplest way to create a chart using <code><factoryFunction>()</code>
    </p>
    <div class="code-block">
      <pre>
data = [
  {{ '{' }} label: 'A', value: 30 {{ '}' }},
  // ...
];

config = <factoryFunction>({{ '{' }}
  data: this.data,
  showLabels: true,
{{ '}' }});

&lt;giga-chart [config]="config" /&gt;</pre>
    </div>
    <div class="chart-container">
      <giga-chart [config]="basicConfig" />
    </div>
  </section>

  <!-- More examples following the same section pattern -->
</div>
</giga-storybook-review-container>
```

**Template rules:**
- Use `{{ '{' }}` and `{{ '}' }}` for curly braces inside code blocks (Angular template escaping)
- Use `&lt;` and `&gt;` for angle brackets in code blocks
- Each section: `<h4>` numbered title, `<p class="story-description">`, optional `<div class="code-block">`, `<div class="chart-container">`
- For dynamic examples, add `<div class="interaction-row">` with buttons
- For click examples, add `<div class="interaction-display">` showing last clicked value

#### `<chart-type>-usage-stories.component.scss`

Copy the SCSS structure from an existing usage story. Key classes:
- `.stories-container` — max-width container
- `.story-section` — section with bottom border, `&--highlight` variant for recommended patterns
- `.code-block` / `pre` — dark background code display
- `.chart-container` — bordered chart area (height: 300px)
- `.interaction-display` — click feedback area
- `.interaction-row` / `.action-button` — button row for dynamic demos

**Reference:** Read `libs/shared/charts/src/lib/giga-chart/stories/bar-chart/usage/bar-chart-usage-stories.component.scss` and adapt.

#### `<chart-type>-usage.stories.ts`

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { <ChartType>UsageStoriesComponent } from './<chart-type>-usage-stories.component';

const meta: Meta<<ChartType>UsageStoriesComponent> = {
  component: <ChartType>UsageStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/GigaChart/<Chart Type Title>/Usage',
};

export default meta;
type Story = StoryObj<<ChartType>UsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
```

**Title format:** `'Charts/GigaChart/<Chart Type Title>/Usage'` — use title case with spaces (e.g., `Bar Chart`, `Grouped Bar Chart`).

---

### Subdirectory 2: Theming (4 files)

**Purpose:** Show multiple color scheme variations using `config.theme` overrides. No Storybook controls.

#### `<chart-type>-theming.component.ts`

```typescript
import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { GigaStorybookReviewContainerComponent, REVIEW_STATUS } from '@gigasoftware/themes/storybook';

import type { <DataPointType>, GigaChartConfig } from '../../../../core/config';
import { <factoryFunction> } from '../../../../presets/<chart-type>.preset';
import { GigaChartComponent } from '../../../giga-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: '<chart-type>-theming',
  },
  imports: [CommonModule, GigaChartComponent, GigaStorybookReviewContainerComponent],
  selector: '<chart-type>-theming',
  standalone: true,
  styleUrl: './<chart-type>-theming.component.scss',
  templateUrl: './<chart-type>-theming.component.html',
})
export class <ChartType>ThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/giga-chart/stories/<chart-type>/theming';

  sampleData: <DataPointType>[] = [/* sample data */];

  // Default theme (no overrides)
  defaultConfig = <factoryFunction>({
    data: this.sampleData,
    showLabels: true,
  });

  // Green theme
  greenConfig: GigaChartConfig = {
    ...<factoryFunction>({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      <layer-key>: {
        <element>: { color: '#4CAF50', hoverColor: '#81C784' },
      },
    },
  };

  // Additional themed configs...
}
```

**Key rules for theming:**
- Class name: `<ChartType>ThemingComponent` (NO "Stories" suffix)
- Selector: `<chart-type>-theming` (NO `-stories` suffix)
- Import `GigaChartConfig` type for explicit typing on themed configs
- Use spread operator: `{ ...<factoryFunction>({...}), theme: {...} }`
- Include: default, green, blue, red, purple/horizontal, custom axis, typography, statistical lines, tooltip positioning, multi-chart comparison
- The `theme` object structure varies by chart type — check the preset and config types

#### `<chart-type>-theming.component.html`

```html
<giga-storybook-review-container
  [reviewStatus]="reviewStatus"
  [storybookFilePath]="storybookFilePath"
>
<div class="stories-container">
  <h2><Chart Type> - Theming Examples</h2>

  <section class="story-section">
    <h4>Default Theme (Material Design)</h4>
    <p class="story-description">No theme provided - uses Material Design CSS variables</p>
    <div class="chart-container">
      <giga-chart [config]="defaultConfig" />
    </div>
  </section>

  <!-- More themed sections -->

  <!-- Highlight section: Multiple charts side by side -->
  <section class="story-section story-section--highlight">
    <h4>Multiple Charts with Different Themes</h4>
    <div class="chart-row">
      <div class="chart-column">
        <h5>Revenue (Blue)</h5>
        <div class="chart-container chart-container--small">
          <giga-chart [config]="blueConfig" />
        </div>
      </div>
      <!-- more columns -->
    </div>
  </section>
</div>
</giga-storybook-review-container>
```

**Template rules:**
- Simpler sections than usage — no code blocks, just description + chart
- Use `chart-row` / `chart-column` for side-by-side comparisons
- Use `story-section--highlight` for the multi-chart comparison section

#### `<chart-type>-theming.component.scss`

Similar to usage SCSS but add:
- `.chart-row` — flex row for side-by-side charts
- `.chart-column` — flex column for individual charts
- `.chart-container--small` — smaller height for comparison grids

**Reference:** Read `libs/shared/charts/src/lib/giga-chart/stories/bar-chart/theming/bar-chart-theming.component.scss` and adapt.

#### `<chart-type>-theming.stories.ts`

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { <ChartType>ThemingComponent } from './<chart-type>-theming.component';

const meta: Meta<<ChartType>ThemingComponent> = {
  component: <ChartType>ThemingComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/GigaChart/<Chart Type Title>/Theming',
};

export default meta;
type Story = StoryObj<<ChartType>ThemingComponent>;

export const Theming: Story = {
  args: {},
};
```

---

### Subdirectory 3: Interaction (4 files)

**Purpose:** Full Storybook controls via `input()` signals. Every configurable property becomes a control. The chart rebuilds via `computed()` when any control changes.

#### `<chart-type>-interaction-stories.component.ts`

```typescript
import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GigaStorybookReviewContainerComponent, REVIEW_STATUS } from '@gigasoftware/themes/storybook';

import type { <DataPointType>, GigaChartConfig } from '../../../../core/config';
import { <factoryFunction> } from '../../../../presets/<chart-type>.preset';
import { GigaChartComponent } from '../../../giga-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: '<chart-type>-interaction-stories',
  },
  imports: [CommonModule, GigaChartComponent, GigaStorybookReviewContainerComponent, MatButtonModule],
  selector: '<chart-type>-interaction-stories',
  standalone: true,
  styleUrl: './<chart-type>-interaction-stories.component.scss',
  templateUrl: './<chart-type>-interaction-stories.component.html',
})
export class <ChartType>InteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/giga-chart/stories/<chart-type>/interaction';

  // === Base config inputs ===
  marginTop = input<number>(20);
  marginRight = input<number>(10);
  marginBottom = input<number>(20);
  marginLeft = input<number>(10);

  // === Layer config inputs ===
  // Add inputs for every configurable property from the preset
  orientation = input<'vertical' | 'horizontal'>('vertical');
  showLabels = input<boolean>(true);
  showTooltip = input<boolean>(false);
  tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  // ... more layer-specific inputs

  // === Theme inputs ===
  barColor = input<string>('');
  barHoverColor = input<string>('');
  barRadius = input<number>(4);
  labelColor = input<string>('');
  labelFontSize = input<number>(12);
  // ... more theme inputs

  // Sample data as signal
  readonly sampleData = signal<<DataPointType>[]>([/* data */]);

  randomizeData(): void {
    // Regenerate random data
  }

  // Computed config rebuilds when ANY input changes
  config = computed<GigaChartConfig>(() => {
    const baseConfig = <factoryFunction>({
      data: this.sampleData(),
      orientation: this.orientation(),
      showLabels: this.showLabels(),
      // ... pass all layer inputs
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        // Build theme from input signals
        // Structure varies by chart type
      },
    };
  });
}
```

**Key rules for interaction:**
- Every configurable property is an `input()` signal (NOT `@Input()`)
- Use `computed()` to rebuild the full `GigaChartConfig` when any input changes
- Include `MatButtonModule` for the randomize button
- Empty string `''` for color inputs means "use default" — check with `|| undefined`
- Group inputs by concern: base margins, layer layout, layer visibility, layer tooltip, theme bar/line/bullet styling, theme label, theme axis, theme statistical

#### `<chart-type>-interaction-stories.component.html`

```html
<giga-storybook-review-container
  [reviewStatus]="reviewStatus"
  [storybookFilePath]="storybookFilePath"
>
  <div class="interaction-container">
    <div class="interaction-row">
      <button mat-raised-button color="primary" (click)="randomizeData()">
        Randomize Data
      </button>
    </div>
    <div class="chart-wrapper">
      <giga-chart [config]="config()" />
    </div>
  </div>
</giga-storybook-review-container>
```

The interaction template is intentionally minimal — all configuration comes from Storybook controls, not the template.

#### `<chart-type>-interaction-stories.component.scss`

Minimal — just layout for the container, button row, and chart wrapper. Use Tailwind or simple flex for spacing.

#### `<chart-type>-interaction.stories.ts`

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, type StoryObj } from '@storybook/angular';

import { <ChartType>InteractionStoriesComponent } from './<chart-type>-interaction-stories.component';

const meta: Meta<<ChartType>InteractionStoriesComponent> = {
  argTypes: {
    // === Base - Margins ===
    marginTop: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Top margin',
      table: { category: 'Base - Margins' },
    },
    marginRight: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Right margin',
      table: { category: 'Base - Margins' },
    },
    marginBottom: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Bottom margin',
      table: { category: 'Base - Margins' },
    },
    marginLeft: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Left margin',
      table: { category: 'Base - Margins' },
    },

    // === Layer - Layout ===
    orientation: {
      control: 'radio',
      description: 'Chart orientation',
      options: ['vertical', 'horizontal'],
      table: { category: 'Layer - Layout' },
    },

    // === Layer - Visibility ===
    showLabels: {
      control: 'boolean',
      description: 'Show value labels',
      table: { category: 'Layer - Visibility' },
    },
    // ... more controls organized by category

    // === Layer - Tooltip ===
    showTooltip: {
      control: 'boolean',
      description: 'Show tooltip on hover',
      table: { category: 'Layer - Tooltip' },
    },
    tooltipPosition: {
      control: 'radio',
      description: 'Tooltip position',
      if: { arg: 'showTooltip' },    // <-- conditional visibility
      options: ['above', 'below', 'follow-mouse'],
      table: { category: 'Layer - Tooltip' },
    },
    // ... more tooltip controls with `if: { arg: 'showTooltip' }`

    // === Theme - <Chart> Styling ===
    barColor: {
      control: 'color',
      description: 'Fill color',
      table: { category: 'Theme - Bar Styling' },
    },
    // ... more theme controls
  },
  component: <ChartType>InteractionStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideHttpClient(), provideAnimationsAsync()],
    }),
  ],
  title: 'Charts/GigaChart/<Chart Type Title>/Interaction',
};

export default meta;
type Story = StoryObj<<ChartType>InteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    // Default values for ALL controls
    marginTop: 20,
    marginRight: 45,
    marginBottom: 45,
    marginLeft: 45,
    orientation: 'vertical',
    showLabels: true,
    showTooltip: true,
    showXAxis: true,
    showYAxis: true,
    // ... all defaults
  },
};
```

**argTypes rules:**
- Every `input()` in the component gets an `argType` entry
- Organize by `table.category`: `'Base - Margins'`, `'Layer - Layout'`, `'Layer - Visibility'`, `'Layer - Tooltip'`, `'Layer - Axis Labels'`, `'Theme - <Chart> Styling'`, `'Theme - Label Styling'`, `'Theme - Axis Styling'`, `'Theme - Statistical Styling'`
- Use `if: { arg: 'showTooltip' }` for tooltip sub-controls (conditional visibility)
- Control types: `'range'` for numbers (with min/max/step), `'color'` for colors, `'boolean'` for toggles, `'radio'` for enums, `'text'` for strings
- Sort argTypes alphabetically within each category
- `args` must provide defaults for every `argType`

## Phase 4: Verify

1. **Check Storybook config** — Ensure the charts library is included in:
   - `apps/storybook-app/.storybook/main.ts` (story discovery)
   - `apps/storybook-app/.storybook/tsconfig.json` (TypeScript compilation)

   The charts library should already be configured. See `docs/reference/storybook.md` if not.

2. **Build check** — If Storybook is running, the new stories should appear under `Charts/GigaChart/<Chart Type Title>/` in the sidebar.

## Reference: Existing Chart Stories

When unsure about conventions, read an existing chart story as a reference:

| Chart Type | Path |
|-----------|------|
| Bar Chart | `libs/shared/charts/src/lib/giga-chart/stories/bar-chart/` |
| Line Chart | `libs/shared/charts/src/lib/giga-chart/stories/line-chart/` |
| Bullet Chart | `libs/shared/charts/src/lib/giga-chart/stories/bullet-chart/` |
| Grouped Bar Chart | `libs/shared/charts/src/lib/giga-chart/stories/grouped-bar-chart/` |
| Composite (flat) | `libs/shared/charts/src/lib/giga-chart/stories/composite/` |

**Presets:** `libs/shared/charts/src/lib/presets/`
**Config types:** `libs/shared/charts/src/lib/core/config.ts`
**Layer types:** `libs/shared/charts/src/lib/core/layer.ts`
