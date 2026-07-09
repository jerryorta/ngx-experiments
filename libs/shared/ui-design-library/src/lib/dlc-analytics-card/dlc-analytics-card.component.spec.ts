import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DlcAnalyticsCardComponent } from './dlc-analytics-card.component';

@Component({
  imports: [DlcAnalyticsCardComponent],
  template: `
    <dlc-analytics-card
      [label]="label"
      [headline]="headline"
      [explainer]="explainer"
      [accentColor]="accentColor"
    >
      <div data-testid="projected">child</div>
    </dlc-analytics-card>
  `,
})
class HostComponent {
  accentColor: null | string = null;
  explainer: null | string = null;
  headline: null | string = null;
  label = '';
}

describe('DlcAnalyticsCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders the label, projected content, and host class', () => {
    host.label = 'Market Health';
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.dlc-analytics-card'));
    expect(card).toBeTruthy();
    expect(card.nativeElement.textContent).toContain('Market Health');
    expect(card.nativeElement.querySelector('[data-testid="projected"]')?.textContent).toBe(
      'child'
    );
  });

  it('renders the headline only when provided and includes an accent dot when color is set', () => {
    host.label = 'Market Health';
    host.headline = "Seller's Market";
    host.accentColor = '#4caf50';
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML;
    expect(html).toContain("Seller's Market");
    // Accent dot — `[style.background-color]` lowercases the hex in the DOM.
    expect(html.toLowerCase()).toContain('background-color: rgb(76, 175, 80)');
  });

  it('hides the headline + accent + explainer when their inputs are null', () => {
    host.label = 'Distribution';
    fixture.detectChanges();
    // The card renders the label + the projected slot; no headline, no
    // accent dot, no explainer paragraph.
    const normalised = fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim();
    expect(normalised).toContain('Distribution');
    expect(normalised).toContain('child');
    expect(fixture.nativeElement.querySelector('[style*="background-color"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('renders the explainer paragraph when provided', () => {
    host.label = 'Market Health';
    host.explainer = 'Share of properties below their previous list price.';
    fixture.detectChanges();
    const p = fixture.debugElement.query(By.css('p'));
    expect(p?.nativeElement.textContent).toContain('Share of properties below their previous');
  });
});
