import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcStarRating = 1 | 2 | 3 | 4 | 5;

export type DlcStarRatingSize = 'md' | 'sm';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-star-rating' },
  imports: [DlcIconDirective],
  selector: 'dlc-star-rating',
  styleUrl: './dlc-star-rating.component.scss',
  templateUrl: './dlc-star-rating.component.html',
})
export class DlcStarRatingComponent {
  readonly rating = input<DlcStarRating | null>(null);
  readonly readonly = input<boolean>(false);
  readonly size = input<DlcStarRatingSize>('md');
  readonly ratingChange = output<DlcStarRating>();

  protected readonly _hoverIndex = signal<number>(0);

  protected readonly starIndexes = [1, 2, 3, 4, 5] as const;

  protected isFilled(index: number): boolean {
    const hover = this._hoverIndex();
    if (hover > 0) return index <= hover;
    return index <= (this.rating() ?? 0);
  }

  protected onMouseEnter(index: number): void {
    if (!this.readonly()) {
      this._hoverIndex.set(index);
    }
  }

  protected onMouseLeave(): void {
    this._hoverIndex.set(0);
  }

  protected onStarClick(index: DlcStarRating): void {
    if (!this.readonly()) {
      this.ratingChange.emit(index);
    }
  }
}
