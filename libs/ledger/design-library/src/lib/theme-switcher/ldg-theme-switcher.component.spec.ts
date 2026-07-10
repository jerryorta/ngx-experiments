import type { ComponentFixture } from '@angular/core/testing';
import type { ThemeConfig } from '@nge/storybook';

import { TestBed } from '@angular/core/testing';

import { LdgThemeSwitcherComponent } from './ldg-theme-switcher.component';

const THEMES: ThemeConfig[] = [
  {
    cssClass: 'dlc-professional-light',
    isDark: false,
    isDefault: false,
    name: 'CG Professional Light',
  },
  {
    cssClass: 'dlc-professional-dark',
    isDark: true,
    isDefault: true,
    name: 'CG Professional Dark',
  },
  {
    cssClass: 'dlc-home-light',
    isDark: false,
    isDefault: false,
    name: 'CG Home Light',
  },
];

describe('LdgThemeSwitcherComponent', () => {
  let component: LdgThemeSwitcherComponent;
  let fixture: ComponentFixture<LdgThemeSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgThemeSwitcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgThemeSwitcherComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('themes', THEMES);
    fixture.componentRef.setInput('activeCssClass', 'dlc-professional-dark');
    fixture.detectChanges();
  });

  function swatches(): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('.ldg-theme-switcher__swatch'),
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply ldg-theme-switcher host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-theme-switcher')).toBe(true);
  });

  it('should render one swatch per theme', () => {
    expect(swatches().length).toBe(THEMES.length);
  });

  it("should carry each theme's own cssClass on its swatch", () => {
    const buttons = swatches();
    THEMES.forEach((theme, index) => {
      expect(buttons[index].classList.contains(theme.cssClass)).toBe(true);
    });
  });

  it('should mark only the swatch matching activeCssClass as active', () => {
    const buttons = swatches();
    const active = buttons.filter((button) =>
      button.classList.contains('ldg-theme-switcher__swatch--active'),
    );

    expect(active.length).toBe(1);
    expect(active[0].classList.contains('dlc-professional-dark')).toBe(true);
    expect(active[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('should set aria-pressed="false" on non-active swatches', () => {
    const buttons = swatches();
    const inactive = buttons.filter(
      (button) =>
        !button.classList.contains('ldg-theme-switcher__swatch--active'),
    );

    expect(inactive.length).toBe(THEMES.length - 1);
    inactive.forEach((button) =>
      expect(button.getAttribute('aria-pressed')).toBe('false'),
    );
  });

  it('should strip the leading "CG " prefix from the displayed name', () => {
    const name = fixture.nativeElement.querySelector(
      '.ldg-theme-switcher__name',
    );
    expect(name?.textContent?.trim()).toContain('Professional Light');
    expect(name?.textContent?.trim()).not.toContain('CG');
  });

  it('should label each swatch with an aria-label naming the theme it applies', () => {
    const buttons = swatches();
    expect(buttons[0].getAttribute('aria-label')).toBe(
      'Apply Professional Light theme',
    );
    expect(buttons[1].getAttribute('aria-label')).toBe(
      'Apply Professional Dark theme',
    );
  });

  it('should render a native button with type="button" for every swatch', () => {
    swatches().forEach((button) =>
      expect(button.getAttribute('type')).toBe('button'),
    );
  });

  it('should emit the exact ThemeConfig via themeSelected when a swatch is clicked', () => {
    let emitted: ThemeConfig | undefined;
    component.themeSelected.subscribe((theme) => (emitted = theme));

    swatches()[2].click();

    expect(emitted).toEqual(THEMES[2]);
  });
});
