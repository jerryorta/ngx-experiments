import type { OnDestroy } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

/** Duration must match --dlc-drawer-transition-duration in the SCSS. */
const TRANSITION_MS = 300;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-drawer' },
  imports: [],
  selector: 'dlc-drawer',
  styleUrl: './dlc-drawer.component.scss',
  templateUrl: './dlc-drawer.component.html',
})
export class DlcDrawerComponent implements OnDestroy {
  /** Whether the drawer is currently open. */
  readonly opened = input(false);

  /** Accessible label for the drawer dialog element. */
  readonly ariaLabel = input('');

  /** Default width in pixels (used when no persisted value exists). */
  readonly defaultWidth = input(900);

  /** Minimum resizable width in pixels. */
  readonly minWidth = input(480);

  /** Maximum resizable width in pixels. */
  readonly maxWidth = input(1400);

  /** localStorage key used to persist the last-resized width across sessions. */
  readonly storageKey = input('dlc-drawer-width');

  /** Emits when the user requests the drawer to close (backdrop click or close button). */
  readonly closedStart = output<void>();

  /** Emits the new pixel width after each resize gesture completes. */
  readonly widthChange = output<number>();

  readonly width = signal(900);
  readonly isDragging = signal(false);

  /** Controls DOM presence — stays true until the exit transition completes. */
  readonly isVisible = signal(false);

  /** Drives the CSS open/close transition classes. */
  readonly isOpen = signal(false);

  #dragStartX = 0;
  #dragStartWidth = 0;
  #boundOnMouseMove = this.#onMouseMove.bind(this);
  #boundOnMouseUp = this.#onMouseUp.bind(this);
  #widthInitialized = false;
  #exitTimer: null | ReturnType<typeof setTimeout> = null;

  constructor() {
    // Load persisted width on first run; falls back to defaultWidth.
    effect(() => {
      if (this.#widthInitialized) return;
      const key = this.storageKey();
      const defaultW = this.defaultWidth();
      try {
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!Number.isNaN(parsed)) {
            this.width.set(this.#clamp(parsed));
            this.#widthInitialized = true;
            return;
          }
        }
      } catch {
        // localStorage unavailable in non-browser environments
      }
      this.width.set(defaultW);
      this.#widthInitialized = true;
    });

    // Drive the two-phase animation: enter = add to DOM then transition in;
    // exit = transition out then remove from DOM.
    effect(() => {
      const opened = this.opened();
      if (opened) {
        // Cancel any pending exit timer.
        if (this.#exitTimer !== null) {
          clearTimeout(this.#exitTimer);
          this.#exitTimer = null;
        }
        this.isVisible.set(true);
        // Defer one tick so the browser renders the initial (off-screen) state
        // before applying the open class that triggers the CSS transition.
        setTimeout(() => this.isOpen.set(true), 0);
      } else {
        // Trigger the CSS exit transition, then remove from DOM.
        this.isOpen.set(false);
        this.#exitTimer = setTimeout(() => {
          this.isVisible.set(false);
          this.#exitTimer = null;
        }, TRANSITION_MS);
      }
    });
  }

  ngOnDestroy(): void {
    this.#stopDragging();
    if (this.#exitTimer !== null) {
      clearTimeout(this.#exitTimer);
    }
  }

  close(): void {
    this.closedStart.emit();
  }

  onDragStart(event: MouseEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
    this.#dragStartX = event.clientX;
    this.#dragStartWidth = this.width();
    document.addEventListener('mousemove', this.#boundOnMouseMove);
    document.addEventListener('mouseup', this.#boundOnMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }

  #onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;
    // Right-anchored drawer: dragging left increases width.
    const delta = this.#dragStartX - event.clientX;
    const newWidth = this.#clamp(this.#dragStartWidth + delta);
    this.width.set(newWidth);
    this.#saveWidth(newWidth);
    this.widthChange.emit(newWidth);
  }

  #onMouseUp(): void {
    this.#stopDragging();
  }

  #stopDragging(): void {
    this.isDragging.set(false);
    document.removeEventListener('mousemove', this.#boundOnMouseMove);
    document.removeEventListener('mouseup', this.#boundOnMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  #clamp(w: number): number {
    return Math.max(this.minWidth(), Math.min(this.maxWidth(), w));
  }

  #saveWidth(w: number): void {
    try {
      localStorage.setItem(this.storageKey(), String(w));
    } catch {
      // localStorage unavailable — silently ignore
    }
  }
}
