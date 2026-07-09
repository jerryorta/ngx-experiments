import type { OverlayRef } from '@angular/cdk/overlay';
import type { OnDestroy } from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/** Sort direction for the multi-field sort control. */
export type DlcSortDirection = 'asc' | 'desc';

/**
 * The sortable property dimensions (REX-489). `null` field on a
 * `DlcSortSelection` means "no explicit sort" — the consumer falls back to its
 * default ordering (e.g. newest-first on the property-search page).
 */
export type DlcSortField = 'baths' | 'beds' | 'lot' | 'price' | 'sqft' | 'year';

/** The full sort choice the control emits on every user change. */
export interface DlcSortSelection {
  direction: DlcSortDirection;
  field: DlcSortField | null;
}

/** Labelled sort-field entry rendered in the panel's field list. */
export interface DlcSortFieldOption {
  field: DlcSortField;
  label: string;
}

/** Default field set — mirrors the legacy real-estate sort control's six dimensions. */
export const DEFAULT_SORT_FIELD_OPTIONS: DlcSortFieldOption[] = [
  { field: 'price', label: 'Price' },
  { field: 'beds', label: 'Beds' },
  { field: 'baths', label: 'Baths' },
  { field: 'sqft', label: 'Sq Ft' },
  { field: 'lot', label: 'Lot Size' },
  { field: 'year', label: 'Year Built' },
];

/** Concierge theme classes — propagated into the CDK overlay pane so the
 *  panel's `--dlc-*` tokens resolve against the active theme. */
const CG_THEME_CLASSES = [
  'dlc-professional-light',
  'dlc-professional-dark',
  'dlc-home-light',
  'dlc-home-dark',
  'dlc-service-provider-light',
  'dlc-service-provider-dark',
];

/**
 * Multi-field sort control (REX-489) — a trigger button summarising the
 * current sort that opens an anchored CDK overlay listing the sortable fields
 * plus an ascending/descending toggle.
 *
 * Controlled component: the consumer owns the value (`field` / `direction`
 * inputs) and receives every change via `sortChange` — the control holds no
 * selection state of its own, so the consuming page store stays the single
 * source of truth. Clicking the already-selected field flips the direction;
 * clicking a new field selects it ascending. "Clear" returns to the default
 * ordering (`field: null`).
 *
 * The overlay mechanics mirror `dlc-filter-popover` (below-start anchored,
 * backdrop/Escape close, theme-class propagation onto the pane).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sort-control' },
  imports: [DlcIconDirective],
  selector: 'dlc-sort-control',
  styleUrl: './dlc-sort-control.component.scss',
  templateUrl: './dlc-sort-control.component.html',
})
export class DlcSortControlComponent implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('trigger', { read: ElementRef }) private triggerRef!: ElementRef<HTMLElement>;
  @ViewChild('panelTpl', { read: TemplateRef }) private panelTpl!: TemplateRef<unknown>;

  private overlayRef: null | OverlayRef = null;

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  /** Sort direction applied when a `field` is selected. */
  readonly direction = input<DlcSortDirection>('asc');

  /** Currently sorted field; `null` = default ordering (no explicit sort). */
  readonly field = input<DlcSortField | null>(null);

  /** Field list shown in the panel — override to relabel or narrow the set. */
  readonly fieldOptions = input<DlcSortFieldOption[]>(DEFAULT_SORT_FIELD_OPTIONS);

  /** Trigger text while no field is selected (the consumer's default order). */
  readonly defaultLabel = input('Newest');

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  /** Emits the full selection on every user change (field, direction, clear). */
  readonly sortChange = output<DlcSortSelection>();

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  protected readonly isOpen = signal(false);

  /** True once the user has picked an explicit sort field. */
  protected readonly hasSelection = computed(() => this.field() !== null);

  /** Trigger text — the selected field's label, or `defaultLabel` when unset. */
  protected readonly triggerLabel = computed(() => {
    const field = this.field();
    if (field === null) return this.defaultLabel();
    return this.fieldOptions().find(option => option.field === field)?.label ?? field;
  });

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  toggle(): void {
    if (this.overlayRef) this.close();
    else this.open();
  }

  open(): void {
    if (this.overlayRef) return;
    this.createOverlay(this.triggerRef.nativeElement);
    this.isOpen.set(true);
  }

  close(): void {
    if (!this.overlayRef) return;
    this.destroyOverlay();
    this.isOpen.set(false);
  }

  // ---------------------------------------------------------------------------
  // Template handlers
  // ---------------------------------------------------------------------------

  /** Re-clicking the selected field flips direction; a new field starts ascending. */
  protected onFieldClick(field: DlcSortField): void {
    if (this.field() === field) {
      this.sortChange.emit({ direction: this.direction() === 'asc' ? 'desc' : 'asc', field });
    } else {
      this.sortChange.emit({ direction: 'asc', field });
    }
  }

  /** Direction buttons only re-emit when a field is selected and the direction changes. */
  protected onDirectionClick(direction: DlcSortDirection): void {
    const field = this.field();
    if (field === null || direction === this.direction()) return;
    this.sortChange.emit({ direction, field });
  }

  /** Returns to the consumer's default ordering and closes the panel. */
  protected onClear(): void {
    this.sortChange.emit({ direction: 'asc', field: null });
    this.close();
  }

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  // ---------------------------------------------------------------------------
  // CDK overlay
  // ---------------------------------------------------------------------------

  private createOverlay(anchor: Element): void {
    const themeClass = this.resolveThemeClass();
    const panelClasses = ['dlc-sort-control__panel'];
    if (themeClass) panelClasses.push(themeClass);

    this.overlayRef = this.overlay.create({
      backdropClass: 'dlc-sort-control__backdrop',
      hasBackdrop: true,
      panelClass: panelClasses,
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(anchor)
        .withPositions([
          // Preferred: open below-end (the control sits at the right edge of the results row)
          { offsetY: 4, originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          // Fallback: open above-end
          { offsetY: -4, originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
          // Fallback: open below-start
          { offsetY: 4, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          // Fallback: open above-start
          { offsetY: -4, originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        ])
        .withFlexibleDimensions(false)
        .withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    // Close on backdrop click and on Escape (subscriptions auto-complete on dispose).
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.close();
      }
    });

    const portal = new TemplatePortal(this.panelTpl, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Walks up the DOM tree from the trigger to find the active Concierge theme
   * class and propagate it into the CDK overlay pane so its CSS variables
   * resolve correctly (the pane is rendered outside the themed host subtree).
   */
  private resolveThemeClass(): null | string {
    let el: Element | null = this.triggerRef.nativeElement;
    while (el) {
      for (const cls of CG_THEME_CLASSES) {
        if (el.classList.contains(cls)) return cls;
      }
      el = el.parentElement;
    }
    for (const cls of CG_THEME_CLASSES) {
      if (document.body.classList.contains(cls)) return cls;
    }
    return null;
  }
}
