import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { DlcNoteOverlayComponent } from './dlc-note-overlay.component';

// ---------------------------------------------------------------------------
// Test host — used only for the ng-content projection test
// ---------------------------------------------------------------------------

@Component({
  imports: [DlcNoteOverlayComponent],
  template: `
    <dlc-note-overlay (saved)="saved.push($event)" (cancelled)="cancelledCount = cancelledCount + 1">
      <button type="button" id="trigger">Open</button>
    </dlc-note-overlay>
  `,
})
class TestHostComponent {
  saved: string[] = [];
  cancelledCount = 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPanel(overlayContainerEl: HTMLElement): HTMLElement | null {
  return overlayContainerEl.querySelector('.dlc-note-overlay__card');
}

function getTextarea(overlayContainerEl: HTMLElement): HTMLTextAreaElement | null {
  return overlayContainerEl.querySelector<HTMLTextAreaElement>('.dlc-note-overlay__textarea');
}

// ---------------------------------------------------------------------------
// Direct component spec
// ---------------------------------------------------------------------------

describe('DlcNoteOverlayComponent', () => {
  let component: DlcNoteOverlayComponent;
  let fixture: ComponentFixture<DlcNoteOverlayComponent>;
  let overlayContainerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcNoteOverlayComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    overlayContainerEl = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(DlcNoteOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  // -------------------------------------------------------------------------
  // Open / close
  // -------------------------------------------------------------------------

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('panel is not in DOM before open()', () => {
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  it('opens panel on open()', () => {
    component.open();
    fixture.detectChanges();
    expect(getPanel(overlayContainerEl)).toBeTruthy();
  });

  it('does not open a second panel when open() is called while already open', () => {
    component.open();
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const panels = overlayContainerEl.querySelectorAll('.dlc-note-overlay__card');
    expect(panels.length).toBe(1);
  });

  it('closes panel on close()', () => {
    component.open();
    fixture.detectChanges();
    component.close();
    fixture.detectChanges();
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Inputs reflected in the panel
  // -------------------------------------------------------------------------

  it('shows default placeholder in textarea', () => {
    component.open();
    fixture.detectChanges();
    expect(getTextarea(overlayContainerEl)?.placeholder).toBe('Type a note…');
  });

  it('shows custom placeholder set via setInput', () => {
    fixture.componentRef.setInput('placeholder', 'Enter your comment…');
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    expect(getTextarea(overlayContainerEl)?.placeholder).toBe('Enter your comment…');
  });

  it('pre-fills textarea with initialValue', () => {
    fixture.componentRef.setInput('initialValue', 'Existing note');
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    expect(getTextarea(overlayContainerEl)?.value).toBe('Existing note');
  });

  it('shows custom save and cancel labels', () => {
    fixture.componentRef.setInput('saveLabel', 'Confirm');
    fixture.componentRef.setInput('cancelLabel', 'Discard');
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();

    const btns = overlayContainerEl.querySelectorAll('.dlc-note-overlay__btn');
    const labels = Array.from(btns).map(b => b.textContent?.trim());
    expect(labels).toContain('Confirm');
    expect(labels).toContain('Discard');
  });

  // -------------------------------------------------------------------------
  // Save behaviour
  // -------------------------------------------------------------------------

  it('emits saved with text and closes panel when save button clicked', () => {
    const savedValues: string[] = [];
    component.saved.subscribe(v => savedValues.push(v));

    component.open();
    fixture.detectChanges();

    const textarea = getTextarea(overlayContainerEl)!;
    textarea.value = 'Hello world';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    overlayContainerEl.querySelector<HTMLButtonElement>('.dlc-note-overlay__btn--save')!.click();
    fixture.detectChanges();

    expect(savedValues).toEqual(['Hello world']);
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  it('closes panel without emitting saved when textarea is blank', () => {
    const savedValues: string[] = [];
    component.saved.subscribe(v => savedValues.push(v));

    component.open();
    fixture.detectChanges();

    overlayContainerEl.querySelector<HTMLButtonElement>('.dlc-note-overlay__btn--save')!.click();
    fixture.detectChanges();

    expect(savedValues).toHaveLength(0);
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  it('saves on Enter keydown in textarea', () => {
    const savedValues: string[] = [];
    component.saved.subscribe(v => savedValues.push(v));

    component.open();
    fixture.detectChanges();

    const textarea = getTextarea(overlayContainerEl)!;
    textarea.value = 'Note via Enter';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    fixture.detectChanges();

    expect(savedValues).toEqual(['Note via Enter']);
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Cancel behaviour
  // -------------------------------------------------------------------------

  it('emits cancelled and closes panel when cancel button clicked', () => {
    let cancelledCount = 0;
    component.cancelled.subscribe(() => cancelledCount++);

    component.open();
    fixture.detectChanges();

    overlayContainerEl.querySelector<HTMLButtonElement>('.dlc-note-overlay__btn--cancel')!.click();
    fixture.detectChanges();

    expect(cancelledCount).toBe(1);
    expect(getPanel(overlayContainerEl)).toBeNull();
  });

  it('cancels on Escape keydown in textarea', () => {
    let cancelledCount = 0;
    component.cancelled.subscribe(() => cancelledCount++);

    component.open();
    fixture.detectChanges();

    const textarea = getTextarea(overlayContainerEl)!;
    textarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    fixture.detectChanges();

    expect(cancelledCount).toBe(1);
    expect(getPanel(overlayContainerEl)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ng-content projection spec
// ---------------------------------------------------------------------------

describe('DlcNoteOverlayComponent (ng-content trigger)', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let overlayContainerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    overlayContainerEl = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders projected trigger content', () => {
    const trigger = fixture.nativeElement.querySelector('#trigger');
    expect(trigger).toBeTruthy();
    expect(trigger.textContent.trim()).toBe('Open');
  });

  it('opens overlay when projected trigger is clicked', () => {
    fixture.nativeElement.querySelector('#trigger').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.closest('body').querySelector('.dlc-note-overlay__card')).toBeTruthy();
  });

  it('emits saved text when save is clicked', () => {
    fixture.nativeElement.querySelector('#trigger').click();
    fixture.detectChanges();

    const textarea = overlayContainerEl.querySelector<HTMLTextAreaElement>('.dlc-note-overlay__textarea')!;
    textarea.value = 'From test host';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    overlayContainerEl.querySelector<HTMLButtonElement>('.dlc-note-overlay__btn--save')!.click();
    fixture.detectChanges();

    expect(host.saved).toEqual(['From test host']);
  });

  it('increments cancelledCount when cancel is clicked', () => {
    fixture.nativeElement.querySelector('#trigger').click();
    fixture.detectChanges();

    overlayContainerEl.querySelector<HTMLButtonElement>('.dlc-note-overlay__btn--cancel')!.click();
    fixture.detectChanges();

    expect(host.cancelledCount).toBe(1);
  });
});
