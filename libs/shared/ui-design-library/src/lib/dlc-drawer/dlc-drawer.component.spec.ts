import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcDrawerComponent } from './dlc-drawer.component';

describe('DlcDrawerComponent', () => {
  let component: DlcDrawerComponent;
  let fixture: ComponentFixture<DlcDrawerComponent>;

  beforeEach(async () => {
    jest.useFakeTimers();

    await TestBed.configureTestingModule({
      imports: [DlcDrawerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-drawer host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-drawer')).toBe(true);
  });

  it('should not render backdrop or panel initially (closed)', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-drawer__backdrop')).toBeNull();
    expect(el.querySelector('.dlc-drawer__panel')).toBeNull();
  });

  it('should make isVisible true when opened', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    expect(component.isVisible()).toBe(true);
  });

  it('should set isOpen true after the deferred tick when opened', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    jest.advanceTimersByTime(0);
    expect(component.isOpen()).toBe(true);
  });

  it('should render backdrop and panel when opened', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-drawer__backdrop')).toBeTruthy();
    expect(el.querySelector('.dlc-drawer__panel')).toBeTruthy();
  });

  it('should clear isOpen immediately on close', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('opened', false);
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
  });

  it('should keep isVisible true during the exit transition then clear it', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();

    fixture.componentRef.setInput('opened', false);
    fixture.detectChanges();

    // isVisible stays true during transition
    expect(component.isVisible()).toBe(true);

    // After 300 ms timeout the DOM is removed
    jest.advanceTimersByTime(300);
    expect(component.isVisible()).toBe(false);
  });

  it('should emit closedStart when close() is called', () => {
    const spy = jest.fn();
    component.closedStart.subscribe(spy);
    component.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should emit closedStart when backdrop is clicked', () => {
    fixture.componentRef.setInput('opened', true);
    fixture.detectChanges();
    const spy = jest.fn();
    component.closedStart.subscribe(spy);
    const backdrop = fixture.nativeElement.querySelector('.dlc-drawer__backdrop') as HTMLElement;
    backdrop.click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should clamp width to minWidth', () => {
    fixture.componentRef.setInput('minWidth', 480);
    fixture.componentRef.setInput('maxWidth', 1400);
    component.onDragStart({ clientX: 100, preventDefault: () => undefined } as MouseEvent);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 2000 }));
    expect(component.width()).toBeGreaterThanOrEqual(480);
    document.dispatchEvent(new MouseEvent('mouseup'));
  });

  it('should clamp width to maxWidth', () => {
    fixture.componentRef.setInput('minWidth', 480);
    fixture.componentRef.setInput('maxWidth', 1400);
    component.onDragStart({ clientX: 5000, preventDefault: () => undefined } as MouseEvent);
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 0 }));
    expect(component.width()).toBeLessThanOrEqual(1400);
    document.dispatchEvent(new MouseEvent('mouseup'));
  });

  it('should load persisted width from localStorage', () => {
    const storageKey = 'test-drawer-width-' + Date.now();
    localStorage.setItem(storageKey, '750');

    const localFixture = TestBed.createComponent(DlcDrawerComponent);
    localFixture.componentRef.setInput('storageKey', storageKey);
    localFixture.componentRef.setInput('minWidth', 480);
    localFixture.componentRef.setInput('maxWidth', 1400);
    localFixture.detectChanges();

    expect(localFixture.componentInstance.width()).toBe(750);
    localStorage.removeItem(storageKey);
    localFixture.destroy();
    jest.runAllTimers();
  });

  it('should fall back to defaultWidth when no persisted value', () => {
    const storageKey = 'test-drawer-width-missing-' + Date.now();
    localStorage.removeItem(storageKey);

    const localFixture = TestBed.createComponent(DlcDrawerComponent);
    localFixture.componentRef.setInput('storageKey', storageKey);
    localFixture.componentRef.setInput('defaultWidth', 1000);
    localFixture.componentRef.setInput('minWidth', 480);
    localFixture.componentRef.setInput('maxWidth', 1400);
    localFixture.detectChanges();

    expect(localFixture.componentInstance.width()).toBe(1000);
    localFixture.destroy();
    jest.runAllTimers();
  });

  it('should set isDragging to true on drag start and false on mouse up', () => {
    expect(component.isDragging()).toBe(false);
    component.onDragStart({ clientX: 500, preventDefault: () => undefined } as MouseEvent);
    expect(component.isDragging()).toBe(true);
    document.dispatchEvent(new MouseEvent('mouseup'));
    expect(component.isDragging()).toBe(false);
  });
});
