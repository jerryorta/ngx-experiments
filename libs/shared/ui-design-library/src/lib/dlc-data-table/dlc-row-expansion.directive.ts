import { Directive, inject, TemplateRef } from '@angular/core';

export interface DlcRowExpansionContext {
  $implicit: unknown;
}

@Directive({ selector: '[dlcRowExpansion]', standalone: true })
export class DlcRowExpansionDirective {
  readonly template: TemplateRef<DlcRowExpansionContext> = inject(TemplateRef);
}
