import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeLegendItem } from '../core/legend';

import { NgeChartLegendComponent } from './nge-chart-legend.component';

describe('NgeChartLegendComponent', () => {
  const items: NgeLegendItem[] = [
    { color: '#111111', id: 'A', label: 'Series A' },
    { color: '#222222', id: 'B', label: 'Series B', opacity: 0.4 },
    { color: '#333333', id: 'C', label: 'Series C', selected: true },
  ];

  async function setup(inputs: {
    interactive?: boolean;
    items: NgeLegendItem[];
  }): Promise<ComponentFixture<NgeChartLegendComponent>> {
    await TestBed.configureTestingModule({
      imports: [NgeChartLegendComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(NgeChartLegendComponent);
    fixture.componentRef.setInput('items', inputs.items);
    if (inputs.interactive !== undefined) {
      fixture.componentRef.setInput('interactive', inputs.interactive);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders plain (non-button) entries by default', async () => {
    const fixture = await setup({ items });
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelectorAll('.nge-chart-legend-item')).toHaveLength(3);
    expect(host.querySelectorAll('button')).toHaveLength(0);
  });

  it('applies a per-item opacity for fading', async () => {
    const fixture = await setup({ items });
    const host: HTMLElement = fixture.nativeElement;
    const entries = host.querySelectorAll<HTMLElement>('.nge-chart-legend-item');

    expect(entries[1].style.opacity).toBe('0.4');
    expect(entries[0].style.opacity).toBe('');
  });

  it('applies the swatchShape variant class (default square = no variant)', async () => {
    const fixture = await setup({ items });
    const host: HTMLElement = fixture.nativeElement;
    const swatch = (): HTMLElement => {
      const found = host.querySelector<HTMLElement>('.nge-chart-legend-swatch');
      if (!found) throw new Error('No swatch rendered');
      return found;
    };

    expect(swatch().classList.contains('nge-chart-legend-swatch--circle')).toBe(false);

    fixture.componentRef.setInput('swatchShape', 'circle');
    fixture.detectChanges();
    expect(swatch().classList.contains('nge-chart-legend-swatch--circle')).toBe(true);

    fixture.componentRef.setInput('swatchShape', 'line');
    fixture.detectChanges();
    expect(swatch().classList.contains('nge-chart-legend-swatch--line')).toBe(true);
  });

  describe('interactive mode', () => {
    it('renders entries as buttons with aria-pressed reflecting selection', async () => {
      const fixture = await setup({ interactive: true, items });
      const host: HTMLElement = fixture.nativeElement;
      const buttons = host.querySelectorAll<HTMLButtonElement>('button');

      expect(buttons).toHaveLength(3);
      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[0].textContent).toContain('Series A');
    });

    it('emits itemClick with the clicked item', async () => {
      const fixture = await setup({ interactive: true, items });
      const host: HTMLElement = fixture.nativeElement;
      const clicked = jest.fn();
      fixture.componentInstance.itemClick.subscribe(clicked);

      host.querySelectorAll<HTMLButtonElement>('button')[1].click();

      expect(clicked).toHaveBeenCalledTimes(1);
      expect(clicked).toHaveBeenCalledWith(items[1]);
    });
  });

  describe('grid layout', () => {
    const list = (fixture: ComponentFixture<NgeChartLegendComponent>): HTMLElement => {
      const found = fixture.nativeElement.querySelector<HTMLElement>('.nge-chart-legend-list');
      if (!found) throw new Error('No legend list rendered');
      return found;
    };

    it('defaults to flow (no grid class)', async () => {
      const fixture = await setup({ items });
      expect(list(fixture).classList.contains('nge-chart-legend-list--grid')).toBe(false);
    });

    it('applies the tabular grid class when layout is "grid"', async () => {
      const fixture = await setup({ items });
      fixture.componentRef.setInput('layout', 'grid');
      fixture.detectChanges();
      expect(list(fixture).classList.contains('nge-chart-legend-list--grid')).toBe(true);
    });

    it('suppresses the grid class for vertical orientation (already a single column)', async () => {
      const fixture = await setup({ items });
      fixture.componentRef.setInput('layout', 'grid');
      fixture.componentRef.setInput('orientation', 'vertical');
      fixture.detectChanges();
      expect(list(fixture).classList.contains('nge-chart-legend-list--grid')).toBe(false);
    });
  });

  // ARCH-284 — what lets a chart drop its on-mark labels and let the legend carry the numbers.
  describe('values', () => {
    const valued: NgeLegendItem[] = [
      { color: '#111111', id: 'A', label: 'USA', value: 932 },
      { color: '#222222', id: 'B', label: 'Britain', value: 211 },
      { color: '#333333', id: 'C', label: 'Unmeasured' },
    ];

    const valueTexts = (fixture: ComponentFixture<NgeChartLegendComponent>): string[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll<HTMLElement>('.nge-chart-legend-value')
      ).map(node => node.textContent?.trim() ?? '');

    // The guard on populating `value` upstream: every pie legend in the workspace already
    // carries one now, and none of them may start showing it uninvited.
    it('renders nothing by default, even when the items carry values', async () => {
      const fixture = await setup({ items: valued });
      expect(valueTexts(fixture)).toEqual([]);
    });

    it('renders each value once showValues is set', async () => {
      const fixture = await setup({ items: valued });
      fixture.componentRef.setInput('showValues', true);
      fixture.detectChanges();

      // 'Unmeasured' has no value, so it contributes no span rather than an empty one.
      expect(valueTexts(fixture)).toEqual(['932', '211']);
    });

    it('renders values in interactive mode too', async () => {
      const fixture = await setup({ interactive: true, items: valued });
      fixture.componentRef.setInput('showValues', true);
      fixture.detectChanges();

      expect(valueTexts(fixture)).toEqual(['932', '211']);
    });

    it('formats through formatValue', async () => {
      const fixture = await setup({ items: valued });
      fixture.componentRef.setInput('showValues', true);
      fixture.componentRef.setInput('formatValue', (value: number) => `${value} gold`);
      fixture.detectChanges();

      expect(valueTexts(fixture)).toEqual(['932 gold', '211 gold']);
    });
  });

  describe('clear action', () => {
    const clearButton = (
      fixture: ComponentFixture<NgeChartLegendComponent>
    ): HTMLButtonElement | null =>
      fixture.nativeElement.querySelector<HTMLButtonElement>('.nge-chart-legend-clear');

    it('is absent by default', async () => {
      const fixture = await setup({ items });
      expect(clearButton(fixture)).toBeNull();
    });

    it('emits clearAction when pressed', async () => {
      const fixture = await setup({ items });
      fixture.componentRef.setInput('showClearAction', true);
      fixture.detectChanges();
      const cleared = jest.fn();
      fixture.componentInstance.clearAction.subscribe(cleared);

      clearButton(fixture)?.click();

      expect(cleared).toHaveBeenCalledTimes(1);
    });

    it('labels itself "Clear highlight" — nothing was ever hidden to "show all"', async () => {
      const fixture = await setup({ items });
      fixture.componentRef.setInput('showClearAction', true);
      fixture.detectChanges();

      expect(clearButton(fixture)?.textContent?.trim()).toBe('Clear highlight');

      fixture.componentRef.setInput('clearActionLabel', 'Reset');
      fixture.detectChanges();
      expect(clearButton(fixture)?.textContent?.trim()).toBe('Reset');
    });
  });
});
