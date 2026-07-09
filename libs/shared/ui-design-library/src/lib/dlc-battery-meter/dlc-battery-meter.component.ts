import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type DlcBatteryMeterSize = 'lg' | 'md' | 'sm';

/**
 * Progress state for a single battery segment.
 * Core states: 'default' (not started), 'in-progress', 'done'.
 * Pass a custom colorMap input to add or override any state colour.
 */
export type DlcBatteryState = 'default' | 'done' | 'in-progress' | (string & {});

/**
 * Default colour map. Uses theme CSS variables with color-mix to produce
 * darker shades of the same hue for error and success.
 * Override any entry by passing a colorMap input to the component.
 */
export const DEFAULT_BATTERY_COLOR_MAP: Record<string, string> = {
  default: '#FF1744',
  done: '#00C853',
  'in-progress': '#FFD600',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-valuemax]': 'states().length',
    '[attr.aria-valuemin]': '0',
    '[attr.aria-valuenow]': 'doneCount()',
    '[class.dlc-battery-meter--lg]': 'size() === "lg"',
    '[class.dlc-battery-meter--md]': 'size() === "md"',
    '[class.dlc-battery-meter--sm]': 'size() === "sm"',
    class: 'dlc-battery-meter',
    role: 'meter',
  },
  imports: [],
  selector: 'dlc-battery-meter',
  styleUrl: './dlc-battery-meter.component.scss',
  templateUrl: './dlc-battery-meter.component.html',
})
export class DlcBatteryMeterComponent {
  /** Estimated closing date — displayed beside the battery */
  readonly trailingLabel = input<null | string>(null);

  /**
   * Override individual state colours. Merged on top of DEFAULT_BATTERY_COLOR_MAP.
   * Keys are state names; values are any valid CSS color (including var() references).
   * Example: { done: 'var(--dlc-primary)', 'blocked': '#ff0000' }
   */
  readonly colorMap = input<Record<string, string>>({});

  /** Whether to show the positive terminal nub on the right */
  readonly showIcon = input(true);

  /** Size variant: sm for CRM rows, md for cards, lg for headers */
  readonly size = input<DlcBatteryMeterSize>('md');

  /**
   * One entry per item being tracked. Each value is a state name resolved
   * against the color map. The number of segments equals the array length.
   */
  readonly states = input<DlcBatteryState[]>([]);

  /** Merged color map: defaults overridden by any provided colorMap input */
  readonly resolvedColorMap = computed(() => ({
    ...DEFAULT_BATTERY_COLOR_MAP,
    ...this.colorMap(),
  }));

  /** Number of segments in the 'done' state — used for aria-valuenow */
  readonly doneCount = computed(() => this.states().filter(s => s === 'done').length);

  /**
   * States sorted for display: done (green) → in-progress (yellow) → everything else (red).
   * The raw states() input is preserved for aria attributes; only rendering is reordered.
   */
  readonly displayStates = computed(() => {
    const order: Record<string, number> = { done: 0, 'in-progress': 1 };
    return [...this.states()].sort((a, b) => (order[a] ?? 2) - (order[b] ?? 2));
  });

  /** Color of the last display segment — applied to the terminal nub */
  readonly lastSegmentColor = computed(() => {
    const states = this.displayStates();
    return states.length > 0
      ? this.segmentColor(states[states.length - 1])
      : 'var(--dlc-surface-container-high)';
  });

  /** Accessible label summarising progress and optional closing date */
  readonly ariaLabel = computed(() => {
    const total = this.states().length;
    const done = this.doneCount();
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const base = `${done} of ${total} done (${pct}%)`;
    const date = this.trailingLabel();
    return date ? `${base} — ${date}` : base;
  });

  /** Resolves a state name to its CSS color string */
  segmentColor(state: string): string {
    return this.resolvedColorMap()[state] ?? DEFAULT_BATTERY_COLOR_MAP['default'];
  }
}
