import { Directive, inject, input, TemplateRef } from '@angular/core';

export interface DlcCellContext<T = unknown> {
  $implicit: T;
  column: string;
  value: unknown;
}

@Directive({
  selector: 'ng-template[dlcCell]',
  standalone: true,
})
export class DlcCellDirective {
  readonly dlcCell = input.required<string>();
  readonly template: TemplateRef<DlcCellContext> = inject(TemplateRef);
}
