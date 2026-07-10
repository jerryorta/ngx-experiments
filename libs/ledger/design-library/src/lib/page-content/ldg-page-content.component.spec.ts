import type { ComponentFixture } from '@angular/core/testing';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LdgPageContentComponent } from './ldg-page-content.component';

describe('LdgPageContentComponent', () => {
  let component: LdgPageContentComponent;
  let fixture: ComponentFixture<LdgPageContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgPageContentComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgPageContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply ldg-page-content host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-page-content')).toBe(true);
  });

  it('should apply the padded modifier class by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-page-content--padded')).toBe(true);
  });

  it('should remove the padded modifier class when padded is false', () => {
    fixture.componentRef.setInput('padded', false);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-page-content--padded')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ng-content projection spec
// ---------------------------------------------------------------------------

@Component({
  imports: [LdgPageContentComponent],
  template: `
    <ldg-page-content>
      <p id="body">Page body</p>
    </ldg-page-content>
  `,
})
class TestHostComponent {}

describe('LdgPageContentComponent (ng-content projection)', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should project default content', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#body')?.textContent?.trim()).toBe('Page body');
  });
});
