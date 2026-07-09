import type { ComponentFixture } from '@angular/core/testing';

import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DlcFilterPopoverComponent } from './dlc-filter-popover.component';

@Component({
  imports: [DlcFilterPopoverComponent],
  template: `
    <dlc-filter-popover
      [label]="label()"
      [active]="active()"
      [valueLabel]="valueLabel()"
      [clearable]="clearable()"
      (opened)="openedCount = openedCount + 1"
      (closed)="closedCount = closedCount + 1"
      (cleared)="clearedCount = clearedCount + 1"
    >
      <div data-testid="body">Projected body</div>
    </dlc-filter-popover>
  `,
})
class HostComponent {
  readonly label = signal('Beds');
  readonly active = signal(false);
  readonly valueLabel = signal('');
  readonly clearable = signal(false);

  openedCount = 0;
  closedCount = 0;
  clearedCount = 0;
}

describe('DlcFilterPopoverComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let overlayContainer: OverlayContainer;
  let containerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    overlayContainer = TestBed.inject(OverlayContainer);
    containerEl = overlayContainer.getContainerElement();
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('.dlc-filter-popover__trigger');
  }

  function body(): HTMLElement | null {
    return containerEl.querySelector('[data-testid="body"]');
  }

  it('renders the label on the trigger', () => {
    expect(trigger().textContent).toContain('Beds');
  });

  it('opens the overlay with the projected body on trigger click', () => {
    trigger().click();
    fixture.detectChanges();

    expect(body()).toBeTruthy();
    expect(host.openedCount).toBe(1);
  });

  it('closes on a second trigger click', () => {
    trigger().click();
    fixture.detectChanges();
    trigger().click();
    fixture.detectChanges();

    expect(body()).toBeFalsy();
    expect(host.closedCount).toBe(1);
  });

  it('closes on backdrop click', () => {
    trigger().click();
    fixture.detectChanges();

    const backdrop = containerEl.querySelector<HTMLElement>('.dlc-filter-popover__backdrop');
    backdrop?.click();
    fixture.detectChanges();

    expect(body()).toBeFalsy();
    expect(host.closedCount).toBe(1);
  });

  it('reflects the active state + value label on the trigger', () => {
    host.active.set(true);
    host.valueLabel.set('3+');
    fixture.detectChanges();

    expect(trigger().classList).toContain('dlc-filter-popover__trigger--active');
    expect(trigger().textContent).toContain('3+');
  });

  it('emits cleared and closes when the Clear button is used', () => {
    host.clearable.set(true);
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    const clearBtn = containerEl.querySelector<HTMLElement>('.dlc-filter-popover__btn--clear');
    expect(clearBtn).toBeTruthy();

    clearBtn?.click();
    fixture.detectChanges();

    expect(host.clearedCount).toBe(1);
    expect(body()).toBeFalsy();
  });
});
