import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeFunnelDataPoint } from '../../../../core/config';

import { createFunnelChartConfig } from '../../../../presets/funnel-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Band labels driven by the controls (one band per label, top to bottom). */
const BAND_LABELS = ['Visitors', 'Signups', 'Trials', 'Customers'];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-funnel-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-funnel-chart-interaction-stories',
  standalone: true,
  styleUrl: './funnel-chart-interaction-stories.component.scss',
  templateUrl: './funnel-chart-interaction-stories.component.html',
})
export class NgeFunnelChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/funnel-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Layout
  readonly direction = input<'down' | 'up'>('down');
  readonly align = input<'center' | 'left'>('center');
  readonly gap = input<number>(0);
  /** Gates `neckRatio` — unset (default) means the last band's bottom is flat. */
  readonly useNeckRatio = input<boolean>(false);
  readonly neckRatio = input<number>(0);

  // Layer - Visibility
  readonly showLabels = input<boolean>(true);
  readonly labelPosition = input<'edge' | 'inside' | 'right'>('inside');
  readonly labelGutter = input<number>(96);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Theme - Band Styling
  readonly bandColor = input<string>('');
  readonly bandOpacity = input<number>(1);
  readonly bandStroke = input<string>('');
  readonly bandStrokeWidth = input<number>(1);

  // Theme - Label Styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(500);

  // Sample data as a signal so the button can re-roll it.
  readonly sampleData = signal<NgeFunnelDataPoint[]>(this.buildBands());

  randomizeData(): void {
    this.sampleData.set(this.buildBands());
  }

  // Computed config rebuilds whenever any control (or the re-rolled data) changes.
  readonly config = computed<NgeChartConfig>(() => {
    const bandColor = this.bandColor();

    const baseConfig = createFunnelChartConfig({
      align: this.align(),
      data: this.sampleData(),
      direction: this.direction(),
      gap: this.gap(),
      labelGutter: this.labelGutter(),
      labelPosition: this.labelPosition(),
      neckRatio: this.useNeckRatio() ? this.neckRatio() : undefined,
      showLabels: this.showLabels(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
            width: this.tooltipWidth(),
          }
        : undefined,
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        funnel: {
          band: {
            color: bandColor || undefined,
            // A single-entry palette applies bandColor uniformly across every band
            // (palette[index % 1] === bandColor); empty keeps the default multi-band cycle.
            colors: bandColor ? [bandColor] : undefined,
            opacity: this.bandOpacity(),
            stroke: this.bandStroke() || undefined,
            strokeWidth: this.bandStrokeWidth(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          // Both slices get the control values so the label knobs keep working across every
          // `labelPosition`. 'inside' reads `label` (an absolute contrast pair, derived from the
          // band fill); 'edge' / 'right' read `labelOutside`, which tracks the plot surface.
          // Wiring only one would make the knobs look broken in the other placement.
          labelOutside: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
        },
      },
    };
  });

  // Fresh, roughly-decreasing values for every band — a plausible conversion pipeline.
  private buildBands(): NgeFunnelDataPoint[] {
    let value = 5000 + Math.round(Math.random() * 10000);
    return BAND_LABELS.map((label, index) => {
      if (index > 0) {
        value = Math.round(value * (0.4 + Math.random() * 0.35));
      }
      return { label, value };
    });
  }
}
