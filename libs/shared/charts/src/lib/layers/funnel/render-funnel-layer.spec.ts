import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeFunnelDataPoint, NgeFunnelLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeFunnelLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderFunnelLayer } from './render-funnel-layer';

type FunnelContext = NgeChartLayerContext<
  NgeFunnelDataPoint,
  NgeFunnelLayerConfig,
  NgeFunnelLayerTheme | undefined
>;

interface ContextOptions {
  align?: 'center' | 'left';
  direction?: 'down' | 'up';
  formatLabel?: (d: NgeFunnelDataPoint) => string;
  gap?: number;
  labelColor?: string;
  labelGutter?: number;
  labelPosition?: 'edge' | 'inside' | 'right';
  neckRatio?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  seriesColors?: string[];
  showLabels?: boolean;
  theme?: NgeFunnelLayerTheme;
  tooltip?: boolean;
}

// 300x300 bounds, 3 bands → each slot is exactly 100px tall (round numbers throughout).
const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 300,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 320,
};

/** Three bands: A=100 (max → full width 300), B=50 (width 150), C=25 (width 75). */
const FUNNEL: NgeFunnelDataPoint[] = [
  { label: 'A', value: 100 },
  { label: 'B', value: 50 },
  { label: 'C', value: 25 },
];

function createContext(
  data: NgeFunnelDataPoint[],
  options: ContextOptions = {}
): { context: FunnelContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeFunnelLayerConfig = {
    align: options.align,
    data,
    direction: options.direction,
    formatLabel: options.formatLabel,
    gap: options.gap,
    labelColor: options.labelColor,
    labelGutter: options.labelGutter,
    labelPosition: options.labelPosition,
    neckRatio: options.neckRatio,
    onClick: options.onClick,
    renderer: renderFunnelLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    type: 'funnel',
  };

  // Funnel ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: FunnelContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 10, left: 10, right: 10, top: 10 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeFunnelDataPoint) => ({ label: d.label, value: d.value }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** The `.nge-funnel-band` path bound to a specific band label. */
function bandByLabel(g: SVGGElement, label: string): SVGPathElement {
  const match = g.querySelector<SVGPathElement>(`.nge-funnel-band[data-label="${label}"]`);
  if (!match) {
    throw new Error(`No funnel band for label "${label}"`);
  }
  return match;
}

/** The `.nge-funnel-label` text node bound to a specific band label. */
function labelByLabel(g: SVGGElement, label: string): SVGTextElement {
  const match = g.querySelector<SVGTextElement>(`.nge-funnel-label[data-label="${label}"]`);
  if (!match) {
    throw new Error(`No funnel label for "${label}"`);
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. The `d` attribute is applied via
 * an `attrTween` (never synchronously), so the trapezoid path string is only observable
 * after a real delay past the enter duration (300ms). Fills / handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderFunnelLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data / zero-max guards', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(0);
    });

    it('is a no-op when every value is zero or negative (maxValue <= 0)', () => {
      const data: NgeFunnelDataPoint[] = [
        { label: 'A', value: -5 },
        { label: 'B', value: -2 },
      ];
      const { context, g } = createContext(data);

      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(0);
    });

    it('clamps a negative value to a zero-width band (no NaN)', async () => {
      const data: NgeFunnelDataPoint[] = [
        { label: 'A', value: -10 },
        { label: 'B', value: 50 },
        { label: 'C', value: 25 },
      ];
      const { context, g } = createContext(data);

      renderFunnelLayer(context);
      await settle();

      const d = bandByLabel(g, 'A').getAttribute('d') ?? '';
      expect(d).not.toContain('NaN');
      // maxValue is 50 (the raw max); A's negative value clamps to a zero-width band.
      expect(d).toContain('M150,0 L150,0');
    });
  });

  describe('structure', () => {
    it('renders one band path per datum', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(3);
    });

    it('re-renders idempotently (keyed by label)', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(3);
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('exits a removed band on re-render', async () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(3);

      // Drop 'C' and re-render into the same bounds.
      const reduced = FUNNEL.slice(0, 2);
      context.config.data = reduced;
      context.data = reduced;
      renderFunnelLayer(context);
      await settle();

      const remaining = Array.from(g.querySelectorAll('.nge-funnel-band')).map(node =>
        node.getAttribute('data-label')
      );
      expect(remaining).toEqual(['A', 'B']);
    });

    it('adds a new band on re-render', async () => {
      const { context, g } = createContext(FUNNEL.slice(0, 2));

      renderFunnelLayer(context);
      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(2);

      context.config.data = FUNNEL;
      context.data = FUNNEL;
      renderFunnelLayer(context);
      await settle();

      expect(g.querySelectorAll('.nge-funnel-band')).toHaveLength(3);
    });

    it('morphs a band path when its value changes (update)', async () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      await settle();
      const before = bandByLabel(g, 'B').getAttribute('d');

      const changed: NgeFunnelDataPoint[] = [
        { label: 'A', value: 100 },
        { label: 'B', value: 10 },
        { label: 'C', value: 25 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderFunnelLayer(context);
      await settle();

      expect(bandByLabel(g, 'B').getAttribute('d')).not.toBe(before);
    });
  });

  describe('trapezoid geometry — direction', () => {
    it('direction: down (default) stacks widest-at-top, narrowing downward', async () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      await settle();

      // Band A: top width from A(100)=300, bottom width from B(50)=150, slot 0 (y 0-100).
      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M0,0 L300,0 L225,100 L75,100 Z');
      // Band C (last, no successor, neckRatio unset ⇒ flat bottom), slot 2 (y 200-300).
      expect(bandByLabel(g, 'C').getAttribute('d')).toBe(
        'M112.5,200 L187.5,200 L187.5,300 L112.5,300 Z'
      );
    });

    it('direction: up stacks widest-at-bottom, narrowing upward', async () => {
      const { context, g } = createContext(FUNNEL, { direction: 'up' });

      renderFunnelLayer(context);
      await settle();

      // Band A ends in the BOTTOM slot (y 200-300), widening toward the bottom edge (300px).
      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M75,200 L225,200 L300,300 L0,300 Z');
      // Band C (last, no successor) ends in the TOP slot (y 0-100), flat (neckRatio unset).
      expect(bandByLabel(g, 'C').getAttribute('d')).toBe(
        'M112.5,0 L187.5,0 L187.5,100 L112.5,100 Z'
      );
    });
  });

  describe('trapezoid geometry — align', () => {
    it('align: center (default) centers each band on the bounded width', async () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      await settle();

      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M0,0 L300,0 L225,100 L75,100 Z');
    });

    it('align: left pins every band left edge to x = 0', async () => {
      const { context, g } = createContext(FUNNEL, { align: 'left' });

      renderFunnelLayer(context);
      await settle();

      // topW=300, botW=150, y 0-100 — left edge fixed at 0.
      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M0,0 L300,0 L150,100 L0,100 Z');
    });
  });

  describe('gap (vertical spacing)', () => {
    it('carves the gap symmetrically out of each band slot', async () => {
      const { context, g } = createContext(FUNNEL, { gap: 20 });

      renderFunnelLayer(context);
      await settle();

      // Slot 0 is y 0-100; gap 20 carves 10px off each edge ⇒ drawn band spans y 10-90.
      const d = bandByLabel(g, 'A').getAttribute('d') ?? '';
      expect(d).toContain(',10 ');
      expect(d).toContain(',90 ');
    });
  });

  describe('neckRatio — pyramid apex', () => {
    it('undefined (default) gives the last band a flat bottom (funnel)', async () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);
      await settle();

      // Band C: top width == bottom width (75 == 75) — flat, not a point.
      const d = bandByLabel(g, 'C').getAttribute('d') ?? '';
      expect(d).toBe('M112.5,200 L187.5,200 L187.5,300 L112.5,300 Z');
    });

    it('0 collapses the last band to a point apex (pyramid: direction up + neckRatio 0)', async () => {
      const { context, g } = createContext(FUNNEL, { direction: 'up', neckRatio: 0 });

      renderFunnelLayer(context);
      await settle();

      // Pyramid: band C (last in sequence) sits at the very top (slot 0) and collapses
      // to a point — its top-left and top-right vertices coincide at cx (150).
      expect(bandByLabel(g, 'C').getAttribute('d')).toBe('M150,0 L150,0 L187.5,100 L112.5,100 Z');
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors bands from the theme palette by input index', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);

      expect(styleOf(bandByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(bandByLabel(g, 'B'), 'fill')).toBe('var(--nge-chart-secondary)');
      expect(styleOf(bandByLabel(g, 'C'), 'fill')).toBe('var(--nge-chart-tertiary)');
    });

    it('applies the theme band stroke to separate adjacent bands', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);

      expect(styleOf(bandByLabel(g, 'A'), 'stroke')).toBe('var(--nge-chart-surface)');
    });

    it('honors a per-band color override above the palette', () => {
      const data: NgeFunnelDataPoint[] = [
        { label: 'A', value: 100 },
        { color: 'var(--override)', label: 'B', value: 50 },
      ];
      const { context, g } = createContext(data);

      renderFunnelLayer(context);

      expect(styleOf(bandByLabel(g, 'B'), 'fill')).toBe('var(--override)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(FUNNEL, {
        seriesColors: ['#111111', '#222222', '#333333'],
      });

      renderFunnelLayer(context);

      expect(styleOf(bandByLabel(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(bandByLabel(g, 'B'), 'fill')).toBe('#222222');
    });
  });

  describe('labels', () => {
    it('renders no labels by default', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-label')).toHaveLength(0);
    });

    it('renders one label per band with its own label text when showLabels is set', () => {
      const { context, g } = createContext(FUNNEL, { showLabels: true });

      renderFunnelLayer(context);

      expect(g.querySelectorAll('.nge-funnel-label')).toHaveLength(3);
      expect(labelByLabel(g, 'B').textContent).toBe('B');
    });

    it('honors a custom formatLabel', () => {
      const { context, g } = createContext(FUNNEL, {
        formatLabel: d => `${d.label}: ${d.value}`,
        showLabels: true,
      });

      renderFunnelLayer(context);

      expect(labelByLabel(g, 'A').textContent).toBe('A: 100');
    });

    describe('label colour resolution (ARCH-266)', () => {
      const LIGHT = '#fff3c4';
      const DARK = '#101820';

      it('rung 1 — a per-datum labelColor wins over config, derivation and theme', () => {
        const { context, g } = createContext(
          [{ color: DARK, label: 'A', labelColor: '#ff0000', value: 100 }],
          {
            labelColor: '#00ff00',
            showLabels: true,
            theme: { label: { color: '#0000ff', colorOnDark: '#0000ff' } },
          }
        );

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#ff0000');
      });

      it('rung 2 — a layer-config labelColor forces one flat colour on every band', () => {
        const { context, g } = createContext(
          [
            { color: DARK, label: 'A', value: 100 },
            { color: LIGHT, label: 'B', value: 50 },
          ],
          { labelColor: '#00ff00', showLabels: true }
        );

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#00ff00');
        expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#00ff00');
      });

      it('rung 3 — an INSIDE label derives from its own band fill', () => {
        const { context, g } = createContext(
          [
            { color: DARK, label: 'A', value: 100 },
            { color: LIGHT, label: 'B', value: 50 },
          ],
          { showLabels: true, theme: { label: { color: '#000000', colorOnDark: '#ffffff' } } }
        );

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#ffffff');
        expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#000000');
      });

      it.each(['edge', 'right'] as const)(
        'an OUTSIDE (%s) label sits on the plot surface, so it never derives',
        labelPosition => {
          const { context, g } = createContext(
            [
              { color: DARK, label: 'A', value: 100 },
              { color: LIGHT, label: 'B', value: 50 },
            ],
            {
              labelPosition,
              showLabels: true,
              theme: { labelOutside: { color: '#123456' } },
            }
          );

          renderFunnelLayer(context);

          // Both take the one outside colour despite sitting beside opposite-luminance bands.
          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#123456');
          expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#123456');
        }
      );

      it.each(['edge', 'right'] as const)(
        'an OUTSIDE (%s) label reads labelOutside, NOT the in-band absolute pair (ARCH-267)',
        labelPosition => {
          const { context, g } = createContext(
            [
              { color: DARK, label: 'A', value: 100 },
              { color: LIGHT, label: 'B', value: 50 },
            ],
            {
              labelPosition,
              showLabels: true,
              theme: {
                label: { color: '#000000', colorOnDark: '#ffffff' },
                labelOutside: { color: '#123456' },
              },
            }
          );

          renderFunnelLayer(context);

          // Regression guard: before ARCH-267 both placements shared `theme.label`, so an
          // outside label fell through to that slice's `color` — the ABSOLUTE black by
          // default, i.e. black text on a dark surface in every dark theme bridge.
          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#123456');
          expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('#123456');
        }
      );

      it.each(['edge', 'right'] as const)(
        'an OUTSIDE (%s) label defaults to the surface-tracking token, not absolute black',
        labelPosition => {
          const { context, g } = createContext([{ color: DARK, label: 'A', value: 100 }], {
            labelPosition,
            showLabels: true,
          });

          renderFunnelLayer(context);

          expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe(
            'var(--nge-chart-on-surface, #1d1b20)'
          );
        }
      );

      it('an INSIDE label keeps the absolute black / white contrast pair by default', () => {
        const { context, g } = createContext(
          [
            { color: DARK, label: 'A', value: 100 },
            { color: LIGHT, label: 'B', value: 50 },
          ],
          { showLabels: true }
        );

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-white, #ffffff)');
        expect(styleOf(labelByLabel(g, 'B'), 'fill')).toBe('var(--nge-chart-black, #000000)');
      });

      it('an outside label still honours the explicit per-datum rung', () => {
        const { context, g } = createContext(
          [{ color: DARK, label: 'A', labelColor: '#ff0000', value: 100 }],
          { labelPosition: 'right', showLabels: true }
        );

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#ff0000');
      });

      it('an outside label still honours the explicit layer-config rung', () => {
        const { context, g } = createContext([{ color: DARK, label: 'A', value: 100 }], {
          labelColor: '#00ff00',
          labelPosition: 'right',
          showLabels: true,
          theme: { labelOutside: { color: '#123456' } },
        });

        renderFunnelLayer(context);

        expect(styleOf(labelByLabel(g, 'A'), 'fill')).toBe('#00ff00');
      });

      it('sizes an outside label from labelOutside typography, not the in-band slice', () => {
        const { context, g } = createContext([{ label: 'A', value: 100 }], {
          labelPosition: 'right',
          showLabels: true,
          theme: {
            label: { fontSize: 9, fontWeight: 400 },
            labelOutside: { fontSize: 18, fontWeight: 800 },
          },
        });

        renderFunnelLayer(context);

        const label = labelByLabel(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('18px');
        expect(styleOf(label, 'font-weight')).toBe('800');
      });
    });

    it('centers labels inside the band by default', () => {
      const { context, g } = createContext(FUNNEL, { showLabels: true });

      renderFunnelLayer(context);

      const label = labelByLabel(g, 'A');
      // Inside labels sit on the band centroid (centered align ⇒ funnelWidth / 2 = 150).
      expect(label.getAttribute('text-anchor')).toBe('middle');
      expect(label.getAttribute('x')).toBe('150');
    });

    it('places labels in the right gutter and narrows the funnel to make room', async () => {
      const { context, g } = createContext(FUNNEL, {
        labelGutter: 100,
        labelPosition: 'right',
        showLabels: true,
      });

      renderFunnelLayer(context);
      await settle();

      // The funnel is drawn into boundedWidth - labelGutter = 300 - 100 = 200, so the
      // widest band (A = max) spans the full 200 and is centered on 100.
      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M0,0 L200,0 L150,100 L50,100 Z');

      // Labels start just past the funnel edge (200 + 12 padding), left-aligned.
      const label = labelByLabel(g, 'A');
      expect(label.getAttribute('text-anchor')).toBe('start');
      expect(label.getAttribute('x')).toBe('212');
    });

    it("labelPosition 'edge' steps each label inward with the funnel's taper", () => {
      const { context, g } = createContext(FUNNEL, {
        labelGutter: 100,
        labelPosition: 'edge',
        showLabels: true,
      });

      renderFunnelLayer(context);

      // funnelWidth = 300 - 100 = 200 ⇒ widths A=200, B=100, C=50; center x = 100.
      // A band's edge at mid-height uses the MEAN of its top and bottom widths:
      //   A mid = (200 + 100) / 2 = 150 ⇒ 100 + 75 + 12 padding = 187
      //   B mid = (100 +  50) / 2 =  75 ⇒ 100 + 37.5 + 12       = 149.5
      //   C mid = ( 50 +  50) / 2 =  50 ⇒ 100 + 25 + 12         = 137
      expect(labelByLabel(g, 'A').getAttribute('x')).toBe('187');
      expect(labelByLabel(g, 'B').getAttribute('x')).toBe('149.5');
      expect(labelByLabel(g, 'C').getAttribute('x')).toBe('137');

      // The defining property vs 'right': the labels are NOT a straight column.
      const xs = ['A', 'B', 'C'].map(l => Number(labelByLabel(g, l).getAttribute('x')));
      expect(xs[0]).toBeGreaterThan(xs[1]);
      expect(xs[1]).toBeGreaterThan(xs[2]);
      expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('start');
    });

    it("labelPosition 'right' keeps every label at one x (a straight column)", () => {
      const { context, g } = createContext(FUNNEL, {
        labelGutter: 100,
        labelPosition: 'right',
        showLabels: true,
      });

      renderFunnelLayer(context);

      const xs = ['A', 'B', 'C'].map(l => labelByLabel(g, l).getAttribute('x'));
      expect(new Set(xs).size).toBe(1);
      expect(xs[0]).toBe('212');
    });

    it("labelPosition 'edge' measures from x = 0 when bands are left-aligned", () => {
      const { context, g } = createContext(FUNNEL, {
        align: 'left',
        labelGutter: 100,
        labelPosition: 'edge',
        showLabels: true,
      });

      renderFunnelLayer(context);

      // Left-aligned bands start at x = 0, so the mid-height right edge IS the mid width.
      expect(labelByLabel(g, 'A').getAttribute('x')).toBe('162'); // 150 + 12
    });

    it('defaults the right gutter to 96px', () => {
      const { context, g } = createContext(FUNNEL, {
        labelPosition: 'right',
        showLabels: true,
      });

      renderFunnelLayer(context);

      // 300 - 96 = 204 wide, so the label starts at 204 + 12 = 216.
      expect(labelByLabel(g, 'A').getAttribute('x')).toBe('216');
    });

    it('ignores labelGutter when labels are inside (funnel keeps the full width)', async () => {
      const { context, g } = createContext(FUNNEL, {
        labelGutter: 100,
        labelPosition: 'inside',
        showLabels: true,
      });

      renderFunnelLayer(context);
      await settle();

      // No gutter is reserved, so band A still spans the full 300.
      expect(bandByLabel(g, 'A').getAttribute('d')).toBe('M0,0 L300,0 L225,100 L75,100 Z');
    });

    it('leaves surviving labels fully opaque when a re-render interrupts the fade-in', () => {
      const { context, g } = createContext(FUNNEL, { showLabels: true });

      // First render starts the enter fade (opacity 0 → 1).
      renderFunnelLayer(context);
      expect(labelByLabel(g, 'A').style.opacity).toBe('0');

      // A second render lands MID-FADE (no settle) — exactly what a resize or a control
      // change does. The interrupted transition must not strand the label part-way.
      renderFunnelLayer(context);

      expect(labelByLabel(g, 'A').style.opacity).toBe('1');
      expect(labelByLabel(g, 'C').style.opacity).toBe('1');
    });

    it('keeps labels opaque across a data change that re-renders mid-fade', async () => {
      const { context, g } = createContext(FUNNEL, { showLabels: true });

      renderFunnelLayer(context);
      await settle();

      const changed = [
        { label: 'A', value: 90 },
        { label: 'B', value: 40 },
        { label: 'C', value: 10 },
      ];
      context.config.data = changed;
      context.data = changed;
      renderFunnelLayer(context);

      // Survivors keep their identity and stay visible while the geometry animates.
      expect(labelByLabel(g, 'A').style.opacity).toBe('1');
    });

    it('re-anchors existing labels when labelPosition flips at runtime', () => {
      const { context, g } = createContext(FUNNEL, { showLabels: true });

      renderFunnelLayer(context);
      expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('middle');

      // Same context object, flipped config — survivors must re-anchor, not keep the
      // anchor they entered with.
      context.config.labelPosition = 'right';
      renderFunnelLayer(context);

      expect(labelByLabel(g, 'A').getAttribute('text-anchor')).toBe('start');
    });
  });

  describe('interaction', () => {
    it('leaves bands non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(FUNNEL);

      renderFunnelLayer(context);

      expect(styleOf(bandByLabel(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered band to the tooltip with its datum, clamped + rounded', () => {
      const { context, g, onTooltip } = createContext(FUNNEL, { tooltip: true });

      renderFunnelLayer(context);
      bandByLabel(g, 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('B');
      expect(event.content.value).toBe(50);
      expect(Number.isInteger(event.position.x)).toBe(true);
      expect(Number.isInteger(event.position.y)).toBe(true);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(FUNNEL, { tooltip: true });

      renderFunnelLayer(context);
      const band = bandByLabel(g, 'A');
      band.dispatchEvent(new MouseEvent('mouseenter'));
      band.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its input index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(FUNNEL, { onClick });

      renderFunnelLayer(context);
      bandByLabel(g, 'C').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(FUNNEL[2]);
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });
  });
});
