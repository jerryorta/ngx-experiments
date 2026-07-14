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
});
