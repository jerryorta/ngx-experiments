---
name: mw-brand-guidelines
description: Apply Media Workbench brand guidelines to Angular components and UI. Use when building or styling components for the Media Workbench desktop app — enforces the Signal Monitor dark theme, color tokens, typography, and Tailwind conventions. Invoke with /mw-brand-guidelines.
---

# Media Workbench Brand Guidelines — "Signal Monitor"

## Application Context

- **App**: Media Workbench — a Tauri desktop app for audio/video ingestion and processing
- **Stack**: Angular 21, Tailwind CSS, custom CSS variables (`--mw-*`), SCSS. No Angular Material.
- **Aesthetic Direction**: **Signal Monitor** — inspired by professional audio/video hardware (VU meters, oscilloscopes, studio rack units). Precision instrument, not consumer product.
- **Audience**: Power users processing media files. Clarity and density over decoration.

## Design Principles

1. **Instrument, not app** — UI reads like hardware panel output: monospace, uppercase labels, sharp edges
2. **Signal teal only for active states** — the primary color `#00e5b0` is reserved; don't use it decoratively
3. **Maximum density** — compact rows, tight spacing, minimal chrome
4. **Sharp corners everywhere** — `--mw-radius-*` are all 2px. No soft cards.
5. **Purposeful motion** — 120ms transitions only; state communication, not personality

## Color Tokens (`--mw-*` CSS variables)

Defined in `libs/media-workbench/themes/src/lib/styles/mw/_mw-dark.scss`:

| Token                         | Value                  | Usage                             |
| ----------------------------- | ---------------------- | --------------------------------- |
| `--mw-surface`                | `#090b0d`              | Page background — near-black cool |
| `--mw-surface-container-low`  | `#0f1214`              | Toolbar bg                        |
| `--mw-surface-container`      | `#131619`              | Cards, file list rows             |
| `--mw-surface-container-high` | `#1a1f24`              | Track fills, elevated surfaces    |
| `--mw-on-surface`             | `#d4dae0`              | Primary text — cool white         |
| `--mw-on-surface-variant`     | `#5c6570`              | Muted text, icons, labels         |
| `--mw-primary`                | `#00e5b0`              | Signal teal — active/primary ONLY |
| `--mw-primary-container`      | `rgba(0,229,176,0.12)` | Hover fills on primary targets    |
| `--mw-on-primary`             | `#090b0d`              | Text on primary-colored surfaces  |
| `--mw-error`                  | `#ff4d4d`              | Signal red                        |
| `--mw-success`                | `#00e5b0`              | Same teal as primary              |
| `--mw-warning`                | `#ffb340`              | Amber caution                     |
| `--mw-outline`                | `#2a2f35`              | Borders, dividers                 |
| `--mw-outline-variant`        | `#1e2328`              | Subtle separators                 |

**Flash-prevention background**: `#090b0d` (in `index.html` inline `<style>`)

## Typography

- **App font**: IBM Plex Mono — loaded via Google Fonts in `index.html`
- **Base size**: 13px, `letter-spacing: 0.01em`
- **Labels/chips/toolbar**: 10–11px, `letter-spacing: 0.08–0.12em`, `text-transform: uppercase`
- **Filenames**: 12px, medium weight
- **Metadata**: 11px, `color: var(--mw-on-surface-variant)`
- **Do not mix typefaces** — monospace everywhere reinforces the instrument aesthetic

## Shape & Motion

- **All border-radius**: 2px (`--mw-radius-sm/md/lg` are all 2px)
- **Transitions**: 120ms — fast, mechanical feel
- **Progress bars**: 2px height, no border-radius, VU meter style
- **Scrollbar**: 4px, no border-radius, transparent track

## Component Conventions (Angular)

- Separate `.ts` / `.html` / `.scss` / `.spec.ts` files — never inline templates or styles
- `ViewEncapsulation.None` + `host: { class: 'mw-component-name' }` for library components (`libs/media-workbench/ui/`)
- SCSS: wrap in `.mw-component-name { }`, never `:host`
- App components (`apps/media-workbench/app/`): default encapsulation, use `:host { }`
- Use `input()` / `output()` signals — never `@Input()` / `@Output()`
- Use `inject()` — never constructor injection
- Angular control flow: `@if`, `@for` — never `*ngIf` / `*ngFor`

## Styling Approach

- **Tailwind first** — put all layout, spacing, sizing, typography, and colors directly on HTML elements as Tailwind utility classes
- **`--mw-*` tokens via CSS variable syntax**: `text-(--mw-on-surface)`, `bg-(--mw-surface-container)`, `border-(--mw-outline)`, `hover:text-(--mw-primary)`, `focus:border-(--mw-primary)`
- **SCSS is minimal** — only keep `.mw-component-name { }` if rules remain; use SCSS only for:
  - `::placeholder`, `::before`, `::after` pseudo-elements
  - `:focus-within` (or use Tailwind `focus-within:` variant)
  - Nested child selectors that can't be expressed as flat Tailwind (e.g., `.material-symbols-outlined { font-size: 14px; }`)
  - CSS custom property override definitions
- **Never hardcode colors** — always use `--mw-*` tokens
- **Borders**: `border border-(--mw-outline)` — crisp lines over shadows

### Token → Tailwind Quick Reference

| CSS                                                                 | Tailwind                                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `color: var(--mw-on-surface)`                                       | `text-(--mw-on-surface)`                                                  |
| `background: var(--mw-surface-container)`                           | `bg-(--mw-surface-container)`                                             |
| `border-color: var(--mw-outline)`                                   | `border-(--mw-outline)`                                                   |
| `font-family: var(--mw-font-family)`                                | `font-[family-name:var(--mw-font-family)]`                                |
| `font-weight: var(--mw-font-weight-medium)`                         | `font-[var(--mw-font-weight-medium)]`                                     |
| `border-radius: var(--mw-radius-sm)`                                | `rounded-[var(--mw-radius-sm)]`                                           |
| `transition: color 120ms ease`                                      | `transition-[color] duration-[var(--mw-transition-duration)] ease-[ease]` |
| `font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase` | `text-[10px] tracking-[0.1em] uppercase`                                  |

## UI Patterns

- **Drop zone**: 1px dashed `--mw-outline` border, hover uses `--mw-primary-container` fill + teal border
- **File list rows**: `--mw-surface-container` bg, 1px `--mw-outline-variant` border, 2px progress bar
- **Job status**: compact row with monospace ID, chip indicator, file count right-aligned
- **Chips**: uppercase, 10px, bordered LED style. Variants: default (muted), primary (teal), success (teal), error (red)
- **Buttons**: uppercase, 11px, 28px height, 2px radius. Raised = solid teal bg.
- **Toolbar**: 40px, uppercase app name in `--mw-on-surface-variant`, 1px bottom border only

## What to Avoid

- Any `border-radius` > 2px
- Soft drop shadows (`box-shadow`) for depth — use borders instead
- Font sizes > 14px in UI (toolbar, labels, chips, metadata)
- Decorative use of the teal primary — only for active/primary action states
- Inter, Roboto, system-ui, or any sans-serif font
- `--mat-sys-*` tokens (Angular Material was removed)
- Inline `template` or `styles` in Angular components
