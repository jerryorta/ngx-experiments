import type { ComponentFixture } from '@angular/core/testing';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DlcIconDirective } from './dlc-icon.directive';

@Component({
  imports: [DlcIconDirective],
  template: `<span [dlcIcon]="icon()"></span>`,
})
class TestHostComponent {
  readonly icon = signal('home');
}

describe('DlcIconDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let spanEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
    spanEl = fixture.nativeElement.querySelector('span');
  });

  it('should apply material-symbols-outlined class', () => {
    expect(spanEl.classList.contains('material-symbols-outlined')).toBe(true);
  });

  it('should set textContent to the icon name', () => {
    expect(spanEl.textContent).toBe('home');
  });

  it('should update textContent when icon input changes', () => {
    fixture.componentInstance.icon.set('settings');
    fixture.detectChanges();
    expect(spanEl.textContent).toBe('settings');
  });
});
