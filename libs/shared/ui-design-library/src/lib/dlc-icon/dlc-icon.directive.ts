import { Directive, input } from '@angular/core';

@Directive({
  host: {
    '[textContent]': 'dlcIcon()',
    'aria-hidden': 'true',
    class: 'material-symbols-outlined',
  },
  selector: 'span[dlcIcon]',
  standalone: true,
})
export class DlcIconDirective {
  readonly dlcIcon = input.required<string>();
}
