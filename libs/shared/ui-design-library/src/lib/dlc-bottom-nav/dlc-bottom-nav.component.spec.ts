import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcNavItem } from './dlc-bottom-nav.component';

import { DlcBottomNavComponent } from './dlc-bottom-nav.component';

const ITEMS: DlcNavItem[] = [
  { icon: 'home', id: 'home', label: 'Home' },
  { icon: 'calendar_month', id: 'calendar', label: 'Calendar' },
  { icon: 'favorite', id: 'care', label: 'Care' },
  { icon: 'chat_bubble', id: 'messages', label: 'Messages' },
  { icon: 'person', id: 'profile', label: 'Profile' },
];

describe('DlcBottomNavComponent', () => {
  let component: DlcBottomNavComponent;
  let fixture: ComponentFixture<DlcBottomNavComponent>;

  const tabs = (): HTMLButtonElement[] =>
    Array.from(
      (
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>('.dlc-bottom-nav__tab'),
    );

  const keydown = (key: string): void => {
    (fixture.nativeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key }),
    );
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcBottomNavComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcBottomNavComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', ITEMS);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the dlc-bottom-nav host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-bottom-nav')).toBe(true);
  });

  it('should render one tab per item', () => {
    expect(tabs().length).toBe(ITEMS.length);
  });

  it('should render each tab icon and label', () => {
    const firstTab = tabs()[0];
    expect(
      firstTab.querySelector('.dlc-bottom-nav__icon')?.textContent?.trim(),
    ).toBe('home');
    expect(
      firstTab.querySelector('.dlc-bottom-nav__label')?.textContent?.trim(),
    ).toBe('Home');
  });

  it('should mark the active tab', () => {
    fixture.componentRef.setInput('activeId', 'care');
    fixture.detectChanges();
    const active = (fixture.nativeElement as HTMLElement).querySelector(
      '.dlc-bottom-nav__tab--active',
    );
    expect(
      active?.querySelector('.dlc-bottom-nav__label')?.textContent?.trim(),
    ).toBe('Care');
    expect(active?.getAttribute('aria-current')).toBe('page');
  });

  it('should emit itemSelect with the clicked item', () => {
    const spy = jest.fn();
    component.itemSelect.subscribe(spy);
    tabs()[2].click();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(ITEMS[2]);
  });

  it('should move focus with the arrow keys and wrap at either end', () => {
    const all = tabs();
    all[0].focus();

    keydown('ArrowRight');
    expect(document.activeElement).toBe(all[1]);

    keydown('ArrowLeft');
    keydown('ArrowLeft');
    expect(document.activeElement).toBe(all[all.length - 1]);

    keydown('ArrowRight');
    expect(document.activeElement).toBe(all[0]);
  });

  it('should jump to the first and last tab with Home and End', () => {
    const all = tabs();
    all[2].focus();

    keydown('End');
    expect(document.activeElement).toBe(all[all.length - 1]);

    keydown('Home');
    expect(document.activeElement).toBe(all[0]);
  });
});
