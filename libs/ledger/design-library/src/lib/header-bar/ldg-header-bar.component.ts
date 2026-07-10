import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-header-bar' },
  imports: [],
  selector: 'ldg-header-bar',
  styleUrl: './ldg-header-bar.component.scss',
  templateUrl: './ldg-header-bar.component.html',
})
export class LdgHeaderBarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
