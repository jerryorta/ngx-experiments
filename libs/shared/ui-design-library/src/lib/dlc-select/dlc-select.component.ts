import type { OverlayRef } from '@angular/cdk/overlay';
import type { OnDestroy } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';

import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

export interface DlcSelectOption {
  label: string;
  value: string;
}

/** Concierge theme classes — used to propagate the active theme to the CDK overlay panel. */
const CG_THEME_CLASSES = [
  'dlc-professional-light',
  'dlc-professional-dark',
  'dlc-home-light',
  'dlc-home-dark',
  'dlc-service-provider-light',
  'dlc-service-provider-dark',
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(keydown)': 'onKeydown($event)',
    class: 'dlc-select',
  },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DlcSelectComponent),
    },
  ],
  selector: 'dlc-select',
  styleUrl: './dlc-select.component.scss',
  templateUrl: './dlc-select.component.html',
})
export class DlcSelectComponent implements ControlValueAccessor, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly elementRef = inject(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('trigger', { read: ElementRef }) private triggerRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('panelTpl', { read: TemplateRef }) private panelTpl!: TemplateRef<unknown>;

  private overlayRef: null | OverlayRef = null;

  readonly options = input<DlcSelectOption[]>([]);
  readonly placeholder = input<string>('Select…');
  readonly disabled = input<boolean>(false);
  /**
   * Minimum width of the dropdown panel in pixels.
   * Defaults to the trigger width. Set a larger value to prevent label wrapping.
   */
  readonly panelMinWidth = input<number | undefined>(undefined);

  /**
   * Option values that should render a suffix icon button (e.g. an edit pencil).
   * Pass an empty array (default) to disable suffix buttons entirely.
   */
  readonly optionSuffixValues = input<string[]>([]);
  /** Material Symbols icon name for the suffix button. */
  readonly optionSuffixIcon = input<string>('edit');

  /** Emits the newly selected value (in addition to CVA). */
  readonly selectedValueChange = output<null | string>();
  /** Emits the option value whose suffix icon button was clicked. */
  readonly optionSuffixClicked = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly selectedValue = signal<null | string>(null);

  /** Index of the currently keyboard-focused option (-1 = none). */
  protected readonly focusedIndex = signal(-1);

  private readonly _disabledByForm = signal(false);
  private _onChange: (v: null | string) => void = () => {
    // noop — replaced by registerOnChange
  };
  private _onTouched: () => void = () => {
    // noop — replaced by registerOnTouched
  };

  // ---------------------------------------------------------------------------
  // Computed helpers
  // ---------------------------------------------------------------------------

  readonly isDisabled = computed(() => this.disabled() || this._disabledByForm());

  readonly selectedLabel = computed<null | string>(() => {
    const val = this.selectedValue();
    if (val === null) return null;
    return this.options().find(o => o.value === val)?.label ?? null;
  });

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  // ---------------------------------------------------------------------------
  // Template methods
  // ---------------------------------------------------------------------------

  toggleOpen(): void {
    if (this.isDisabled()) return;
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.isDisabled() || this.isOpen()) return;
    const currentVal = this.selectedValue();
    const idx = currentVal ? this.options().findIndex(o => o.value === currentVal) : -1;
    this.focusedIndex.set(idx);
    this.isOpen.set(true);
    this.createOverlay();
  }

  close(): void {
    this.isOpen.set(false);
    this.focusedIndex.set(-1);
    this._onTouched();
    this.destroyOverlay();
  }

  selectOption(value: string): void {
    if (this.isDisabled()) return;
    this.selectedValue.set(value);
    this._onChange(value);
    this.selectedValueChange.emit(value);
    this.close();
  }

  clearSelection(): void {
    this.selectedValue.set(null);
    this._onChange(null);
    this.selectedValueChange.emit(null);
    this.close();
  }

  isSelected(value: string): boolean {
    return this.selectedValue() === value;
  }

  hasSuffix(value: string): boolean {
    return this.optionSuffixValues().includes(value);
  }

  /** Handles suffix button click — stops propagation so the option is NOT selected. */
  onSuffixClick(event: MouseEvent, value: string): void {
    event.stopPropagation();
    this.close();
    this.optionSuffixClicked.emit(value);
  }

  isFocused(index: number): boolean {
    return this.focusedIndex() === index;
  }

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const opts = this.options();

    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!this.isOpen()) {
          event.preventDefault();
          this.open();
        } else {
          const idx = this.focusedIndex();
          if (idx >= 0 && idx < opts.length) {
            event.preventDefault();
            this.selectOption(opts[idx].value);
          }
        }
        break;

      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.close();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.open();
        } else {
          this.focusedIndex.set(Math.min(this.focusedIndex() + 1, opts.length - 1));
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen()) {
          this.focusedIndex.set(Math.max(this.focusedIndex() - 1, 0));
        }
        break;

      case 'Home':
        if (this.isOpen()) {
          event.preventDefault();
          this.focusedIndex.set(0);
        }
        break;

      case 'End':
        if (this.isOpen()) {
          event.preventDefault();
          this.focusedIndex.set(opts.length - 1);
        }
        break;

      case 'Tab':
        if (this.isOpen()) {
          this.close();
        }
        break;

      default:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // CDK Overlay
  // ---------------------------------------------------------------------------

  private createOverlay(): void {
    const triggerWidth = this.elementRef.nativeElement.getBoundingClientRect().width;
    const minWidth = Math.max(triggerWidth, this.panelMinWidth() ?? 0);
    const themeClass = this.resolveThemeClass();
    const panelClasses = ['dlc-select-overlay'];
    if (themeClass) panelClasses.push(themeClass);

    this.overlayRef = this.overlay.create({
      hasBackdrop: false,
      minWidth,
      panelClass: panelClasses,
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(this.triggerRef)
        .withPositions([
          // Preferred: open below
          { offsetY: 4, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          // Fallback: open above
          { offsetY: -4, originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        ])
        .withFlexibleDimensions(false)
        .withPush(false),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    const portal = new TemplatePortal(this.panelTpl, this.viewContainerRef);
    this.overlayRef.attach(portal);

    // Close when clicking outside — but not when clicking the trigger itself
    // (the trigger's (click) handler will re-open or close as needed).
    this.overlayRef.outsidePointerEvents().subscribe(event => {
      if (this.triggerRef.nativeElement.contains(event.target as Node)) return;
      this.close();
    });
  }

  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Walks up the DOM from the host element to find an active Concierge theme class,
   * then falls back to document.body. Returns null if no Concierge theme is found.
   * This propagates the active theme into the CDK overlay pane.
   */
  private resolveThemeClass(): null | string {
    let el: Element | null = this.elementRef.nativeElement;
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

  // ---------------------------------------------------------------------------
  // ControlValueAccessor
  // ---------------------------------------------------------------------------

  writeValue(val: null | string): void {
    this.selectedValue.set(val ?? null);
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: null | string) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._disabledByForm.set(isDisabled);
    this.cdr.markForCheck();
  }
}
