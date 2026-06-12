import type { OnDestroy } from '@angular/core';
import type { Observable } from 'rxjs';

import { Directive, ElementRef, inject, output } from '@angular/core';
import { ReplaySubject, Subject } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';

export class NgeBaseResizeObserver {
  entries$: ReplaySubject<ResizeObserverEntry[]> = new ReplaySubject(1);
  contentRect$: ReplaySubject<DOMRectReadOnly> = new ReplaySubject(1);

  resizeObserver: ResizeObserver;

  constructor() {
    this.resizeObserver = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      this.entries$.next(entries);

      /**
       * Get contentRect from an ResizeObserverEntry
       */
      const contentRect = entries[0].contentRect;
      this.contentRect$.next(contentRect);
    });
  }

  entries<T>(fn: (entries: ResizeObserverEntry[]) => T, debounceTimeValue = 0): Observable<T> {
    return this.entries$.pipe(map(fn), debounceTime(debounceTimeValue));
  }

  disconnect() {
    this.resizeObserver.disconnect();
  }

  unobserve(target: Element) {
    this.resizeObserver.unobserve(target);
  }

  observe(target: Element, options?: ResizeObserverOptions) {
    const rect: DOMRect = target.getBoundingClientRect();
    this.contentRect$.next(rect);

    const borderBoxSize: ResizeObserverSize = {
      blockSize: rect.height,
      inlineSize: rect.width,
    };

    const contentBoxSize: ResizeObserverSize = {
      blockSize: rect.height,
      inlineSize: rect.width,
    };

    const devicePixelContentBoxSize: ResizeObserverSize = {
      blockSize: rect.height,
      inlineSize: rect.width,
    };

    const entry: ResizeObserverEntry = Object.freeze({
      borderBoxSize,
      contentBoxSize,
      contentRect: rect,
      devicePixelContentBoxSize,
      target,
    }) as any;

    this.entries$.next([entry]);

    this.resizeObserver.observe(target, options);
  }
}

@Directive({
  selector: '[ngeResizeObserver]',
  standalone: true,
})
export class NgeResizeObserverDirective implements OnDestroy {
  private el = inject(ElementRef);
  private _onDestroy$: Subject<boolean> = new Subject();

  /**
   * Emitted when the element is resized
   */
  // eslint-disable-next-line @angular-eslint/no-output-native
  readonly resize = output<DOMRectReadOnly>();

  readonly observer: NgeBaseResizeObserver = new NgeBaseResizeObserver();

  constructor() {
    this.observer.observe(this.el.nativeElement);

    this.observer.contentRect$
      .pipe(takeUntil(this._onDestroy$))
      .subscribe((rect: DOMRectReadOnly) => {
        this.resize.emit(rect);
      });
  }

  ngOnDestroy() {
    this.observer.unobserve(this.el.nativeElement);
    this._onDestroy$.next(true);
  }
}
