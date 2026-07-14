/**
 * Chart gesture configuration — opt-in wheel-zoom, drag-pan, and brush-zoom
 * capture. Enabled per chart via `NgeChartConfig.gestures`.
 */
export interface NgeChartGesturesConfig {
  /**
   * Enable rectangle-select zoom: drag draws a rectangle over the plot and the
   * chart zooms to it on release. Shift+drag when `pan` is also enabled;
   * plain drag when it is not.
   */
  brushZoom?: boolean;
  /** Enable drag-to-pan (pointer drag over the plot area) */
  pan?: boolean;
  /** Enable wheel-to-zoom (zooms around the cursor position) */
  zoom?: boolean;
}

/**
 * The band-axis operation carried by a `band-window` gesture event, in band-axis
 * (not pixel) terms so the consumer maps it onto its integer category window.
 * Fractions are 0..1 positions along the band axis.
 */
export type NgeBandWindowOp =
  | {
      /** Brush start along the band axis, 0..1. */
      fromFraction: number;
      /** Brush end along the band axis, 0..1. */
      toFraction: number;
      type: 'brush';
    }
  | {
      /** Cursor position along the band axis, 0..1 — the zoom anchor. */
      anchorFraction: number;
      /** Wheel factor (>1 narrows the visible window = zoom in; <1 widens). */
      factor: number;
      type: 'zoom';
    }
  | {
      /** Signed whole-category shift of the window. */
      deltaCategories: number;
      type: 'pan';
    };

/**
 * Semantic gesture event emitted by the chart.
 *
 * STATELESS by design: every event carries the CURRENT rendered axis domains
 * plus data-space deltas, so a consumer (e.g. NgeScatterChartTransform) can
 * derive the next domains with pure math — no accumulated element transform
 * (deliberately NOT d3-zoom, whose stateful `k/tx/ty` on the DOM node fights
 * the rebuild-from-config render model). Accumulation falls out naturally
 * because the next event carries the new current domains.
 */
export type NgeChartGestureEvent =
  | {
      /** Brush-select release — zoom to exactly this rectangle */
      kind: 'zoom-rect';
      /** Selected X extent in data units, [min, max] */
      xExtent: [number, number];
      /** Selected Y extent in data units, [min, max] */
      yExtent: [number, number];
    }
  | {
      /** Double-click on the plot — consumer should reset to data-driven domains */
      kind: 'reset';
    }
  | {
      /** Which axis is the band/category axis ('x' for vertical bars, 'y' for horizontal). */
      axis: 'x' | 'y';
      /**
       * Category-window gesture for a chart with a band/point (categorical) axis
       * — the bar family and categorical-x line. Band/point scales have no
       * `invert()`, so the band axis WINDOWS by whole categories instead of
       * rescaling continuously. The value (continuous) axis is NOT carried here:
       * it auto-fits to the visible window on the next render (so bars never
       * clip their zero baseline). Index-based per ARCH-174 — the consumer maps
       * these renderer intents onto its integer `[startIndex, endIndex]` window.
       */
      kind: 'band-window';
      /** The band-axis operation, expressed in band-axis (not pixel) terms. */
      op: NgeBandWindowOp;
    }
  | {
      /** Which range-axis brush drove this. */
      axis: 'x' | 'y';
      /**
       * The new focus domain the plot should zoom to, [min, max] in data units.
       * For a time axis these are epoch milliseconds.
       */
      domain: [number, number];
      /**
       * Continuous zoom from a range-axis brush drag — a handle resize or a window
       * pan on the full-range slider axis. The consumer sets only this axis's
       * domain (its focus/zoom); the other axis is untouched.
       */
      kind: 'range-zoom';
    }
  | {
      /** Zoom factor for this event, clamped to [0.5, 2] (>1 = zoom in) */
      factor: number;
      /** Cursor position in data units — the zoom anchor */
      focus: { x: number; y: number };
      kind: 'zoom';
      /** Current rendered X domain */
      xDomain: [number, number];
      /** Current rendered Y domain */
      yDomain: [number, number];
    }
  | {
      kind: 'pan';
      /** Pointer movement in X data units (positive = dragged right) */
      xDelta: number;
      /** Current rendered X domain */
      xDomain: [number, number];
      /** Pointer movement in Y data units (positive = dragged toward +y) */
      yDelta: number;
      /** Current rendered Y domain */
      yDomain: [number, number];
    };

/**
 * Gesture handler threaded into renderChart (same pattern as NgeTooltipHandlers).
 */
export interface NgeChartGestureHandlers {
  onGesture: (event: NgeChartGestureEvent) => void;
}
