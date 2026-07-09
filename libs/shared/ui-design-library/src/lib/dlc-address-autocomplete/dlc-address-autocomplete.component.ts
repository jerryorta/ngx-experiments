import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, Subject } from 'rxjs';

import type { DlcAddressPrediction } from './dlc-address-autocomplete.model';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/** Quiet period after the last keystroke before `queryChange` fires. */
export const CG_ADDRESS_QUERY_DEBOUNCE_MS = 250;

/**
 * Minimum typed length for a `queryChange` emission. Rule: emit when the text
 * length is `0` (host resets its predictions) OR `>= 3` (shorter fragments are
 * too ambiguous to produce useful address predictions); lengths 1–2 are
 * swallowed. Applied AFTER the debounce so a fast type-then-delete back to a
 * short fragment still emits nothing.
 */
export const CG_ADDRESS_MIN_QUERY_LENGTH = 3;

/**
 * Presentational address-autocomplete combobox (REX-510) — "data in, intents
 * out". The host supplies `predictions` / `loading` and reacts to the
 * debounced `queryChange`; the Google Places lookup itself is wired in
 * REX-491, never here.
 *
 * Inlines its own input markup (rather than composing `dlc-search-input`):
 * that sibling's pill radius + box-shadow violate this component's styling
 * locks and its API has no clear affordance, debounce, or combobox ARIA
 * surface — only its token usage is reused.
 *
 * Keyboard: ArrowDown/ArrowUp move the active-option highlight and WRAP at
 * either end (chosen so the keyboard never dead-ends on a short list); Enter
 * selects the highlighted option; Escape closes the panel and clears the
 * highlight.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-address-autocomplete' },
  imports: [DlcIconDirective],
  selector: 'dlc-address-autocomplete',
  styleUrl: './dlc-address-autocomplete.component.scss',
  templateUrl: './dlc-address-autocomplete.component.html',
})
export class DlcAddressAutocompleteComponent {
  readonly loading = input(false);
  readonly placeholder = input('Search address');
  readonly predictions = input<DlcAddressPrediction[]>([]);
  /** Pre-filled text — reflected into the input WITHOUT emitting `queryChange`. */
  readonly value = input('');
  /** Clear-affordance intent — the host resets its query/prediction state. */
  readonly cleared = output<void>();
  /** Selection intent — emits the chosen prediction so the host can resolve place details (REX-491). */
  readonly predictionSelected = output<DlcAddressPrediction>();
  /** Debounced typing intent — see `CG_ADDRESS_MIN_QUERY_LENGTH` for the emission rule. */
  readonly queryChange = output<string>();

  /**
   * Combobox identity
   * Per-instance ids wiring aria-controls / aria-activedescendant.
   */
  private static _counter = 0;
  protected readonly _id = `dlc-address-autocomplete-${++DlcAddressAutocompleteComponent._counter}`;
  protected readonly _listboxId = `${this._id}-listbox`;
  private readonly _inputEl = viewChild.required<ElementRef<HTMLInputElement>>('inputEl');

  /**
   * Query text + debounced emission
   * `_text` is the intrinsic widget text (design-library primitive exemption —
   * no SignalStore). Only USER keystrokes feed `_query$`; programmatic writes
   * (`value` input reflection, prediction selection, clear) bypass it, so
   * `queryChange` never echoes host-driven text.
   */
  protected readonly _text = signal('');
  private readonly _query$ = new Subject<string>();
  private readonly _querySub = this._query$
    .pipe(
      debounceTime(CG_ADDRESS_QUERY_DEBOUNCE_MS),
      filter(q => q.length === 0 || q.length >= CG_ADDRESS_MIN_QUERY_LENGTH),
      distinctUntilChanged(),
      takeUntilDestroyed()
    )
    .subscribe(q => this.queryChange.emit(q));
  private readonly _reflectValueEffect = effect(() => {
    this._text.set(this.value());
  });

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this._text.set(text);
    this._open.set(true);
    this._activeIndex.set(-1);
    this._query$.next(text);
  }

  /**
   * Dropdown panel + active-option highlight
   * Open/close flag and active index are intrinsic widget mechanics (local
   * signals). The panel renders while focused-open AND there is something to
   * show: predictions, the loading row, or the empty-results row.
   */
  protected readonly _open = signal(false);
  protected readonly _activeIndex = signal(-1);
  protected readonly _showEmpty = computed(
    () =>
      this._text().length >= CG_ADDRESS_MIN_QUERY_LENGTH &&
      !this.loading() &&
      this.predictions().length === 0
  );
  protected readonly _panelVisible = computed(
    () => this._open() && (this.loading() || this.predictions().length > 0 || this._showEmpty())
  );
  protected readonly _activeOptionId = computed(() =>
    this._panelVisible() && this._activeIndex() >= 0
      ? `${this._id}-option-${this._activeIndex()}`
      : null
  );
  /** New predictions invalidate the old highlight position. */
  private readonly _resetActiveIndexEffect = effect(() => {
    this.predictions();
    this._activeIndex.set(-1);
  });

  protected onFocus(): void {
    this._open.set(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const predictions = this.predictions();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (predictions.length === 0) {
          return;
        }
        this._open.set(true);
        this._activeIndex.update(i => (i + 1) % predictions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (predictions.length === 0) {
          return;
        }
        this._open.set(true);
        this._activeIndex.update(i => (i <= 0 ? predictions.length - 1 : i - 1));
        break;
      case 'Enter': {
        const index = this._activeIndex();
        if (this._panelVisible() && index >= 0 && index < predictions.length) {
          event.preventDefault();
          this.selectPrediction(predictions[index]);
        }
        break;
      }
      case 'Escape':
        this._open.set(false);
        this._activeIndex.set(-1);
        break;
    }
  }

  /**
   * Selection + clear intents
   */
  protected selectPrediction(prediction: DlcAddressPrediction): void {
    this._text.set(`${prediction.mainText}, ${prediction.secondaryText}`);
    this._open.set(false);
    this._activeIndex.set(-1);
    this.predictionSelected.emit(prediction);
  }

  protected onClear(): void {
    this._text.set('');
    this._activeIndex.set(-1);
    this.cleared.emit();
    // Refocus for immediate re-typing, THEN force the panel closed: the real
    // focus event reopens it via onFocus(), so closing must come last or the
    // dropdown re-shows stale predictions right after an explicit clear.
    this._inputEl().nativeElement.focus();
    this._open.set(false);
  }
}
