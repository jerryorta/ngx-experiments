import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.ldg-page-content--padded]': 'padded()',
    class: 'ldg-page-content',
  },
  imports: [],
  selector: 'ldg-page-content',
  styleUrl: './ldg-page-content.component.scss',
  templateUrl: './ldg-page-content.component.html',
})
export class LdgPageContentComponent {
  readonly padded = input(true);
}
