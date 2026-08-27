/**
 * Geometry for the Rotunda's radial bloom.
 *
 * The oculus is an anchor the reader learns once and never has to find again; its
 * doorways fan out along an upward arc so every hall lands inside a single thumb
 * sweep. Keeping the maths pure — and out of the component — is what lets the fan be
 * asserted against the design sketch in tests rather than eyeballed in a browser.
 */

/** Where one doorway comes to rest, measured from the bloom anchor at the oculus. */
export interface RotundaArcPosition {
  /** How long this doorway is held back, so the bloom opens outside-in. */
  delayMs: number;
  /** Horizontal offset in px; positive is right of the anchor. */
  x: number;
  /** Vertical offset in px; negative is above the anchor. */
  y: number;
}

/** Overrides for the bloom's shape — used by tests and by later motion polish. */
export interface RotundaArcOptions {
  /** Edge length of one doorway in px; drives the overlap guard. */
  doorwaySize?: number;
  /** Half the total fan angle, in degrees. */
  halfSpread?: number;
  /** Smallest clearance allowed between two adjacent doorways, in px. */
  minGap?: number;
  /** Distance from the anchor to a doorway centre, in px. */
  radius?: number;
}

/**
 * The design sketch's fan — five doorways at `(-89,-36) (-56,-78) (0,-96) (56,-78)
 * (89,-36)`. Every one of those points sits 96px from the anchor, spread across ±68°.
 */
const SKETCH_COUNT = 5;
const SKETCH_HALF_SPREAD = 68;
const SKETCH_RADIUS = 96;

/**
 * A doorway's edge length, and the metric the whole fan is sized against — the geometry
 * owns it so the arc, the tile and the overlap guard can never disagree about it.
 *
 * Two values, because the fan has to fit the phone it is drawn on (COG-61). At eight
 * doorways the 52px tile puts a doorway's outer edge 155px from centre, which clears a 320px
 * screen by 5px — true, but it reads as touching the edge. The narrow tile moves that to
 * 138px. 46px still clears the 44px minimum touch target, and the five-hall fan is unaffected
 * either way: at both sizes the overlap guard resolves below {@link SKETCH_RADIUS}, so the
 * sketch's own geometry wins.
 *
 * ⚠️ The arc carries the atrium plus one doorway per visible hall — seven by default, ten
 * with all three trial flags on. The narrow tile stops rescuing it past nine: at ten the
 * outer edge lands 171px from centre, past the 160px half of a 320px screen. Ten halls need
 * a second row or a wider fan than `MAX_HALF_SPREAD` allows, not another doorway.
 */
export const ROTUNDA_DOORWAY_SIZE = 52;
export const ROTUNDA_NARROW_DOORWAY_SIZE = 46;

/** Widths at or below this get {@link ROTUNDA_NARROW_DOORWAY_SIZE}. */
export const ROTUNDA_NARROW_VIEWPORT_QUERY = '(max-width: 380px)';

const MIN_GAP = 2;

/** Stop short of a half-dome, or the outer doorways leave the opening thumb's reach. */
const MAX_HALF_SPREAD = 84;
const SPREAD_GROWTH_PER_DOORWAY = 5.33;

/**
 * The centre doorway lands last; each ring outward from it starts sooner.
 *
 * Tuned against the design system's 200ms standard (COG-61): the centre doorway now
 * finishes at 100 + 220 = 320ms rather than 450ms. Long enough to read as a sequence
 * opening outside-in, short enough that a reader who taps twice is not waiting on it.
 */
const CENTRE_DELAY_MS = 100;
const DELAY_STEP_MS = 34;

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Lay `count` doorways out along the bloom arc, outermost-first.
 *
 * Defaults reproduce the design sketch exactly at five doorways. Beyond that the fan
 * widens and pushes outward on its own, so the gated eight-hall case still reads as
 * one arc instead of a pile of overlapping tiles.
 */
export function computeRotundaArc(
  count: number,
  options: RotundaArcOptions = {},
): RotundaArcPosition[] {
  if (count <= 0) {
    return [];
  }

  const halfSpread = options.halfSpread ?? fitHalfSpread(count);
  const stepDeg = count === 1 ? 0 : (halfSpread * 2) / (count - 1);
  const minChord =
    (options.doorwaySize ?? ROTUNDA_DOORWAY_SIZE) + (options.minGap ?? MIN_GAP);
  const radius = options.radius ?? fitRadius(stepDeg, minChord);
  const centreIndex = (count - 1) / 2;

  const positions: RotundaArcPosition[] = [];

  for (let index = 0; index < count; index += 1) {
    const angleRad =
      (count === 1 ? 0 : -halfSpread + index * stepDeg) * DEGREES_TO_RADIANS;
    const ring = Math.abs(index - centreIndex);

    positions.push({
      delayMs: Math.max(0, Math.round(CENTRE_DELAY_MS - DELAY_STEP_MS * ring)),
      x: roundOffset(radius * Math.sin(angleRad)),
      y: roundOffset(-radius * Math.cos(angleRad)),
    });
  }

  return positions;
}

/**
 * Round to a whole pixel, collapsing the negative zero that trigonometry hands back at
 * the top and edges of the arc — it renders identically but compares as its own value.
 */
function roundOffset(value: number): number {
  const rounded = Math.round(value);

  return rounded === 0 ? 0 : rounded;
}

/** Widen the fan as halls are added, so more doorways do not mean a tighter crowd. */
function fitHalfSpread(count: number): number {
  const extraDoorways = Math.max(0, count - SKETCH_COUNT);

  return Math.min(
    MAX_HALF_SPREAD,
    SKETCH_HALF_SPREAD + extraDoorways * SPREAD_GROWTH_PER_DOORWAY,
  );
}

/**
 * Push the arc outward until adjacent doorway centres clear `minChord`. Measured as a
 * straight chord rather than arc length, because the doorways are square tiles laid on
 * the curve, not segments of it.
 */
function fitRadius(stepDeg: number, minChord: number): number {
  if (stepDeg <= 0) {
    return SKETCH_RADIUS;
  }

  const halfStepRad = (stepDeg / 2) * DEGREES_TO_RADIANS;

  return Math.max(
    SKETCH_RADIUS,
    Math.ceil(minChord / (2 * Math.sin(halfStepRad))),
  );
}
