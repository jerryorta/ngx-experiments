import type { ThemeConfig } from '@nge/storybook';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { DlcIconDirective } from '@nge/ui-design-library';

/** Strips the shared personas' `'CG '` source prefix for a cleaner label, e.g. 'CG Professional Dark' → 'Professional Dark'. */
function formatThemeName(name: string): string {
  return name.startsWith('CG ') ? name.slice(3) : name;
}

/** One `ThemeConfig` plus everything the template needs to render + label its swatch. */
interface LdgThemeOption {
  displayName: string;
  isActive: boolean;
  theme: ThemeConfig;
}

/**
 * Persona theme picker — the demo's flagship "prove the token architecture"
 * piece. Renders one swatch per `ThemeConfig`, and each swatch carries THAT
 * theme's own `cssClass` (see the template), so `var(--dlc-*)` inside it
 * resolves to that persona's own palette regardless of whichever persona is
 * currently active app-wide — the option visually IS the theme it selects,
 * not just a label for it.
 *
 * Purely presentational: emits `themeSelected` and leaves actually applying
 * it (swapping the root persona class) to the caller.
 *
 * @example
 * <ldg-theme-switcher
 *   [themes]="STORYBOOK_THEME_CONFIGS"
 *   [activeCssClass]="themeStore.activeCssClass()"
 *   (themeSelected)="themeStore.apply($event)"
 * />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-theme-switcher' },
  imports: [DlcIconDirective],
  selector: 'ldg-theme-switcher',
  styleUrl: './ldg-theme-switcher.component.scss',
  templateUrl: './ldg-theme-switcher.component.html',
})
export class LdgThemeSwitcherComponent {
  readonly themes = input.required<ThemeConfig[]>();
  readonly activeCssClass = input.required<string>();

  readonly themeSelected = output<ThemeConfig>();

  /** View-model for the template — one entry per theme, in input order. */
  protected readonly options = computed<LdgThemeOption[]>(() => {
    const active = this.activeCssClass();
    return this.themes().map((theme) => ({
      displayName: formatThemeName(theme.name),
      isActive: theme.cssClass === active,
      theme,
    }));
  });

  protected onSelect(theme: ThemeConfig): void {
    this.themeSelected.emit(theme);
  }
}
