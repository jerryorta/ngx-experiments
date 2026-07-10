import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { LdgDonutSegment } from './ldg-donut-chart.component';

import { LdgDonutChartComponent } from './ldg-donut-chart.component';

describe('LdgDonutChartComponent', () => {
  let component: LdgDonutChartComponent;
  let fixture: ComponentFixture<LdgDonutChartComponent>;

  const segments: LdgDonutSegment[] = [
    { color: 'var(--ldg-category-1)', label: 'Groceries', value: 420 },
    { color: 'var(--ldg-category-2)', label: 'Dining', value: 180 },
    { color: 'var(--ldg-category-3)', label: 'Housing', value: 900 },
  ];

  function setSegments(value: LdgDonutSegment[]): void {
    fixture.componentRef.setInput('segments', value);
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgDonutChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgDonutChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    setSegments(segments);
    expect(component).toBeTruthy();
  });

  it('should render one arc path per positive-value segment', () => {
    setSegments(segments);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.ldg-donut-chart__slice').length).toBe(segments.length);
  });

  it('should preserve segment order in the rendered arcs rather than sorting by value', () => {
    // Housing (900) is the largest but sits 3rd in `segments` — it must stay 3rd.
    setSegments(segments);
    const el: HTMLElement = fixture.nativeElement;
    const paths = el.querySelectorAll<SVGPathElement>('.ldg-donut-chart__slice');
    expect(paths[0].getAttribute('aria-label')).toContain('Groceries');
    expect(paths[2].getAttribute('aria-label')).toContain('Housing');
  });

  it('should skip zero/negative-value segments when drawing arcs', () => {
    setSegments([
      ...segments,
      { color: 'var(--ldg-category-8)', label: 'Refunded', value: -50 },
      { color: 'var(--ldg-category-7)', label: 'Untouched', value: 0 },
    ]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.ldg-donut-chart__slice').length).toBe(segments.length);
  });

  it('should render the empty-state ring and no arcs when every value is 0', () => {
    setSegments([
      { color: 'var(--ldg-category-1)', label: 'Empty A', value: 0 },
      { color: 'var(--ldg-category-2)', label: 'Empty B', value: 0 },
    ]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.ldg-donut-chart__slice').length).toBe(0);
    expect(el.querySelector('.ldg-donut-chart__empty-ring')).toBeTruthy();
  });

  it('should render the empty-state ring for an empty segments array', () => {
    setSegments([]);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('.ldg-donut-chart__slice').length).toBe(0);
    expect(el.querySelector('.ldg-donut-chart__empty-ring')).toBeTruthy();
  });

  it('should emit segmentClick with the clicked segment on slice click', () => {
    setSegments(segments);
    const emitted = jest.fn();
    component.segmentClick.subscribe(emitted);

    const el: HTMLElement = fixture.nativeElement;
    const path = el.querySelectorAll<SVGPathElement>('.ldg-donut-chart__slice')[1];
    path.dispatchEvent(new Event('click'));

    expect(emitted).toHaveBeenCalledWith(segments[1]);
  });

  it('should emit segmentClick on Enter keydown (keyboard activation)', () => {
    setSegments(segments);
    const emitted = jest.fn();
    component.segmentClick.subscribe(emitted);

    const el: HTMLElement = fixture.nativeElement;
    const path = el.querySelectorAll<SVGPathElement>('.ldg-donut-chart__slice')[0];
    path.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(emitted).toHaveBeenCalledWith(segments[0]);
  });

  it('should mark the hovered slice with the hovered class and clear it on mouseleave', () => {
    setSegments(segments);
    const el: HTMLElement = fixture.nativeElement;
    const path = el.querySelectorAll<SVGPathElement>('.ldg-donut-chart__slice')[0];

    path.dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(path.classList.contains('ldg-donut-chart__slice--hovered')).toBe(true);

    path.dispatchEvent(new Event('mouseleave'));
    fixture.detectChanges();
    expect(path.classList.contains('ldg-donut-chart__slice--hovered')).toBe(false);
  });

  it('should render the shared nge-chart-legend by default', () => {
    setSegments(segments);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('nge-chart-legend')).toBeTruthy();
  });

  it('should not render the legend when showLegend is false', () => {
    setSegments(segments);
    fixture.componentRef.setInput('showLegend', false);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('nge-chart-legend')).toBeFalsy();
  });

  it('should render centerLabel and centerValue text in the donut hole', () => {
    setSegments(segments);
    fixture.componentRef.setInput('centerLabel', 'Total');
    fixture.componentRef.setInput('centerValue', '$1,500');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-donut-chart__center-label')?.textContent).toContain('Total');
    expect(el.querySelector('.ldg-donut-chart__center-value')?.textContent).toContain('$1,500');
  });

  it('should render no center overlay when neither centerLabel nor centerValue is set', () => {
    setSegments(segments);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-donut-chart__center')).toBeFalsy();
  });
});
