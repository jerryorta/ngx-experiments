/**
 * A single day in a mini-month. Carries an `eventCount` and a derived
 * `densityLevel` (0..3) so a view can render a heat-map dot without re-counting.
 */
export interface MiniMonthDay {
  date: Date;
  dayOfMonth: number;
  /** 0 = none, 1 = 1–2, 2 = 3–4, 3 = 5+ events. */
  densityLevel: number;
  eventCount: number;
  isAnchor: boolean;
  isOutOfMonth: boolean;
}

/** One of the twelve mini-month grids in the year view. */
export interface MiniMonth {
  label: string;
  /** 0-based month index (0 = January). */
  monthIndex: number;
  weekdayLabels: string[];
  /** Six rows of seven day cells (the fixed month matrix). */
  weeks: MiniMonthDay[][];
}

/** The full year view: the year number plus its twelve mini-months. */
export interface YearViewModel {
  months: MiniMonth[];
  year: number;
}
