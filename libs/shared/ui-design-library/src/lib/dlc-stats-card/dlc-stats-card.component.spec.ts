import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DlcStatsCardComponent } from './dlc-stats-card.component';

describe('DlcStatsCardComponent', () => {
  let component: DlcStatsCardComponent;
  let fixture: ComponentFixture<DlcStatsCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcStatsCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcStatsCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-stats-card host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-stats-card')).toBe(true);
  });

  it('should render label', () => {
    fixture.componentRef.setInput('label', 'Active Listings');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-stats-card__label')?.textContent).toContain('Active Listings');
  });

  it('should render value', () => {
    fixture.componentRef.setInput('value', '$1.2M');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-stats-card__value')?.textContent).toContain('$1.2M');
  });

  it('should show trend icon for up trend', () => {
    fixture.componentRef.setInput('trend', 'up');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const trendEl = el.querySelector('.dlc-stats-card__trend');
    expect(trendEl).toBeTruthy();
    expect(trendEl?.textContent).toContain('arrow_upward');
  });

  it('should show trend icon for down trend', () => {
    fixture.componentRef.setInput('trend', 'down');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-stats-card__trend')?.textContent).toContain('arrow_downward');
  });

  it('should show trendLabel when provided', () => {
    fixture.componentRef.setInput('trend', 'up');
    fixture.componentRef.setInput('trendLabel', '+12% vs last month');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-stats-card__trend')?.textContent).toContain('+12% vs last month');
  });

  it('should not render trend row when trend is flat and no trendLabel', () => {
    fixture.componentRef.setInput('trend', 'flat');
    fixture.componentRef.setInput('trendLabel', null);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-stats-card__trend')).toBeFalsy();
  });

  it('should render a div root by default (no routerLink)', () => {
    const root = fixture.nativeElement.querySelector(
      '.dlc-stats-card > *:first-child'
    ) as HTMLElement;
    expect(root.tagName.toLowerCase()).toBe('div');
  });

  it('should render an anchor root when routerLink is provided', async () => {
    fixture.componentRef.setInput('routerLink', ['/app/circles']);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(root).toBeTruthy();
  });
});
