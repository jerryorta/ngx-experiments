import type { FocusTrap } from '@angular/cdk/a11y';
import type { ComponentFixture } from '@angular/core/testing';

import { FocusTrapFactory } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { DlcDialogComponent } from './dlc-dialog.component';

describe('DlcDialogComponent', () => {
  let component: DlcDialogComponent;
  let fixture: ComponentFixture<DlcDialogComponent>;
  let hostEl: HTMLElement;
  let focusTrap: jest.Mocked<FocusTrap>;
  let createSpy: jest.Mock;
  let rafSpy: jest.SpyInstance;
  let rafCallbacks: FrameRequestCallback[];

  /**
   * Run captured rAF callbacks. The dialog defers focus-trap setup to rAF; we
   * queue the callbacks rather than invoke them synchronously, because running
   * scheduler-touching code inside the visibility `effect()` throws under
   * zoneless change detection ("Schedulers cannot synchronously execute
   * watches while scheduling").
   */
  function flushRaf(): void {
    const pending = rafCallbacks;
    rafCallbacks = [];
    for (const cb of pending) cb(0);
  }

  beforeEach(async () => {
    rafCallbacks = [];
    focusTrap = {
      destroy: jest.fn(),
      focusInitialElementWhenReady: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<FocusTrap>;
    createSpy = jest.fn().mockReturnValue(focusTrap);

    rafSpy = jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback): number => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });

    await TestBed.configureTestingModule({
      imports: [DlcDialogComponent],
      providers: [{ provide: FocusTrapFactory, useValue: { create: createSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    await fixture.whenStable();
    hostEl = fixture.debugElement.nativeElement as HTMLElement;
  });

  afterEach(() => {
    rafSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the dlc-dialog host class', () => {
    expect(hostEl.classList.contains('dlc-dialog')).toBe(true);
  });

  describe('when visible is false', () => {
    it('should not render the overlay', () => {
      expect(hostEl.querySelector('.dlc-dialog__overlay')).toBeNull();
    });

    it('should not render the panel', () => {
      expect(hostEl.querySelector('.dlc-dialog__panel')).toBeNull();
    });
  });

  describe('when visible is true', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
    });

    it('should render the overlay', () => {
      expect(hostEl.querySelector('.dlc-dialog__overlay')).toBeTruthy();
    });

    it('should render the panel', () => {
      expect(hostEl.querySelector('.dlc-dialog__panel')).toBeTruthy();
    });

    it('should set role="dialog"/aria-modal on the panel and role="presentation" on the overlay', () => {
      const panel = hostEl.querySelector('.dlc-dialog__panel');
      expect(panel?.getAttribute('role')).toBe('dialog');
      expect(panel?.getAttribute('aria-modal')).toBe('true');
      expect(hostEl.querySelector('.dlc-dialog__overlay')?.getAttribute('role')).toBe(
        'presentation'
      );
    });

    it('should apply the size modifier class (default md)', () => {
      const panel = hostEl.querySelector('.dlc-dialog__panel');
      expect(panel?.classList.contains('dlc-dialog__panel--md')).toBe(true);
    });

    it('should reflect a non-default size on the panel', () => {
      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      const panel = hostEl.querySelector('.dlc-dialog__panel');
      expect(panel?.classList.contains('dlc-dialog__panel--lg')).toBe(true);
    });

    it('should not set aria-label when ariaLabel is empty', () => {
      const panel = hostEl.querySelector('.dlc-dialog__panel');
      expect(panel?.getAttribute('aria-label')).toBeNull();
    });

    it('should set aria-label when ariaLabel is provided', () => {
      fixture.componentRef.setInput('ariaLabel', 'Confirm action');
      fixture.detectChanges();
      const panel = hostEl.querySelector('.dlc-dialog__panel');
      expect(panel?.getAttribute('aria-label')).toBe('Confirm action');
    });
  });

  describe('close button', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
    });

    it('should render the close button by default', () => {
      expect(hostEl.querySelector('.dlc-dialog__close')).toBeTruthy();
    });

    it('should hide the close button when showCloseButton is false', () => {
      fixture.componentRef.setInput('showCloseButton', false);
      fixture.detectChanges();
      expect(hostEl.querySelector('.dlc-dialog__close')).toBeNull();
    });

    it('should emit dismissed when the close button is clicked', () => {
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      const close = hostEl.querySelector('.dlc-dialog__close') as HTMLElement;
      close.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('backdrop dismissal', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
    });

    it('should emit dismissed when the overlay element is clicked', () => {
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      const overlay = hostEl.querySelector('.dlc-dialog__overlay') as HTMLElement;
      overlay.click();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not emit dismissed when a click originates inside the panel', () => {
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      const panel = hostEl.querySelector('.dlc-dialog__panel') as HTMLElement;
      panel.click();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit dismissed on overlay click when dismissOnBackdropClick is false', () => {
      fixture.componentRef.setInput('dismissOnBackdropClick', false);
      fixture.detectChanges();
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      const overlay = hostEl.querySelector('.dlc-dialog__overlay') as HTMLElement;
      overlay.click();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('escape dismissal', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
    });

    it('should emit dismissed when Escape is pressed', () => {
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      component.onEscape();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should not emit dismissed on Escape when dismissOnEscape is false', () => {
      fixture.componentRef.setInput('dismissOnEscape', false);
      fixture.detectChanges();
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      component.onEscape();
      expect(spy).not.toHaveBeenCalled();
    });

    it('should not emit dismissed on Escape when the dialog is not visible', () => {
      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();
      const spy = jest.fn();
      component.dismissed.subscribe(spy);
      component.onEscape();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('focus trap + restore', () => {
    it('should create and engage a focus trap on the panel when opened', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      flushRaf();

      expect(createSpy).toHaveBeenCalledTimes(1);
      const panelArg = createSpy.mock.calls[0][0] as HTMLElement;
      expect(panelArg.classList.contains('dlc-dialog__panel')).toBe(true);
      expect(focusTrap.focusInitialElementWhenReady).toHaveBeenCalled();
    });

    it('should destroy the focus trap when closed', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      flushRaf();

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      expect(focusTrap.destroy).toHaveBeenCalled();
    });

    it('should restore focus to the previously-focused trigger on close', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger);
      document.body.removeChild(trigger);
    });

    it('should lock body scroll while open and restore it on close', () => {
      document.body.style.overflow = 'scroll';

      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('hidden');

      fixture.componentRef.setInput('visible', false);
      fixture.detectChanges();
      expect(document.body.style.overflow).toBe('scroll');

      document.body.style.overflow = '';
    });

    it('should destroy the focus trap and restore scroll on destroy while open', () => {
      document.body.style.overflow = 'auto';
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      flushRaf();

      fixture.destroy();

      expect(focusTrap.destroy).toHaveBeenCalled();
      expect(document.body.style.overflow).toBe('auto');
      document.body.style.overflow = '';
    });
  });

  describe('input defaults', () => {
    it('should default dismissOnBackdropClick, dismissOnEscape, showCloseButton to true', () => {
      expect(component.dismissOnBackdropClick()).toBe(true);
      expect(component.dismissOnEscape()).toBe(true);
      expect(component.showCloseButton()).toBe(true);
    });

    it('should default size to md', () => {
      expect(component.size()).toBe('md');
    });
  });
});
