import type { WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { DlcChipIntent } from './dlc-chip.component';

import { DlcChipComponent } from './dlc-chip.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DlcChipComponent],
  selector: 'dlc-chip-host',
  template: `<dlc-chip [intent]="intent()" [removable]="removable()" (removed)="onRemoved()">{{
    label()
  }}</dlc-chip>`,
})
class HostComponent {
  readonly intent: WritableSignal<DlcChipIntent> = signal('neutral');
  readonly label = signal('Sample');
  readonly removable = signal(false);
  readonly removedCount = signal(0);

  onRemoved(): void {
    this.removedCount.update(count => count + 1);
  }
}

describe('DlcChipComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('creates with the dlc-chip host class and the default neutral intent', () => {
    const chip = fixture.nativeElement.querySelector('dlc-chip') as HTMLElement;
    expect(chip).toBeTruthy();
    expect(chip.classList.contains('dlc-chip')).toBe(true);
    expect(chip.classList.contains('dlc-chip--neutral')).toBe(true);
  });

  it('projects the label content', () => {
    fixture.componentInstance.label.set('Hello');
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('dlc-chip') as HTMLElement;
    expect(chip.textContent?.trim()).toBe('Hello');
  });

  it('applies the right modifier class per intent', () => {
    const intents: DlcChipIntent[] = [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
      'discovery',
    ];

    for (const intent of intents) {
      fixture.componentInstance.intent.set(intent);
      fixture.detectChanges();
      const chip = fixture.nativeElement.querySelector('dlc-chip') as HTMLElement;
      expect(chip.classList.contains(`dlc-chip--${intent}`)).toBe(true);

      // Only one intent modifier active at a time
      for (const other of intents) {
        if (other === intent) continue;
        expect(chip.classList.contains(`dlc-chip--${other}`)).toBe(false);
      }
    }
  });

  it('does not render the remove control by default', () => {
    const button = fixture.nativeElement.querySelector(
      'dlc-chip button'
    ) as HTMLButtonElement | null;
    expect(button).toBeNull();
  });

  it('renders a remove control when removable is true', () => {
    fixture.componentInstance.removable.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'dlc-chip button'
    ) as HTMLButtonElement | null;
    expect(button).toBeTruthy();
    expect(button?.getAttribute('aria-label')).toBe('Remove');
  });

  it('emits removed exactly once when the remove control is clicked', () => {
    fixture.componentInstance.removable.set(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('dlc-chip button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.removedCount()).toBe(1);
  });
});
