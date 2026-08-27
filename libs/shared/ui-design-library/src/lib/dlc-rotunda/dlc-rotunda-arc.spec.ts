import {
  computeRotundaArc,
  ROTUNDA_DOORWAY_SIZE,
  ROTUNDA_NARROW_DOORWAY_SIZE,
} from './dlc-rotunda-arc';

/** The five positions the design sketch hand-places its doorways at. */
const SKETCH_FAN = [
  { x: -89, y: -36 },
  { x: -56, y: -78 },
  { x: 0, y: -96 },
  { x: 56, y: -78 },
  { x: 89, y: -36 },
];

const DOORWAY_SIZE = ROTUNDA_DOORWAY_SIZE;

/**
 * Half of the NARROWEST phone the app targets — a 320px screen (COG-61). The guard used to
 * assume 187 (a 374px phone), which is why it never noticed that the eight-hall fan clears
 * a 320px screen by five pixels.
 */
const HALF_VIEWPORT = 160;

/**
 * Breathing room the outermost doorway must keep off the screen edge. Without it "fits"
 * means "touches", which is what the old guard permitted.
 */
const EDGE_MARGIN = 12;

/** How far the outer edge of a doorway at `x` sits from the centre line. */
function outerEdge(x: number, doorwaySize: number): number {
  return Math.abs(x) + doorwaySize / 2;
}

function distanceBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe('computeRotundaArc', () => {
  it('should return nothing for an empty bloom', () => {
    expect(computeRotundaArc(0)).toEqual([]);
    expect(computeRotundaArc(-1)).toEqual([]);
  });

  it('should place a single doorway straight above the anchor', () => {
    expect(computeRotundaArc(1)).toEqual([{ delayMs: 100, x: 0, y: -96 }]);
  });

  describe('the five-hall fan', () => {
    it('should reproduce the design sketch within 3px', () => {
      const positions = computeRotundaArc(SKETCH_FAN.length);

      positions.forEach((position, index) => {
        expect(
          distanceBetween(position, SKETCH_FAN[index]),
        ).toBeLessThanOrEqual(3);
      });
    });

    it('should hit the sketch outer and centre positions exactly', () => {
      const positions = computeRotundaArc(5);

      expect(positions[0]).toMatchObject({ x: -89, y: -36 });
      expect(positions[2]).toMatchObject({ x: 0, y: -96 });
      expect(positions[4]).toMatchObject({ x: 89, y: -36 });
    });

    it('should keep every doorway 96px from the anchor', () => {
      computeRotundaArc(5).forEach((position) => {
        // 1px of slack: the positions are rounded to whole pixels for rendering.
        expect(
          Math.abs(Math.hypot(position.x, position.y) - 96),
        ).toBeLessThanOrEqual(1);
      });
    });

    it('should bloom outside-in, so the centre doorway lands last', () => {
      expect(computeRotundaArc(5).map((position) => position.delayMs)).toEqual([
        32, 66, 100, 66, 32,
      ]);
    });

    it('should finish the whole sweep inside the 200ms motion standard, staggered', () => {
      // The last doorway starts at 100ms and runs for 220ms (BLOOM_DURATION_S). Long
      // enough to read as a sequence, short enough that a second tap is not queued behind
      // it — the retune COG-61 exists for.
      expect(
        Math.max(...computeRotundaArc(5).map((position) => position.delayMs)),
      ).toBe(100);
    });
  });

  describe('the gated eight-hall bloom', () => {
    it('should widen the fan rather than crowd it', () => {
      const positions = computeRotundaArc(8);

      for (let index = 1; index < positions.length; index += 1) {
        expect(
          distanceBetween(positions[index - 1], positions[index]),
        ).toBeGreaterThanOrEqual(DOORWAY_SIZE);
      }
    });

    it('should stay clear of the edges of a 320px phone on the narrow tile', () => {
      computeRotundaArc(8, {
        doorwaySize: ROTUNDA_NARROW_DOORWAY_SIZE,
      }).forEach((position) => {
        expect(
          outerEdge(position.x, ROTUNDA_NARROW_DOORWAY_SIZE),
        ).toBeLessThanOrEqual(HALF_VIEWPORT - EDGE_MARGIN);
      });
    });

    it('should need the narrow tile to do it — the full-size fan only just fits', () => {
      // The reason the narrow tile exists (COG-61). At 52px the outermost doorway clears a
      // 320px screen, but by so little that it reads as touching the edge. If this ever
      // stops being true, the viewport switch in `dlc-rotunda.component.ts` is dead weight.
      const widest = Math.max(
        ...computeRotundaArc(8).map((position) =>
          outerEdge(position.x, DOORWAY_SIZE),
        ),
      );

      expect(widest).toBeLessThanOrEqual(HALF_VIEWPORT);
      expect(widest).toBeGreaterThan(HALF_VIEWPORT - EDGE_MARGIN);
    });

    it('should push the arc out past the sketch radius to make room', () => {
      computeRotundaArc(8).forEach((position) => {
        expect(Math.hypot(position.x, position.y)).toBeGreaterThan(96);
      });
    });

    it('should still start the outermost doorways first', () => {
      const delays = computeRotundaArc(8).map((position) => position.delayMs);

      expect(delays[0]).toBeLessThan(delays[3]);
      expect(delays[7]).toBeLessThan(delays[4]);
      expect(delays[0]).toBe(delays[7]);
    });
  });

  describe('every bloom size between five and ten halls', () => {
    it.each([5, 6, 7, 8, 9, 10])(
      'should not overlap doorways at %i halls',
      (count) => {
        const positions = computeRotundaArc(count);

        for (let index = 1; index < positions.length; index += 1) {
          expect(
            distanceBetween(positions[index - 1], positions[index]),
          ).toBeGreaterThanOrEqual(DOORWAY_SIZE);
        }
      },
    );

    it.each([5, 6, 7, 8, 9, 10])(
      'should stay symmetric about the anchor at %i halls',
      (count) => {
        const positions = computeRotundaArc(count);

        positions.forEach((position, index) => {
          const mirrored = positions[positions.length - 1 - index];

          expect(position.x + mirrored.x).toBe(0);
          expect(position.y).toBe(mirrored.y);
        });
      },
    );
  });

  describe('the narrow-phone tile', () => {
    it('should leave the five-hall sketch fan untouched', () => {
      // The overlap guard only ever pushes the radius OUT past the sketch's 96px, so at
      // five halls the sketch wins at either tile size. A narrow phone gets a smaller tile,
      // never a different arc.
      expect(
        computeRotundaArc(5, { doorwaySize: ROTUNDA_NARROW_DOORWAY_SIZE }),
      ).toEqual(computeRotundaArc(5));
    });

    it('should still keep eight halls from overlapping', () => {
      const positions = computeRotundaArc(8, {
        doorwaySize: ROTUNDA_NARROW_DOORWAY_SIZE,
      });

      for (let index = 1; index < positions.length; index += 1) {
        expect(
          distanceBetween(positions[index - 1], positions[index]),
        ).toBeGreaterThanOrEqual(ROTUNDA_NARROW_DOORWAY_SIZE);
      }
    });

    it('should pull the eight-hall fan meaningfully in from the edges', () => {
      const standard = Math.max(
        ...computeRotundaArc(8).map((position) =>
          outerEdge(position.x, DOORWAY_SIZE),
        ),
      );
      const narrow = Math.max(
        ...computeRotundaArc(8, {
          doorwaySize: ROTUNDA_NARROW_DOORWAY_SIZE,
        }).map((position) =>
          outerEdge(position.x, ROTUNDA_NARROW_DOORWAY_SIZE),
        ),
      );

      expect(standard - narrow).toBeGreaterThanOrEqual(12);
    });

    it('should stay above the 44px minimum touch target', () => {
      expect(ROTUNDA_NARROW_DOORWAY_SIZE).toBeGreaterThanOrEqual(44);
    });
  });

  describe('overrides', () => {
    it('should honour an explicit radius and spread', () => {
      const positions = computeRotundaArc(3, { halfSpread: 90, radius: 100 });

      expect(positions[0]).toMatchObject({ x: -100, y: 0 });
      expect(positions[1]).toMatchObject({ x: 0, y: -100 });
      expect(positions[2]).toMatchObject({ x: 100, y: 0 });
    });

    it('should push the radius out further for a larger doorway', () => {
      const standard = computeRotundaArc(8);
      const oversized = computeRotundaArc(8, { doorwaySize: 72 });

      expect(Math.hypot(oversized[0].x, oversized[0].y)).toBeGreaterThan(
        Math.hypot(standard[0].x, standard[0].y),
      );
    });
  });
});
