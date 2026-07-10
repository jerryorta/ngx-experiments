import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { provideLedgerStore } from '@nge/ledger-store';

import { AppComponent } from './app.component';

describe('AppComponent (shell)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideStore(), provideLedgerStore()],
    }).compileComponents();
  });

  it('renders the brand and the three primary nav links', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Ledger');
    const navLabels = Array.from(el.querySelectorAll('nav a')).map(a => a.textContent ?? '');
    expect(navLabels.some(label => label.includes('Overview'))).toBe(true);
    expect(navLabels.some(label => label.includes('Transactions'))).toBe(true);
    expect(navLabels.some(label => label.includes('Budgets'))).toBe(true);
  });

  it('mirrors the default persona class onto <body>', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    // The body-class effect applies the ThemeStore's default persona.
    expect(document.body.classList.contains('dlc-professional-dark')).toBe(true);
  });
});
