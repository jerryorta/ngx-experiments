import type { ComponentFixture } from '@angular/core/testing';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LdgEmptyStateComponent } from './ldg-empty-state.component';

describe('LdgEmptyStateComponent', () => {
  let component: LdgEmptyStateComponent;
  let fixture: ComponentFixture<LdgEmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgEmptyStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgEmptyStateComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('heading', 'No transactions yet');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply ldg-empty-state host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-empty-state')).toBe(true);
  });

  it('should render the heading', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-empty-state__heading')?.textContent?.trim()).toBe(
      'No transactions yet',
    );
  });

  it('should not render an icon when icon is not provided', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-empty-state__icon')).toBeNull();
  });

  it('should render the icon glyph via dlcIcon when provided', () => {
    fixture.componentRef.setInput('icon', 'receipt_long');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-empty-state__icon')?.textContent?.trim()).toBe('receipt_long');
  });

  it('should not render a message when message is not provided', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-empty-state__message')).toBeNull();
  });

  it('should render the message when provided', () => {
    fixture.componentRef.setInput('message', 'Add your first transaction to get started.');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-empty-state__message')?.textContent?.trim()).toBe(
      'Add your first transaction to get started.',
    );
  });
});

// ---------------------------------------------------------------------------
// ng-content projection spec
// ---------------------------------------------------------------------------

@Component({
  imports: [LdgEmptyStateComponent],
  template: `
    <ldg-empty-state heading="No transactions yet">
      <button id="action" type="button" ldgEmptyStateAction>Add Transaction</button>
    </ldg-empty-state>
  `,
})
class TestHostComponent {}

describe('LdgEmptyStateComponent (ng-content projection)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should project the action content', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#action')?.textContent?.trim()).toBe('Add Transaction');
  });
});
