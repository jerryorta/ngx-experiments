import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type {
  NgeGaugeDataPoint,
  NgeGaugeLayerConfig,
  NgeGaugeThreshold,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeGaugeLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderGaugeLayer } from './render-gauge-layer';

type GaugeContext = NgeChartLayerContext<
  NgeGaugeDataPoint,
  NgeGaugeLayerConfig,
  NgeGaugeLayerTheme | undefined
>;

interface ContextOptions {
  endAngle?: number;
  indicator?: NgeGaugeLayerConfig['indicator'];
  innerRadius?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  shape?: NgeGaugeLayerConfig['shape'];
  showValueLabel?: boolean;
  startAngle?: number;
  theme?: NgeGaugeLayerTheme;
  thresholds?: NgeGaugeThreshold[];
  tooltip?: boolean;
}

// Square bounds → cx = cy = 100, outerRadius = 100.
const DIMENSIONS = {
  boundedHeight: 200,
  boundedWidth: 200,
  height: 220,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 220,
};

// The default speedometer sweep (radial-bar convention: 0 = 12 o'clock, clockwise).
const DEFAULT_START_ANGLE = -0.75 * Math.PI;
const DEFAULT_END_ANGLE = 0.75 * Math.PI;

/** A gauge on a 0–100 range at the half-way mark → the value angle lands at 0 (straight up). */
const GAUGE: NgeGaugeDataPoint = { max: 100, min: 0, units: '%', value: 50 };

