import type { WritableSignal } from '@angular/core';
import type { ThemeConfig } from '@nge/storybook';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
  STORYBOOK_THEME_CONFIGS,
} from '@nge/storybook';

import { LdgThemeSwitcherComponent } from '../ldg-theme-switcher.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-theme-switcher-stories' },
  imports: [LdgThemeSwitcherComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-theme-switcher-stories',
  standalone: true,
  styleUrl: './ldg-theme-switcher-stories.component.scss',
  templateUrl: './ldg-theme-switcher-stories.component.html',
})
export class LdgThemeSwitcherStoriesComponent {
  readonly themes = STORYBOOK_THEME_CONFIGS;
  readonly activeSig: WritableSignal<string> = signal('dlc-professional-dark');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/ledger/design-library/src/lib/theme-switcher/stories';

  @Input()
  set activeCssClass(v: string) {
    this.activeSig.set(v);
  }

  onThemeSelected(theme: ThemeConfig): void {
    this.activeSig.set(theme.cssClass);
    console.log('themeSelected', theme);
  }
}
