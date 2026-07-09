import type { ComponentFixture } from '@angular/core/testing';

import { OverlayModule } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DlcTooltipDirective } from './dlc-tooltip.directive';

@Component({
  imports: [DlcTooltipDirective],
  standalone: true,
  template: `<button [dlcTooltip]="'Hello'">Hover me</button>`,
})
class TestHostComponent {}

describe('DlcTooltipDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, OverlayModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show tooltip on mouseenter', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    // After mouseenter, overlayRef should exist (tooltip shown)
    const tooltipBubbles = document.querySelectorAll('.dlc-tooltip__bubble');
    expect(tooltipBubbles.length).toBeGreaterThan(0);
  });
});
