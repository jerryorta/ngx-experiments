import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcDialogComponent } from '../dlc-dialog/dlc-dialog.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export interface DlcTemplatePickerItem {
  description: string;
  icon: string;
  id: string;
  label: string;
  taskCount: number;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-template-picker-modal' },
  imports: [DlcButtonComponent, DlcDialogComponent, DlcIconDirective],
  selector: 'dlc-template-picker-modal',
  styleUrl: './dlc-template-picker-modal.component.scss',
  templateUrl: './dlc-template-picker-modal.component.html',
})
export class DlcTemplatePickerModalComponent {
  readonly visible = input(false);
  readonly templates = input<DlcTemplatePickerItem[]>([]);

  readonly dismissed = output<void>();
  readonly templateSelected = output<string>(); // emits template id

  protected readonly selectedId = signal<null | string>(null);

  constructor() {
    // REX-449 — clear the selection whenever the modal closes so the next open
    // starts with nothing selected (Apply disabled), regardless of dismissal path
    // (Cancel, Escape, backdrop, or close button — all route through dlc-dialog).
    let wasVisible = false;
    effect(() => {
      const visibleNow = this.visible();
      if (wasVisible && !visibleNow) {
        this.selectedId.set(null);
      }
      wasVisible = visibleNow;
    });
  }

  protected onApply(): void {
    const id = this.selectedId();
    if (id) this.templateSelected.emit(id);
  }
}
