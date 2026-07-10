import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeChartConfig } from '@nge/charts';

import type { LdgDonutLayerConfig, LdgDonutSegment } from './ldg-donut.models';

import { LdgDonutChartComponent } from './ldg-donut-chart.component';

describe('LdgDonutChartComponent (thin wrapper)', () => {
  let component: LdgDonutChartComponent;
  let fixture: ComponentFixture<LdgDonutChartComponent>;

  const segments: LdgDonutSegment[] = [
    { color: 'var(--ldg-category-1)', label: 'Groceries', value: 420 },
    { color: 'var(--ldg-category-3)', label: 'Housing', value: 900 },
  ];

  const config = (): NgeChartConfig => (component as unknown as { chartConfig(): NgeChartConfig }).chartConfig();
  const donutLayer = (): LdgDonutLayerConfig => config().layers.flat()[0] as unknown as LdgDonutLayerConfig;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [LdgDonutChartComponent] }).compileComponents();
    fixture = TestBed.createComponent(LdgDonutChartComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('segments', segments);
    fixture.detectChanges();
  });

  it('creates and renders an <nge-chart>', () => {
    expect(component).toBeTruthy();
    expect((fixture.nativeElement as HTMLElement).querySelector('nge-chart')).toBeTruthy();
  });

  it('maps its segments into a single donut layer', () => {
    expect(config().layers).toHaveLength(1);
    expect(donutLayer().type).toBe('donut');
    expect(donutLayer().data).toBe(segments);
  });

  it('toggles the built-in legend via showLegend', () => {
    expect(config().legend?.enabled).toBe(true);
    fixture.componentRef.setInput('showLegend', false);
    fixture.detectChanges();
    expect(config().legend).toBeUndefined();
  });

  it('passes centerLabel/centerValue/thickness through to the layer', () => {
    fixture.componentRef.setInput('centerLabel', 'Total');
    fixture.componentRef.setInput('centerValue', '$1,320');
    fixture.componentRef.setInput('thickness', 0.8);
    fixture.detectChanges();
    expect(donutLayer().centerLabel).toBe('Total');
    expect(donutLayer().centerValue).toBe('$1,320');
    expect(donutLayer().thickness).toBe(0.8);
  });

  it('emits segmentClick when the layer callback fires', () => {
    const emitted = jest.fn();
    component.segmentClick.subscribe(emitted);
    donutLayer().onSegmentClick?.(segments[1]);
    expect(emitted).toHaveBeenCalledWith(segments[1]);
  });
});
