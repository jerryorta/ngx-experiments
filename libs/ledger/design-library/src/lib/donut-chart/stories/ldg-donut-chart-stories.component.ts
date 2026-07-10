import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { LdgDonutSegment } from '../ldg-donut-chart.component';

import { LdgDonutChartComponent } from '../ldg-donut-chart.component';

// Realistic spending-by-category mock (cents) — mirrors the category set +
// --ldg-category-N accents seeded in libs/ledger/mocks, without importing it
// (the real component, and this showcase, stay domain-agnostic).
const SPENDING_SEGMENTS: LdgDonutSegment[] = [
  { color: 'var(--ldg-category-3)', label: 'Housing', value: 185000 },
  { color: 'var(--ldg-category-1)', label: 'Groceries', value: 62400 },
  { color: 'var(--ldg-category-4)', label: 'Transportation', value: 41200 },
  { color: 'var(--ldg-category-2)', label: 'Dining', value: 38100 },
  { color: 'var(--ldg-category-8)', label: 'Shopping', value: 27300 },
  { color: 'var(--ldg-category-7)', label: 'Entertainment', value: 19700 },
  { color: 'var(--ldg-category-5)', label: 'Utilities', value: 22800 },
  { color: 'var(--ldg-category-6)', label: 'Health', value: 15600 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'ldg-donut-chart-stories',
  },
  imports: [LdgDonutChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-donut-chart-stories',
  standalone: true,
  styleUrl: './ldg-donut-chart-stories.component.scss',
  templateUrl: './ldg-donut-chart-stories.component.html',
})
export class LdgDonutChartStoriesComponent {
  readonly centerLabelSig: WritableSignal<string> = signal('Total');
  readonly centerValueSig: WritableSignal<string> = signal('$4,121.00');
  readonly lastClickedSig: WritableSignal<string> = signal('None');
  readonly segments = SPENDING_SEGMENTS;
  readonly showLegendSig: WritableSignal<boolean> = signal(true);
  readonly thicknessSig: WritableSignal<number> = signal(0.55);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/donut-chart/stories';

  @Input()
  set centerLabel(v: string) {
    this.centerLabelSig.set(v);
  }

  @Input()
  set centerValue(v: string) {
    this.centerValueSig.set(v);
  }

  @Input()
  set showLegend(v: boolean) {
    this.showLegendSig.set(v);
  }

  @Input()
  set thickness(v: number) {
    this.thicknessSig.set(v);
  }

  onSegmentClick(segment: LdgDonutSegment): void {
    this.lastClickedSig.set(`${segment.label}: $${(segment.value / 100).toFixed(2)}`);
  }
}
