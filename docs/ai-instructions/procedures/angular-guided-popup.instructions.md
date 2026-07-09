---
applyTo: '**'
---

# Angular Guided Popup Instructions

Standardized procedure for adding guided popups to Angular components using the `dlc-guided-popup` component from the UI Design Library.

## Overview

The `dlc-guided-popup` component provides a tooltip-style popup that points to a specific element to guide users. It uses CDK Overlay for positioning and includes animations, close functionality, and content projection.

## Usage Keywords

```
add guided popup to [element]
create guided popup for [component]
add tooltip guide to [selector]
```

## Component API

### Inputs

| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `origin` | `CdkOverlayOrigin` | **required** | The element the popup points to |
| `open` | `boolean` | `false` | Controls popup visibility |
| `title` | `string` | `''` | Header title text |
| `description` | `string` | `''` | Description paragraph below title |
| `position` | `'above' \| 'below' \| 'left' \| 'right'` | `'below'` | Arrow/popup position relative to origin |

### Outputs

| Output | Type | Description |
|--------|------|-------------|
| `closed` | `void` | Emitted when user closes the popup |

### Content Projection

| Slot | Description |
|------|-------------|
| Default | Additional content below description |
| `[dlc-guided-popup-actions]` | Action buttons at the bottom |

## Implementation Procedure

### Step 1: Import Required Modules

**In the component TypeScript file:**

```typescript
import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import { DlcGuidedPopupComponent } from '@gigasoftware/shared/ui-design-library-deprecated';
// OR for relative imports within ui-design-library-deprecated:
import { DlcGuidedPopupComponent } from '../../popup/dlc-guided-popup/dlc-guided-popup.component';
```

**Add to component imports array:**

```typescript
@Component({
  imports: [
    CdkOverlayOrigin,
    DlcGuidedPopupComponent,
    // ... other imports
  ],
})
```

### Step 2: Add CdkOverlayOrigin to Target Element

Add the `cdkOverlayOrigin` directive and a template reference to the element you want the popup to point to:

```html
<div
  class="target-element"
  cdkOverlayOrigin
  #myElementOrigin="cdkOverlayOrigin"
>
  <!-- Element content -->
</div>
```

### Step 3: Add the Guided Popup Component

Place the `<dlc-guided-popup>` inside or near the target element:

```html
<div
  class="target-element"
  cdkOverlayOrigin
  #myElementOrigin="cdkOverlayOrigin"
>
  <!-- Element content -->

  <dlc-guided-popup
    [origin]="myElementOrigin"
    [open]="showGuide()"
    title="Popup Title"
    description="Main description text explaining the feature."
    position="below"
    (closed)="dismissGuide()"
  >
    <p class="text-sm opacity-75">Additional helper text.</p>
  </dlc-guided-popup>
</div>
```

### Step 4: Add Signal and Dismiss Method

**Add signal to control popup visibility:**

```typescript
// Signal to control popup visibility
showGuide = signal<boolean>(true); // true = show on load
```

**Add dismiss method:**

```typescript
dismissGuide(): void {
  this.showGuide.set(false);
}
```

### Step 5: Close on User Action (Optional)

Close the popup when the user completes the guided action:

```typescript
onUserAction(): void {
  // Close the guide popup
  this.showGuide.set(false);

  // Perform the action
  // ...
}
```

## Complete Example

### TypeScript

```typescript
import { CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { DlcGuidedPopupComponent } from '@gigasoftware/shared/ui-design-library-deprecated';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'my-component' },
  imports: [
    CdkOverlayOrigin,
    DlcGuidedPopupComponent,
    // ... other imports
  ],
  selector: 'app-my-component',
  templateUrl: './my-component.component.html',
})
export class MyComponent {
  // Guided popup state - true to show on component load
  showSelectorGuide = signal<boolean>(true);

  // Dismiss the guide popup
  dismissSelectorGuide(): void {
    this.showSelectorGuide.set(false);
  }

  // Close popup when user makes a selection
  onItemSelected(item: string): void {
    // Close the guide popup
    this.showSelectorGuide.set(false);

    // Handle the selection
    this.processSelection(item);
  }
}
```