function createContext(
  datum: NgeGaugeDataPoint,
  options: ContextOptions = {}
): { context: GaugeContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeGaugeLayerConfig = {
    data: datum,
    endAngle: options.endAngle,
    indicator: options.indicator,
    innerRadius: options.innerRadius,
    onClick: options.onClick,
    renderer: renderGaugeLayer,
    shape: options.shape,
    showValueLabel: options.showValueLabel,
    startAngle: options.startAngle,
    thresholds: options.thresholds,
    type: 'gauge',
  };

  // Gauge ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: GaugeContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data: [datum],
    dimensions: DIMENSIONS,
    margins: { bottom: 10, left: 10, right: 10, top: 10 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeGaugeDataPoint) => ({ label: d.label ?? 'Value', value: d.value }),
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

/** The datum d3 bound to a mark element. */
function markOf<T>(node: Element): T {
  return (node as unknown as { __data__: T }).__data__;
}

/** The single `.nge-gauge-value` arc path. */
function valuePath(g: SVGGElement): SVGPathElement {
  const node = g.querySelector<SVGPathElement>('.nge-gauge-value');
  if (!node) {
    throw new Error('No gauge value arc');
  }
  return node;
}

/**
 * Real-timer wait so d3 transitions run to completion. The value arc `d` (attrTween) and
 * the needle transform / linear fill width are applied over the 300ms enter duration; the
 * bound datum + fills apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** The angle a value maps to on the default sweep (mirrors the impl's value → angle scale). */
function angleFor(value: number, min = 0, max = 100): number {
  return (
    DEFAULT_START_ANGLE + ((value - min) / (max - min)) * (DEFAULT_END_ANGLE - DEFAULT_START_ANGLE)
  );
}

/** Parse the rendered `rotate(<deg>)` transform of the needle line. */
function rotationDeg(el: Element): number {
  const match = /rotate\(([-\d.]+)\)/.exec(el.getAttribute('transform') ?? '');
  return match ? Number(match[1]) : NaN;
}

describe('renderGaugeLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty / invalid datum guard', () => {
    it('is a no-op when the datum is missing (does not throw)', () => {
      const { context, g } = createContext(GAUGE);
      // Force an absent datum (renderer reads config.data).
      context.config.data = undefined as unknown as NgeGaugeDataPoint;

      expect(() => renderGaugeLayer(context)).not.toThrow();
      expect(g.querySelectorAll('.nge-gauge-container')).toHaveLength(0);
    });

    it('tears the singleton down when the datum becomes absent', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      expect(g.querySelectorAll('.nge-gauge-container')).toHaveLength(1);

      context.config.data = undefined as unknown as NgeGaugeDataPoint;
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-container')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(0);
    });
  });

  describe('structure (arc, default)', () => {
    it('centers the container in the bounded area', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);

      expect(g.querySelector('.nge-gauge-container')?.getAttribute('transform')).toBe(
        'translate(100,100)'
      );
    });

    it('draws a track, a value arc, and the value label by default', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-track')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-label')).toHaveLength(1);
      // No needle in the default fill indicator.
      expect(g.querySelectorAll('.nge-gauge-needle')).toHaveLength(0);
    });

    it('re-renders idempotently (singleton — no duplicate marks)', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-container')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-track')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-label')).toHaveLength(1);
    });
  });

  describe('arc geometry (value → angle)', () => {
    it('maps the value to an angle within the configured sweep (50% → straight up)', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);

      const geom = markOf<{ endAngle: number; startAngle: number }>(valuePath(g));
      expect(geom.startAngle).toBeCloseTo(DEFAULT_START_ANGLE, 6);
      // 50 of [0, 100] over a symmetric sweep → the midpoint angle (0 = 12 o'clock).
      expect(geom.endAngle).toBeCloseTo(0, 6);
      expect(geom.endAngle).toBeGreaterThanOrEqual(DEFAULT_START_ANGLE);
      expect(geom.endAngle).toBeLessThanOrEqual(DEFAULT_END_ANGLE);
    });

    it('honors a custom startAngle / endAngle sweep', () => {
      const { context, g } = createContext(GAUGE, { endAngle: Math.PI, startAngle: 0 });

      renderGaugeLayer(context);

      const geom = markOf<{ endAngle: number; startAngle: number }>(valuePath(g));
      expect(geom.startAngle).toBeCloseTo(0, 6);
      // 50 of [0, 100] over [0, π] → π/2.
      expect(geom.endAngle).toBeCloseTo(Math.PI / 2, 6);
    });

    it('draws a NaN-free value-arc path', async () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      await settle();

      expect(valuePath(g).getAttribute('d') ?? '').not.toContain('NaN');
      expect((valuePath(g).getAttribute('d') ?? '').length).toBeGreaterThan(0);
    });
  });

  describe('value clamping (NaN / negative / over-max)', () => {
    it('collapses a NaN value to the min angle (start of the sweep)', () => {
      const { context, g } = createContext({ max: 100, min: 0, value: NaN });

      renderGaugeLayer(context);

      expect(markOf<{ endAngle: number }>(valuePath(g)).endAngle).toBeCloseTo(
        DEFAULT_START_ANGLE,
        6
      );
    });

    it('clamps a below-min value to the min angle', () => {
      const { context, g } = createContext({ max: 100, min: 0, value: -50 });

      renderGaugeLayer(context);

      expect(markOf<{ endAngle: number }>(valuePath(g)).endAngle).toBeCloseTo(
        DEFAULT_START_ANGLE,
        6
      );
    });

    it('clamps an over-max value to the max angle (end of the sweep)', () => {
      const { context, g } = createContext({ max: 100, min: 0, value: 150 });

      renderGaugeLayer(context);

      expect(markOf<{ endAngle: number }>(valuePath(g)).endAngle).toBeCloseTo(DEFAULT_END_ANGLE, 6);
    });

    it('keeps the value-arc path NaN-free for a NaN value', async () => {
      const { context, g } = createContext({ max: 100, min: 0, value: NaN });

      renderGaugeLayer(context);
      await settle();

      expect(valuePath(g).getAttribute('d') ?? '').not.toContain('NaN');
    });

    it('collapses +Infinity to the min angle (non-finite → min) and stays NaN-free', async () => {
      const { context, g } = createContext({ max: 100, min: 0, value: Infinity });

      renderGaugeLayer(context);
      expect(markOf<{ endAngle: number }>(valuePath(g)).endAngle).toBeCloseTo(
        DEFAULT_START_ANGLE,
        6
      );
      await settle();
      expect(valuePath(g).getAttribute('d') ?? '').not.toContain('NaN');
    });

    it('collapses -Infinity to the min angle (non-finite → min)', () => {
      const { context, g } = createContext({ max: 100, min: 0, value: -Infinity });

      renderGaugeLayer(context);

      expect(markOf<{ endAngle: number }>(valuePath(g)).endAngle).toBeCloseTo(
        DEFAULT_START_ANGLE,
        6
      );
    });
  });

  describe('indicator: needle', () => {
    it('draws a needle (not a value arc) rotated to the value angle', () => {
      const { context, g } = createContext(GAUGE, { indicator: 'needle' });

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-needle')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(0);
      // 50% → the value angle lands at 0 (straight up).
      expect(markOf<{ angle: number }>(g.querySelector('.nge-gauge-needle')!).angle).toBeCloseTo(
        0,
        6
      );
    });

    it('sizes the needle to the outer radius (tip reaches the rim)', () => {
      const { context, g } = createContext(GAUGE, { indicator: 'needle' });

      renderGaugeLayer(context);

      // outerRadius = min(200, 200) / 2 = 100 → tip at (0, -100) before rotation.
      expect(Number(g.querySelector('.nge-gauge-needle')!.getAttribute('y2'))).toBeCloseTo(
        -100,
        6
      );
    });

    it('pulls the inner endpoint out to a label-sized hub (clear of the center, close to the label)', () => {
      const { context, g } = createContext(GAUGE, { indicator: 'needle' });

      renderGaugeLayer(context);

      // Default label fontSize 20 × 1.4 → hub at (0, -28), well inside innerRadiusPx (65).
      expect(Number(g.querySelector('.nge-gauge-needle')!.getAttribute('y1'))).toBeCloseTo(-28, 6);
    });

    it('caps the hub at innerRadiusPx when the label font is large relative to the ring', () => {
      const { context, g } = createContext(GAUGE, {
        indicator: 'needle',
        innerRadius: 0.1, // innerRadiusPx = 10, well under the default hub (28)
      });

      renderGaugeLayer(context);

      expect(Number(g.querySelector('.nge-gauge-needle')!.getAttribute('y1'))).toBeCloseTo(-10, 6);
    });

    it('swaps the value arc for a needle when the indicator flips at runtime', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(1);

      context.config.indicator = 'needle';
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-gauge-needle')).toHaveLength(1);
    });

    it('rotates the rendered needle transform to match the value (25% and 75%)', async () => {
      const quarter = createContext({ max: 100, min: 0, value: 25 }, { indicator: 'needle' });
      renderGaugeLayer(quarter.context);
      await settle();
      // 25% of the 270° sweep → -67.5° from straight up.
      expect(rotationDeg(quarter.g.querySelector('.nge-gauge-needle')!)).toBeCloseTo(-67.5, 1);

      const threeQuarter = createContext({ max: 100, min: 0, value: 75 }, { indicator: 'needle' });
      renderGaugeLayer(threeQuarter.context);
      await settle();
      // 75% → +67.5°, the mirror of 25% — proving the needle rotates WITH the value.
      expect(rotationDeg(threeQuarter.g.querySelector('.nge-gauge-needle')!)).toBeCloseTo(67.5, 1);
    });
  });

  describe('shape: linear (progress bar)', () => {
    it('draws a rail + fill (not arc marks)', () => {
      const { context, g } = createContext(GAUGE, { shape: 'linear' });

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-rail')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-fill')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-gauge-track')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(0);
    });

    it('sizes the fill width proportional to the value (30 of [0,100] → 0.3 · width)', () => {
      const { context, g } = createContext({ max: 100, min: 0, value: 30 }, { shape: 'linear' });

      renderGaugeLayer(context);

      // boundedWidth 200 → widthScale(30) = 60; rail spans the full 200.
      expect(markOf<{ width: number }>(g.querySelector('.nge-gauge-fill')!).width).toBeCloseTo(
        60,
        6
      );
      expect(Number(g.querySelector('.nge-gauge-rail')!.getAttribute('width'))).toBeCloseTo(
        200,
        6
      );
    });

    it('animates the fill width to its target', async () => {
      const { context, g } = createContext({ max: 100, min: 0, value: 50 }, { shape: 'linear' });

      renderGaugeLayer(context);
      await settle();

      expect(Number(g.querySelector('.nge-gauge-fill')!.getAttribute('width'))).toBeCloseTo(
        100,
        0
      );
    });

    it('swaps arc marks for the rail when the shape flips at runtime', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      expect(g.querySelectorAll('.nge-gauge-track')).toHaveLength(1);

      context.config.shape = 'linear';
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-track')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-gauge-rail')).toHaveLength(1);
    });
  });

  describe('update branch (value change re-render)', () => {
    it('reuses the value arc and eases from the prior geometry (arc / fill)', async () => {
      const { context, g } = createContext({ max: 100, min: 0, value: 20 });

      renderGaugeLayer(context);
      await settle();
      const before = valuePath(g);
      const dBefore = before.getAttribute('d');

      context.config.data = { max: 100, min: 0, value: 80 };
      renderGaugeLayer(context);

      // Same element reused (singleton UPDATE branch, not a recreate).
      expect(valuePath(g)).toBe(before);
      expect(g.querySelectorAll('.nge-gauge-value')).toHaveLength(1);
      // New target bound; geometry has NOT yet moved — it eases FROM the prior `d`, not a
      // birth reset (proves the `_a1` cached-from-last-angle animate-from).
      expect(markOf<{ endAngle: number }>(before).endAngle).toBeCloseTo(angleFor(80), 6);
      expect(before.getAttribute('d')).toBe(dBefore);

      await settle();
      // Eased to the new value: geometry changed, still NaN-free.
      expect(before.getAttribute('d')).not.toBe(dBefore);
      expect(before.getAttribute('d') ?? '').not.toContain('NaN');
    });

    it('reuses the needle and eases from the prior rotation (arc / needle)', async () => {
      const { context, g } = createContext(
        { max: 100, min: 0, value: 20 },
        { indicator: 'needle' }
      );

      renderGaugeLayer(context);
      await settle();
      const before = g.querySelector<SVGLineElement>('.nge-gauge-needle')!;
      const transformBefore = before.getAttribute('transform');
      expect(rotationDeg(before)).toBeCloseTo((angleFor(20) * 180) / Math.PI, 1);

      context.config.data = { max: 100, min: 0, value: 80 };
      renderGaugeLayer(context);

      expect(g.querySelector('.nge-gauge-needle')).toBe(before);
      expect(g.querySelectorAll('.nge-gauge-needle')).toHaveLength(1);
      expect(markOf<{ angle: number }>(before).angle).toBeCloseTo(angleFor(80), 6);
      // Rotation has NOT yet moved — eases FROM the prior angle (the `_deg` cached-from).
      expect(before.getAttribute('transform')).toBe(transformBefore);

      await settle();
      expect(rotationDeg(before)).toBeCloseTo((angleFor(80) * 180) / Math.PI, 1);
    });

    it('reuses the fill and eases its width from the prior value (linear)', async () => {
      const { context, g } = createContext({ max: 100, min: 0, value: 20 }, { shape: 'linear' });

      renderGaugeLayer(context);
      await settle();
      const before = g.querySelector<SVGRectElement>('.nge-gauge-fill')!;
      // widthScale(20) over boundedWidth 200 = 40.
      expect(Number(before.getAttribute('width'))).toBeCloseTo(40, 0);

      context.config.data = { max: 100, min: 0, value: 80 };
      renderGaugeLayer(context);

      expect(g.querySelector('.nge-gauge-fill')).toBe(before);
      expect(g.querySelectorAll('.nge-gauge-fill')).toHaveLength(1);
      expect(markOf<{ width: number }>(before).width).toBeCloseTo(160, 6);
      // Width has NOT yet moved — eases FROM the prior width (40), not a reset to 0 (birth).
      expect(Number(before.getAttribute('width'))).toBeCloseTo(40, 0);

      await settle();
      expect(Number(before.getAttribute('width'))).toBeCloseTo(160, 0);
    });
  });

  describe('threshold bands', () => {
    const THRESHOLDS: NgeGaugeThreshold[] = [{ value: 33 }, { value: 66 }, { value: 100 }];

    it('draws one arc band per threshold', () => {
      const { context, g } = createContext(GAUGE, { thresholds: THRESHOLDS });

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-arc-band')).toHaveLength(3);
    });

    it('draws one rail band per threshold in linear mode', () => {
      const { context, g } = createContext(GAUGE, { shape: 'linear', thresholds: THRESHOLDS });

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-linear-band')).toHaveLength(3);
    });

    it('colors the bands from the theme threshold palette (low → high)', () => {
      const { context, g } = createContext(GAUGE, { thresholds: THRESHOLDS });

      renderGaugeLayer(context);

      const fills = Array.from(g.querySelectorAll('.nge-gauge-arc-band')).map(node =>
        styleOf(node, 'fill')
      );
      expect(fills).toEqual([
        'var(--chart-primary)',
        'var(--chart-tertiary)',
        'var(--chart-error)',
      ]);
    });

    it('honors a per-threshold color override', () => {
      const { context, g } = createContext(GAUGE, {
        thresholds: [{ color: '#abcdef', value: 50 }, { value: 100 }],
      });

      renderGaugeLayer(context);

      expect(styleOf(g.querySelectorAll('.nge-gauge-arc-band')[0], 'fill')).toBe('#abcdef');
    });

    it('reconciles the band count when the thresholds change', () => {
      const { context, g } = createContext(GAUGE, { thresholds: THRESHOLDS });

      renderGaugeLayer(context);
      expect(g.querySelectorAll('.nge-gauge-arc-band')).toHaveLength(3);

      context.config.thresholds = [{ value: 50 }, { value: 100 }];
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-arc-band')).toHaveLength(2);
    });

    it('tiles each band across its [from, to] value range (ascending from the datum min)', () => {
      const { context, g } = createContext(GAUGE, { thresholds: THRESHOLDS });

      renderGaugeLayer(context);

      const ranges = Array.from(g.querySelectorAll('.nge-gauge-arc-band')).map(node => {
        const band = markOf<{ from: number; to: number }>(node);
        return [band.from, band.to];
      });
      // Band N spans [prior upper bound (or min), threshold N] — tiling [0, 33, 66, 100].
      expect(ranges).toEqual([
        [0, 33],
        [33, 66],
        [66, 100],
      ]);
    });
  });

  describe('value label', () => {
    it('renders the value + units by default', () => {
      const { context, g } = createContext({ max: 100, min: 0, units: '%', value: 72 });

      renderGaugeLayer(context);

      expect(g.querySelector('.nge-gauge-label')?.textContent).toBe('72%');
    });

    it('omits the label when showValueLabel is false', () => {
      const { context, g } = createContext(GAUGE, { showValueLabel: false });

      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-label')).toHaveLength(0);
    });

    it('drops the label when showValueLabel toggles off at runtime', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      expect(g.querySelectorAll('.nge-gauge-label')).toHaveLength(1);

      context.config.showValueLabel = false;
      renderGaugeLayer(context);

      expect(g.querySelectorAll('.nge-gauge-label')).toHaveLength(0);
    });

    it('centers the needle-mode arc label at the pivot (y = 0), clear of the offset needle', () => {
      const { context, g } = createContext(GAUGE, { indicator: 'needle' });

      renderGaugeLayer(context);

      // The needle's inner endpoint is pulled out to innerRadiusPx, so the true center (y = 0)
      // is free for the label — same as the fill indicator.
      expect(Number(g.querySelector('.nge-gauge-label')!.getAttribute('y'))).toBe(0);
    });

    it('centers the fill-mode arc label at the pivot (y = 0)', () => {
      const { context, g } = createContext(GAUGE); // default indicator 'fill'

      renderGaugeLayer(context);

      expect(Number(g.querySelector('.nge-gauge-label')!.getAttribute('y'))).toBe(0);
    });
  });

  describe('color resolution (via .style)', () => {
    it('fills the value arc with the theme primary token by default', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);

      expect(styleOf(valuePath(g), 'fill')).toBe('var(--chart-primary)');
    });

    it('honors a per-datum color override on the value arc', () => {
      const { context, g } = createContext({
        color: 'var(--override)',
        max: 100,
        min: 0,
        value: 50,
      });

      renderGaugeLayer(context);

      expect(styleOf(valuePath(g), 'fill')).toBe('var(--override)');
    });

    it('reads the track color from the theme', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);

      expect(styleOf(g.querySelector('.nge-gauge-track')!, 'fill')).toBe(
        'var(--chart-surface-container-highest)'
      );
    });
  });

  describe('interaction', () => {
    it('routes a hover to the tooltip with the clamped value', () => {
      const { context, g, onTooltip } = createContext(
        { max: 100, min: 0, value: 150 },
        {
          tooltip: true,
        }
      );

      renderGaugeLayer(context);
      g.dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      // 150 clamped into [0, 100] → the tooltip content carries 100, not 150.
      expect(event.content.value).toBe(100);
    });

    it('follows the pointer — a mousemove tracks the cursor x', () => {
      const { context, g, onTooltip } = createContext(GAUGE, { tooltip: true });

      renderGaugeLayer(context);

      g.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 40 }));
      const firstX = (onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent).position.x;

      g.dispatchEvent(new MouseEvent('mousemove', { clientX: 140, clientY: 40 }));
      const secondX = (onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent).position.x;

      // The bubble tracks the cursor: moving right shifts the tooltip x right.
      expect(secondX).not.toBe(firstX);
      expect(secondX).toBeGreaterThan(firstX);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(GAUGE, { tooltip: true });

      renderGaugeLayer(context);
      g.dispatchEvent(new MouseEvent('mouseenter'));
      g.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clamped datum and index 0', () => {
      const onClick = jest.fn();
      const { context, g } = createContext({ max: 100, min: 0, value: 150 }, { onClick });

      renderGaugeLayer(context);
      g.dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].index).toBe(0);
      expect(onClick.mock.calls[0][0].data.value).toBe(100);
    });

    it('leaves the gauge non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(GAUGE);

      renderGaugeLayer(context);
      g.dispatchEvent(new MouseEvent('click'));

      expect(styleOf(g, 'cursor')).toBe('default');
    });

    it('does not emit a tooltip on hover when the tooltip is disabled', () => {
      const onTooltip = jest.fn();
      const { context, g } = createContext(GAUGE, { onTooltip, tooltip: true });
      // A handler is present, but the tooltip is disabled → hover must not emit
      // (covers the `bounds.on('mouseenter', null)` detach branch).
      context.tooltipConfig!.enabled = false;

      renderGaugeLayer(context);
      g.dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).not.toHaveBeenCalled();
    });
  });
});
