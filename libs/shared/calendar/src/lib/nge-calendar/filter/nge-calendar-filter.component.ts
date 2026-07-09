import type { OverlayRef } from '@angular/cdk/overlay';
import type { TemplateRef } from '@angular/core';

import { A11yModule } from '@angular/cdk/a11y';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter as rxFilter } from 'rxjs/operators';

import type {
  NgeCalendarEventPredicate,
  NgeCalendarFilter,
  NgeCalendarFilterContext,
} from '../../core/models/nge-calendar-filter.model';

import { DEFAULT_GIGA_CALENDAR_FILTER } from '../../core/models/nge-calendar-filter.model';
import { NgeCalendarStore } from '../store';
import { NgeCalendarDefaultFilterComponent } from './nge-calendar-default-filter.component';

/**
 * Cross-view filter funnel + popover (ARCH-149).
 *
 * Renders the funnel TRIGGER in the calendar header (an inline SVG funnel button
 * with an `activeFilterCount` badge) and, on click, an anchored CDK Overlay
 * hosting the filter body. Mirrors the {@link NgeCalendarEventOverlayComponent}
 * CDK frame (flexibleConnectedTo + 4 fallback positions, withPush, hasBackdrop,
 * backdrop / Escape close, focus-trap, restore focus, theme-prop propagation to
 * the body-mounted pane) and the concierge `cg-filter-popover` idiom.
 *
 * It `inject()`s the ambient component-scoped {@link NgeCalendarStore} (provided
 * on the shell) for the filter state. The popover edits a transient DRAFT seeded
 * from `store.filter()` on open; **Done** commits it to the store, **Clear**
 * resets it. A host `#ngeCalendarFilter` template (passed down as `hostPanel`)
 * wins over the default body, receiving a typed {@link NgeCalendarFilterContext}
 * so the host can `setFilter`, `apply(predicate)`, or `close`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-filter' },
  imports: [A11yModule, NgeCalendarDefaultFilterComponent, NgTemplateOutlet],
  selector: 'nge-calendar-filter',
  standalone: true,
  styleUrl: './nge-calendar-filter.component.scss',
  templateUrl: './nge-calendar-filter.component.html',
})
export class NgeCalendarFilterComponent<T = unknown> {
  /**
   * Host-supplied filter panel template (ARCH-149). When present it replaces the
   * default body + footer; rendered via `ngTemplateOutlet` with a typed
   * {@link NgeCalendarFilterContext} `$implicit` context so the generic `T`
   * flows into the host's `let-ctx` binding.
   */
  readonly hostPanel = input<TemplateRef<NgeCalendarFilterContext<T>> | undefined>();

  protected readonly store = inject(NgeCalendarStore);

  /** Whether the popover is open (drives `aria-expanded` + active trigger state). */
  protected readonly isOpen = signal(false);

  /** Transient draft, seeded from `store.filter()` on open and edited in-popover. */
  protected readonly draft = signal<NgeCalendarFilter>(DEFAULT_GIGA_CALENDAR_FILTER);

  /**
   * Typed render context handed to a host `#ngeCalendarFilter` template. The
   * host path has no default Done footer, so `setFilter` commits to the store
   * LIVE (and re-syncs the draft); `apply` overrides the predicate and closes.
   * `$implicit` / `filter` snapshot the current filter for the panel's controls.
   */
  protected readonly panelContext: NgeCalendarFilterContext<T> = {
    $implicit: DEFAULT_GIGA_CALENDAR_FILTER,
    apply: (predicate: NgeCalendarEventPredicate<T> | null) => {
      // Store stays payload-agnostic (`unknown`); the predicate is invoked with
      // the same runtime event object, so narrowing `T` here is sound.
      this.store.setHostPredicate(predicate as NgeCalendarEventPredicate | null);
      this.close();
    },
    close: () => this.close(),
    filter: DEFAULT_GIGA_CALENDAR_FILTER,
    setFilter: (partial: Partial<NgeCalendarFilter>) => {
      this.store.setFilter(partial);
      this.syncContext(this.store.filter());
    },
  };

  private readonly destroyRef = inject(DestroyRef);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly overlay = inject(Overlay);

  /** Hidden `<ng-template>` holding the popover card, portalled into the pane. */
  private readonly panelTemplate = viewChild.required<TemplateRef<unknown>>('panelTemplate');

  /** The funnel trigger button — the overlay anchor + focus-restore target. */
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  /** The live CDK overlay, or null when closed. */
  private overlayRef: null | OverlayRef = null;

  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  /** Toggle the popover open / closed from the funnel trigger. */
  protected toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Commit the draft to the store (Done / Apply) and close. */
  protected applyDraft(): void {
    this.store.setFilter(this.draft());
    this.close();
  }

  /** Reset the draft + clear the store filter (Clear), leaving the popover open. */
  protected clearDraft(): void {
    this.draft.set(DEFAULT_GIGA_CALENDAR_FILTER);
    this.store.clearFilter();
  }

  /** Merge a partial facet change from the default body into the draft. */
  protected mergeDraft(partial: Partial<NgeCalendarFilter>): void {
    this.draft.update(current => ({ ...current, ...partial }));
    this.syncContext(this.draft());
  }

  /** Close the popover (no commit). */
  protected close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.closeOverlay();
    this.isOpen.set(false);
  }

  /** Keep the host-panel context's `$implicit` / `filter` snapshot current. */
  private syncContext(value: NgeCalendarFilter): void {
    this.panelContext.$implicit = value;
    this.panelContext.filter = value;
  }

  /** Seed the draft from the store + open the anchored CDK overlay. */
  private open(): void {
    if (this.overlayRef) {
      return;
    }
    const seed = this.store.filter();
    this.draft.set(seed);
    this.syncContext(seed);

    const anchor = this.trigger().nativeElement;
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(anchor)
      .withPositions([
        { offsetY: 4, originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { offsetY: -4, originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        { offsetY: 4, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { offsetY: -4, originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
      ])
      .withPush(true);

    const ref = this.overlay.create({
      hasBackdrop: true,
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
    ref.attach(new TemplatePortal(this.panelTemplate(), this.vcr));

    // Propagate the host's inline `--nge-calendar-*` props onto the body-mounted
    // pane so a `config.theme` override themes the popover just like the calendar.
    const hostStyle = this.host.nativeElement.style;
    for (let i = 0; i < hostStyle.length; i++) {
      const prop = hostStyle.item(i);
      if (prop.startsWith('--nge-calendar-')) {
        ref.overlayElement.style.setProperty(prop, hostStyle.getPropertyValue(prop));
      }
    }
    // Also copy any inline theme props applied higher up (the shell host).
    this.propagateAncestorTheme(ref, anchor);

    ref
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.close());
    ref
      .keydownEvents()
      .pipe(
        rxFilter(e => e.keyCode === ESCAPE),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.close());

    this.overlayRef = ref;
    this.isOpen.set(true);
  }

  /** Detach + dispose the overlay and return focus to the funnel trigger. */
  private closeOverlay(): void {
    if (!this.overlayRef) {
      return;
    }
    this.overlayRef.detach();
    this.overlayRef.dispose();
    this.overlayRef = null;
    this.trigger().nativeElement.focus();
  }

  /**
   * Walk up from the anchor copying any inline `--nge-calendar-*` custom props
   * onto the overlay pane, so a `config.theme` applied to the shell host (an
   * ancestor of this component) themes the body-mounted popover too.
   */
  private propagateAncestorTheme(ref: OverlayRef, anchor: HTMLElement): void {
    let el: HTMLElement | null = anchor;
    while (el) {
      const style = el.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style.item(i);
        if (
          prop.startsWith('--nge-calendar-') &&
          ref.overlayElement.style.getPropertyValue(prop) === ''
        ) {
          ref.overlayElement.style.setProperty(prop, style.getPropertyValue(prop));
        }
      }
      el = el.parentElement;
    }
  }
}
