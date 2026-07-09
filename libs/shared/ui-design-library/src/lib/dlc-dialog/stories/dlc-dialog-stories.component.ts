import { Component, Input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcDialogSize } from '../dlc-dialog.component';

import { DlcButtonComponent } from '../../dlc-button/dlc-button.component';
import { DlcInputComponent } from '../../dlc-input/dlc-input.component';
import { DlcDialogComponent } from '../dlc-dialog.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-dialog-stories' },
  imports: [
    DlcDialogComponent,
    DlcButtonComponent,
    DlcInputComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'dlc-dialog-stories',
  standalone: true,
  styleUrl: './dlc-dialog-stories.component.scss',
  templateUrl: './dlc-dialog-stories.component.html',
})
export class DlcDialogStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-dialog/stories';
  trackingNumber = 'REX-395';

  @Input() set visible(v: boolean) {
    this._visible = v;
  }
  @Input() set size(v: DlcDialogSize) {
    this._size = v;
  }
  @Input() set ariaLabel(v: string) {
    this._ariaLabel = v;
  }
  @Input() set dismissOnBackdropClick(v: boolean) {
    this._dismissOnBackdropClick = v;
  }
  @Input() set dismissOnEscape(v: boolean) {
    this._dismissOnEscape = v;
  }
  @Input() set showCloseButton(v: boolean) {
    this._showCloseButton = v;
  }

  _visible = true;
  _size: DlcDialogSize = 'md';
  _ariaLabel = 'Example dialog';
  _dismissOnBackdropClick = true;
  _dismissOnEscape = true;
  _showCloseButton = true;

  open(): void {
    this._visible = true;
  }

  onDismissed(): void {
    this._visible = false;
  }
}
