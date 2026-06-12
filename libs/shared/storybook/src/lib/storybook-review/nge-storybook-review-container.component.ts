import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

import { REVIEW_STATUS } from './nge-storybook-review.models';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-storybook-review-container__draft]': 'reviewStatus() === reviewStatusEnum.DRAFT',
    '[class.nge-storybook-review-container__final]': 'reviewStatus() === reviewStatusEnum.FINAL',
    '[class.nge-storybook-review-container__prototype]':
      'reviewStatus() === reviewStatusEnum.PROTOTYPE',
    class: 'nge-storybook-review-container',
  },
  imports: [],
  selector: 'nge-storybook-review-container',
  standalone: true,
  styleUrl: './nge-storybook-review-container.component.scss',
  templateUrl: './nge-storybook-review-container.component.html',
})
export class NgeStorybookReviewContainerComponent {
  readonly figmaUrl = input<null | string>(null);
  readonly reviewStatus = input<REVIEW_STATUS>(REVIEW_STATUS.DRAFT);
  readonly reviewStatusEnum = REVIEW_STATUS;
  readonly storybookFilePath = input<null | string>(null);
  readonly trackingNumber = input<null | string>(null);
  readonly uxUrl = input<null | string>(null);

  readonly githubUrl = computed(() => {
    const path = this.storybookFilePath();
    return path
      ? `https://github.com/jerryorta-dev/ngx-experiments/tree/main/${path}`
      : null;
  });
}
