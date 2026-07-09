import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcBatteryMeterSize, DlcBatteryState } from '../dlc-battery-meter.component';

import { DlcBatteryMeterComponent } from '../dlc-battery-meter.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-battery-meter-stories',
  },
  imports: [DlcBatteryMeterComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-battery-meter-stories',
  standalone: true,
  styleUrl: './dlc-battery-meter-stories.component.scss',
  templateUrl: './dlc-battery-meter-stories.component.html',
})
export class DlcBatteryMeterStoriesComponent {
  readonly trailingLabelSig: WritableSignal<null | string> = signal('May 30');
  readonly colorMapSig: WritableSignal<Record<string, string>> = signal({});
  readonly showIconSig: WritableSignal<boolean> = signal(true);
  readonly sizeSig: WritableSignal<DlcBatteryMeterSize> = signal('md');
  readonly statesSig: WritableSignal<DlcBatteryState[]> = signal([
    'done', 'done', 'done', 'in-progress', 'in-progress', 'default', 'default', 'default', 'default', 'default',
  ]);

  readonly stateExamples: { label: string; states: DlcBatteryState[] }[] = [
    {
      label: 'All not started',
      states: ['default', 'default', 'default', 'default', 'default'],
    },
    {
      label: '1 in progress',
      states: ['in-progress', 'default', 'default', 'default', 'default'],
    },
    {
      label: '2 done, 1 in progress',
      states: ['done', 'done', 'in-progress', 'default', 'default'],
    },
    {
      label: '4 done, 1 in progress',
      states: ['done', 'done', 'done', 'done', 'in-progress'],
    },
    {
      label: 'All done',
      states: ['done', 'done', 'done', 'done', 'done'],
    },
  ];

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-battery-meter/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  @Input()
  set trailingLabel(v: null | string) {
    this.trailingLabelSig.set(v);
  }

  @Input()
  set colorMap(v: Record<string, string>) {
    this.colorMapSig.set(v);
  }

  @Input()
  set showIcon(v: boolean) {
    this.showIconSig.set(v);
  }

  @Input()
  set size(v: DlcBatteryMeterSize) {
    this.sizeSig.set(v);
  }

  @Input()
  set states(v: DlcBatteryState[]) {
    this.statesSig.set(v);
  }
}
