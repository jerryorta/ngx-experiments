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
    return Array.from(fixture.nativeElement.querySelectorAll('.ldg-theme-switcher__swatch'));
  }

  function swatchFor(cssClass: string): HTMLButtonElement {
    const found = swatches().find((button) => button.classList.contains(cssClass));
    if (!found) throw new Error(`No swatch for ${cssClass}`);
    return found;
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

  it('should group themes into one column per persona, dark tile on top', () => {
    const columns: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.ldg-theme-switcher__column'),
    );
    // 3 test themes → professional (light + dark) + home (light) = 2 columns.
    expect(columns.length).toBe(2);

    const professional: HTMLButtonElement[] = Array.from(
      columns[0].querySelectorAll('.ldg-theme-switcher__swatch'),
    );
    expect(professional[0].classList.contains('dlc-professional-dark')).toBe(true);
    expect(professional[1].classList.contains('dlc-professional-light')).toBe(true);
  });

  it("should carry each theme's own cssClass on its swatch", () => {
    THEMES.forEach((theme) => expect(swatchFor(theme.cssClass)).toBeTruthy());
  });

  it('should mark only the swatch matching activeCssClass as active', () => {
    const active = swatches().filter((button) =>
      button.classList.contains('ldg-theme-switcher__swatch--active'),
    );

    expect(active.length).toBe(1);
    expect(active[0].classList.contains('dlc-professional-dark')).toBe(true);
    expect(active[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('should set aria-pressed="false" on non-active swatches', () => {
    const inactive = swatches().filter(
      (button) => !button.classList.contains('ldg-theme-switcher__swatch--active'),
    );

    expect(inactive.length).toBe(THEMES.length - 1);
    inactive.forEach((button) => expect(button.getAttribute('aria-pressed')).toBe('false'));
  });

  it('should strip the leading "CG " prefix from every displayed name', () => {
    const names: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('.ldg-theme-switcher__name'),
    ).map((node: Element) => node.textContent?.trim() ?? '');

    // Names also contain the mode-icon's ligature text (dark_mode/light_mode).
    expect(names.some((name) => name.includes('Professional Light'))).toBe(true);
    expect(names.every((name) => !name.includes('CG'))).toBe(true);
  });

  it('should label each swatch with an aria-label naming the theme it applies', () => {
    expect(swatchFor('dlc-professional-light').getAttribute('aria-label')).toBe(
      'Apply Professional Light theme',
    );
    expect(swatchFor('dlc-professional-dark').getAttribute('aria-label')).toBe(
      'Apply Professional Dark theme',
    );
  });

  it('should render a native button with type="button" for every swatch', () => {
    swatches().forEach((button) => expect(button.getAttribute('type')).toBe('button'));
  });

  it('should emit the exact ThemeConfig via themeSelected when a swatch is clicked', () => {
    let emitted: ThemeConfig | undefined;
    component.themeSelected.subscribe((theme) => (emitted = theme));

    swatchFor('dlc-home-light').click();

    expect(emitted).toEqual(THEMES[2]);
  });
});
