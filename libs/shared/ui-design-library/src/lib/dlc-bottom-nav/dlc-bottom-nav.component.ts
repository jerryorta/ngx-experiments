import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export interface DlcNavItem {
  /** Material Symbols icon name (e.g. `home`, `favorite`). */
  icon: string;
  id: string;
  label: string;
}

/**
 * Mobile footer navigation — a full-width tab bar pinned to the bottom of a
 * phone-sized shell, one icon-over-label tab per item.
 *
 * The bar pads itself by `env(safe-area-inset-bottom)` so the tabs clear the
 * home indicator, which is also why its focus ring is drawn INSIDE the tab
 * (`outline-offset: -2px`): an outward ring on the bottom row runs off-screen.
 *
 * Keyboard: Arrow keys move focus between tabs and wrap at either end; Home /
 * End jump to the first / last tab. Selection is a click (or Enter / Space on
 * the focused native button) and is reported through `itemSelect`; the
 * consumer owns `activeId`, so a tap that is not echoed back does not render.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-bottom-nav',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-bottom-nav',
  styleUrl: './dlc-bottom-nav.component.scss',
  templateUrl: './dlc-bottom-nav.component.html',
})
export class DlcBottomNavComponent {
  private readonly el = inject(ElementRef);

  readonly activeId = input('');
  readonly items = input<DlcNavItem[]>([]);

  readonly itemSelect = output<DlcNavItem>();

  onItemClick(item: DlcNavItem): void {
    this.itemSelect.emit(item);
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const tabs = Array.from(
      this.el.nativeElement.querySelectorAll('.dlc-bottom-nav__tab'),
    ) as HTMLElement[];

    if (tabs.length === 0) return;

    const focused = document.activeElement as HTMLElement;
    const currentIndex = tabs.indexOf(focused);

    switch (event.key) {
      case 'ArrowRight': {
        event.preventDefault();
        const next = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        tabs[next].focus();
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const prev = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        tabs[prev].focus();
        break;
      }
      case 'Home': {
        event.preventDefault();
        tabs[0].focus();
        break;
      }
      case 'End': {
        event.preventDefault();
        tabs[tabs.length - 1].focus();
        break;
      }
    }
  }
}
