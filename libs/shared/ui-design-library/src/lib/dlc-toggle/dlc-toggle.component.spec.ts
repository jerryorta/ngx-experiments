import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcToggleComponent } from './dlc-toggle.component';

describe('DlcToggleComponent', () => {
  let fixture: ComponentFixture<DlcToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcToggleComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcToggleComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should default to unchecked', () => {
    expect(fixture.componentInstance['_checked']()).toBe(false);
  });

  it('should toggle on click', () => {
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['_checked']()).toBe(true);
  });

  it('should not toggle when disabled', () => {
    fixture.componentInstance.setDisabledState(true);
    fixture.componentInstance.toggle();
    expect(fixture.componentInstance['_checked']()).toBe(false);
  });

  it('should emit checkedChange on toggle', () => {
    let emitted: boolean | undefined;
    fixture.componentInstance.checkedChange.subscribe((v: boolean) => (emitted = v));
    fixture.componentInstance.toggle();
    expect(emitted).toBe(true);
  });

  it('should writeValue and reflect state', () => {
    fixture.componentInstance.writeValue(true);
    expect(fixture.componentInstance['_checked']()).toBe(true);
  });
});
