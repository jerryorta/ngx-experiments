import type { ComponentFixture } from '@angular/core/testing';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DlcFilterBarComponent } from './dlc-filter-bar.component';

class ResizeObserverMock {
  disconnect = jest.fn();
  observe = jest.fn();
  unobserve = jest.fn();
}

@Component({
  imports: [DlcFilterBarComponent],
  template: `
    <dlc-filter-bar>
      <button data-testid="item">A</button>
      <button data-testid="item">B</button>
    </dlc-filter-bar>
  `,
})
class HostComponent {}

describe('DlcFilterBarComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let track: HTMLElement;

  function setMetrics(scrollLeft: number, scrollWidth: number, clientWidth: number): void {
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: scrollWidth });
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth });
    Object.defineProperty(track, 'scrollLeft', { configurable: true, value: scrollLeft });
  }

  function edge(side: 'left' | 'right'): HTMLElement {
    return fixture.nativeElement.querySelector(`.dlc-filter-bar__edge--${side}`);
  }

  beforeAll(() => {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ?? ResizeObserverMock;
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    track = fixture.nativeElement.querySelector('.dlc-filter-bar__track');
    track.scrollBy = jest.fn();
    fixture.detectChanges(); // runs ngAfterViewInit
  });

  it('projects content into the track', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-testid="item"]').length).toBe(2);
  });

  it('shows only the right affordance when content overflows to the right', () => {
    setMetrics(0, 500, 200);
    track.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(edge('left').classList).not.toContain('dlc-filter-bar__edge--visible');
    expect(edge('right').classList).toContain('dlc-filter-bar__edge--visible');
  });

  it('shows only the left affordance at the end of the scroll range', () => {
    setMetrics(300, 500, 200); // maxScroll = 300, scrollLeft = 300 → fully scrolled
    track.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    expect(edge('left').classList).toContain('dlc-filter-bar__edge--visible');
    expect(edge('right').classList).not.toContain('dlc-filter-bar__edge--visible');
  });

  it('scrolls right by a positive step when the right chevron is clicked', () => {
    setMetrics(0, 500, 200);
    track.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();

    const rightBtn = fixture.nativeElement.querySelector(
      '.dlc-filter-bar__edge--right .dlc-filter-bar__scroll-btn'
    ) as HTMLButtonElement;
    rightBtn.click();

    expect(track.scrollBy).toHaveBeenCalledTimes(1);
    const arg = (track.scrollBy as jest.Mock).mock.calls[0][0];
    expect(arg.left).toBeGreaterThan(0);
  });
});
