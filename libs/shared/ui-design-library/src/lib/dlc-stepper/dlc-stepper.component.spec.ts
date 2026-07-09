import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcStep } from './dlc-stepper.component';

import { DlcStepperComponent } from './dlc-stepper.component';

describe('DlcStepperComponent', () => {
  let component: DlcStepperComponent;
  let fixture: ComponentFixture<DlcStepperComponent>;

  const mockSteps: DlcStep[] = [
    { label: 'Step 1', state: 'completed' },
    { label: 'Step 2', state: 'active' },
    { label: 'Step 3', state: 'upcoming' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcStepperComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcStepperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-stepper host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-stepper')).toBe(true);
  });

  it('should render the correct number of steps', () => {
    fixture.componentRef.setInput('steps', mockSteps);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const stepEls = el.querySelectorAll('.dlc-stepper__step');
    expect(stepEls.length).toBe(3);
  });

  it('should render a check icon for a completed step', () => {
    fixture.componentRef.setInput('steps', mockSteps);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const firstCircle = el.querySelector('.dlc-stepper__circle--completed');
    expect(firstCircle).toBeTruthy();
    expect(firstCircle?.textContent?.trim()).toContain('check');
  });

  it('should highlight the active step circle', () => {
    fixture.componentRef.setInput('steps', mockSteps);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const activeCircle = el.querySelector('.dlc-stepper__circle--active');
    expect(activeCircle).toBeTruthy();
  });
});
