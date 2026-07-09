import {
  angleToHourIndex,
  angleToMinute,
  hourIndexToAngle,
  minuteToAngle,
  normalizeAngle,
  pointerAngle,
  polarToXy,
} from './clock-geometry';

describe('clock-geometry', () => {
  describe('normalizeAngle', () => {
    it('wraps into [0, 360)', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-360)).toBe(0);
    });
  });

  describe('pointerAngle', () => {
    // Dial centered at (100, 100); 0° = straight up, increasing clockwise.
    it("reads 0° straight up (12 o'clock)", () => {
      expect(pointerAngle(100, 0, 100, 100)).toBeCloseTo(0);
    });

    it("reads 90° to the right (3 o'clock)", () => {
      expect(pointerAngle(200, 100, 100, 100)).toBeCloseTo(90);
    });

    it("reads 180° straight down (6 o'clock)", () => {
      expect(pointerAngle(100, 200, 100, 100)).toBeCloseTo(180);
    });

    it("reads 270° to the left (9 o'clock)", () => {
      expect(pointerAngle(0, 100, 100, 100)).toBeCloseTo(270);
    });
  });

  describe('angleToHourIndex', () => {
    it('maps the cardinal angles to hour positions', () => {
      expect(angleToHourIndex(0)).toBe(0); // 12
      expect(angleToHourIndex(30)).toBe(1);
      expect(angleToHourIndex(90)).toBe(3);
      expect(angleToHourIndex(180)).toBe(6);
      expect(angleToHourIndex(330)).toBe(11);
    });

    it('snaps to the nearest position and wraps 360 → 0', () => {
      expect(angleToHourIndex(44)).toBe(1); // closer to 30 than 60
      expect(angleToHourIndex(46)).toBe(2); // closer to 60
      expect(angleToHourIndex(359)).toBe(0); // wraps to 12 o'clock
    });
  });

  describe('hourIndexToAngle', () => {
    it('is the inverse of the hour positions', () => {
      expect(hourIndexToAngle(0)).toBe(0);
      expect(hourIndexToAngle(3)).toBe(90);
      expect(hourIndexToAngle(11)).toBe(330);
    });
  });

  describe('angleToMinute', () => {
    it('maps angles to minutes at step 1', () => {
      expect(angleToMinute(0, 1)).toBe(0);
      expect(angleToMinute(90, 1)).toBe(15);
      expect(angleToMinute(180, 1)).toBe(30);
      expect(angleToMinute(270, 1)).toBe(45);
    });

    it('snaps to the configured step', () => {
      expect(angleToMinute(80, 15)).toBe(15); // 80° ≈ 13.3min → nearest 15
      expect(angleToMinute(42, 5)).toBe(5); // 42° = 7.0min → nearest 5
      expect(angleToMinute(48, 5)).toBe(10); // 48° = 8.0min → nearest 10
      expect(angleToMinute(33, 5)).toBe(5); // 33° = 5.5min → nearest 5
    });

    it('wraps a near-full turn back to 0', () => {
      expect(angleToMinute(359, 1)).toBe(0);
      expect(angleToMinute(358, 5)).toBe(0);
    });
  });

  describe('minuteToAngle', () => {
    it('is the inverse of the minute positions', () => {
      expect(minuteToAngle(0)).toBe(0);
      expect(minuteToAngle(15)).toBe(90);
      expect(minuteToAngle(30)).toBe(180);
      expect(minuteToAngle(45)).toBe(270);
    });
  });

  describe('polarToXy', () => {
    it('places points around a center (radius 100)', () => {
      const up = polarToXy(0, 100, 100, 100);
      expect(up.x).toBeCloseTo(100);
      expect(up.y).toBeCloseTo(0);

      const right = polarToXy(90, 100, 100, 100);
      expect(right.x).toBeCloseTo(200);
      expect(right.y).toBeCloseTo(100);

      const down = polarToXy(180, 100, 100, 100);
      expect(down.x).toBeCloseTo(100);
      expect(down.y).toBeCloseTo(200);
    });

    it('round-trips with pointerAngle', () => {
      const point = polarToXy(123, 80, 100, 100);
      expect(pointerAngle(point.x, point.y, 100, 100)).toBeCloseTo(123);
    });
  });
});