### HTML Template

```html
<div class="my-component-container">
  <!-- Target element with overlay origin -->
  <div
    class="selector-wrapper"
    cdkOverlayOrigin
    #selectorOrigin="cdkOverlayOrigin"
  >
    <mat-form-field>
      <mat-label>Select an option</mat-label>
      <mat-select (selectionChange)="onItemSelected($event.value)">
        <mat-option value="option1">Option 1</mat-option>
        <mat-option value="option2">Option 2</mat-option>
      </mat-select>
    </mat-form-field>

    <!-- Guided popup -->
    <dlc-guided-popup
      [origin]="selectorOrigin"
      [open]="showSelectorGuide()"
      title="Select an Option"
      description="Choose an option from the dropdown to get started with your configuration."
      position="below"
      (closed)="dismissSelectorGuide()"
    >
      <p class="text-sm opacity-75">You can change this selection later.</p>
    </dlc-guided-popup>
  </div>
</div>
```

## Position Options

| Position | Description | Use Case |
|----------|-------------|----------|
| `below` | Popup appears below element, arrow points up | Default, dropdowns, form fields |
| `above` | Popup appears above element, arrow points down | Elements near bottom of viewport |
| `left` | Popup appears left of element, arrow points right | Sidebar elements, right-aligned items |
| `right` | Popup appears right of element, arrow points left | Left sidebar elements |

## With Action Buttons

```html
<dlc-guided-popup
  [origin]="myOrigin"
  [open]="showGuide()"
  title="Welcome!"
  description="Let's get you started."
  position="below"
  (closed)="dismissGuide()"
>
  <p class="text-sm opacity-75">Click 'Got it' to continue.</p>

  <div dlc-guided-popup-actions>
    <button mat-button (click)="dismissGuide()">Got it</button>
    <button mat-raised-button color="primary" (click)="startTour()">Take Tour</button>
  </div>
</dlc-guided-popup>
```

## Validation Checklist

- [ ] `CdkOverlayOrigin` imported from `@angular/cdk/overlay`
- [ ] `DlcGuidedPopupComponent` imported
- [ ] Both added to component `imports` array
- [ ] `cdkOverlayOrigin` directive added to target element
- [ ] Template reference created (e.g., `#myOrigin="cdkOverlayOrigin"`)
- [ ] Signal created for popup visibility state
- [ ] Dismiss method implemented
- [ ] `[origin]` bound to template reference
- [ ] `[open]` bound to signal
- [ ] `(closed)` bound to dismiss method
- [ ] Popup closes on relevant user actions

## Common Patterns

### Show Only Once (Using Local Storage)

```typescript
private readonly GUIDE_SHOWN_KEY = 'my-guide-shown';

showGuide = signal<boolean>(!localStorage.getItem(this.GUIDE_SHOWN_KEY));

dismissGuide(): void {
  this.showGuide.set(false);
  localStorage.setItem(this.GUIDE_SHOWN_KEY, 'true');
}
```

### Show Conditionally

```typescript
// Only show guide when there are items to select
showGuide = computed(() => this.items().length > 0 && !this.hasSelectedItem());
```

### Multiple Guided Popups (Tour)

```typescript
currentStep = signal<number>(1);

showStep1Guide = computed(() => this.currentStep() === 1);
showStep2Guide = computed(() => this.currentStep() === 2);

nextStep(): void {
  this.currentStep.update(step => step + 1);
}

dismissTour(): void {
  this.currentStep.set(0); // 0 = tour complete
}
```

## Reference Files

- Component: `libs/shared/ui-design-library-deprecated/src/lib/components/popup/dlc-guided-popup/dlc-guided-popup.component.ts`
- Example Usage: `libs/shared/ui-design-library-deprecated/src/lib/components/google/mls-property-search/dlc-mls-property-search.component.html` (lines 63-74)
- Example Usage: `libs/shared/ui-design-library-deprecated/src/lib/components/workspace/workspace-config-ui/workspace-config-ui.component.html`
