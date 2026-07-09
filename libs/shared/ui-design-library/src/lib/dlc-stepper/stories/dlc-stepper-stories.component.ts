import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcStep } from '../dlc-stepper.component';

import { DlcStepperComponent } from '../dlc-stepper.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-stepper-stories',
  },
  imports: [DlcStepperComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-stepper-stories',
  standalone: true,
  styleUrl: './dlc-stepper-stories.component.scss',
  templateUrl: './dlc-stepper-stories.component.html',
})
export class DlcStepperStoriesComponent {
  readonly orientationSig: WritableSignal<'horizontal' | 'vertical'> = signal('horizontal');

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-stepper/stories';
  uxUrl = 'https://stitch.withgoogle.com/projects/620430120853236312';

  readonly stepsThreeStage: DlcStep[] = [
    { label: 'Personal Info', state: 'completed' },
    { label: 'Property Details', state: 'active' },
    { label: 'Review', state: 'upcoming' },
  ];

  readonly stepsFourStage: DlcStep[] = [
    { label: 'Account', state: 'completed' },
    { label: 'Profile', state: 'completed' },
    { label: 'Preferences', state: 'active' },
    { label: 'Confirm', state: 'upcoming' },
  ];

  readonly stepsAllUpcoming: DlcStep[] = [
    { label: 'Step 1', state: 'upcoming' },
    { label: 'Step 2', state: 'upcoming' },
    { label: 'Step 3', state: 'upcoming' },
  ];

  @Input()
  set orientation(v: 'horizontal' | 'vertical') {
    this.orientationSig.set(v);
  }
}
