import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcFabComponent } from './dlc-fab.component';

describe('DlcFabComponent', () => {
  let fixture: ComponentFixture<DlcFabComponent>;
  let component: DlcFabComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcFabComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcFabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have dlc-fab host class', () => {
    expect(fixture.nativeElement.classList).toContain('dlc-fab');
  });

  it('should render the icon text', () => {
    fixture.componentRef.setInput('icon', 'add');
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.dlc-fab__icon');
    expect(icon.textContent.trim()).toBe('add');
  });

  it('should emit fabClick when button is clicked', () => {
    let emitted = false;
    component.fabClick.subscribe(() => (emitted = true));
    const button = fixture.nativeElement.querySelector('.dlc-fab__button');
    button.click();
    expect(emitted).toBe(true);
  });

  it('should add dlc-fab--hidden class when visible is false', () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).toContain('dlc-fab--hidden');
  });

  it('should not have dlc-fab--hidden class when visible is true (default)', () => {
    expect(fixture.nativeElement.classList).not.toContain('dlc-fab--hidden');
  });

  it('should set aria-label on the button', () => {
    fixture.componentRef.setInput('ariaLabel', 'Create circle');
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.dlc-fab__button');
    expect(button.getAttribute('aria-label')).toBe('Create circle');
  });
});
