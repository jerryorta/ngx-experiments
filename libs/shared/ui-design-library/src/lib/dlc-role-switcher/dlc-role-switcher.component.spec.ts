import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcRoleSwitcherComponent } from './dlc-role-switcher.component';

describe('DlcRoleSwitcherComponent', () => {
  let component: DlcRoleSwitcherComponent;
  let fixture: ComponentFixture<DlcRoleSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcRoleSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcRoleSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-role-switcher host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-role-switcher')).toBe(true);
  });

  it('should render trigger with active role label', () => {
    fixture.componentRef.setInput('activeRole', 'professional');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.dlc-role-switcher__trigger');
    expect(trigger?.textContent).toContain('Broker / Agent');
  });

  it('should hide dropdown by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    const panel = el.querySelector('.dlc-role-switcher__panel');
    expect(panel).toBeNull();
  });

  it('should emit roleChange when an option is clicked', () => {
    const emittedRoles: string[] = [];
    component.roleChange.subscribe((role: string) => emittedRoles.push(role));

    // Open the dropdown by clicking the trigger button
    const el: HTMLElement = fixture.nativeElement;
    const trigger = el.querySelector('.dlc-role-switcher__trigger') as HTMLElement;
    trigger.click();
    fixture.detectChanges();

    const options = el.querySelectorAll('.dlc-role-switcher__option');
    expect(options.length).toBe(3);

    // Click the "home" option (index 1)
    (options[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(emittedRoles).toContain('home');
    expect(component['_open']).toBe(false);
  });
});
