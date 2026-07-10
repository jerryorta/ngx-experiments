import type { ComponentFixture } from '@angular/core/testing';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LdgHeaderBarComponent } from './ldg-header-bar.component';

describe('LdgHeaderBarComponent', () => {
  let component: LdgHeaderBarComponent;
  let fixture: ComponentFixture<LdgHeaderBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgHeaderBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgHeaderBarComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Accounts');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply ldg-header-bar host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-header-bar')).toBe(true);
  });

  it('should render the title', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-header-bar__title')?.textContent?.trim()).toBe('Accounts');
  });

  it('should not render a subtitle element when subtitle is not provided', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-header-bar__subtitle')).toBeNull();
  });

  it('should render the subtitle when provided', () => {
    fixture.componentRef.setInput('subtitle', 'July 2026');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-header-bar__subtitle')?.textContent?.trim()).toBe('July 2026');
  });
});

// ---------------------------------------------------------------------------
// ng-content projection spec
// ---------------------------------------------------------------------------

@Component({
  imports: [LdgHeaderBarComponent],
  template: `
    <ldg-header-bar title="Accounts">
      <span id="leading" ldgHeaderLeading>L</span>
      <button id="action" type="button" ldgHeaderActions>A</button>
    </ldg-header-bar>
  `,
})
class TestHostComponent {}

describe('LdgHeaderBarComponent (ng-content projection)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should project leading content', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#leading')?.textContent?.trim()).toBe('L');
  });

  it('should project actions content', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#action')?.textContent?.trim()).toBe('A');
  });
});
