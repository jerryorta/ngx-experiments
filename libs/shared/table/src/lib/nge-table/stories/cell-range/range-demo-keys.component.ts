import { Component, ViewEncapsulation } from '@angular/core';

import { NgeRangeOverlayComponent, provideNgeCellRange } from '../../../range';
import { NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';
import { NgeTableRangeDemoComponent } from './range-demo-table.component';

/**
 * The one table on the page that owns `Escape` and cmd/ctrl-`A`.
 *
 * ⚠️ **A second class rather than an input, because options are resolved per
 * INJECTOR and therefore per component class.** `provideNgeCellRange()` publishes
 * `NGE_RANGE_OPTIONS` as a `useValue`, so every instance of a given component
 * shares one options object — there is no per-instance route, and inventing one
 * would mean an addon change to demonstrate an addon. A consumer with a dashboard of
 * several range-enabled tables reaches the same arrangement for the same reason.
 *
 * Everything else is inherited: the same template, the same stylesheet, the same
 * controls and the same export methods. Forking those would let the two drift, and
 * the difference being demonstrated is one line of providers.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-range-demo',
  },
  imports: [NgeRangeOverlayComponent, NgeTableComponent, NgeTableSlotDirective],
  providers: [provideNgeCellRange()],
  selector: 'nge-table-range-keys-demo',
  standalone: true,
  styleUrl: './range-demo-table.component.scss',
  templateUrl: './range-demo-table.component.html',
})
export class NgeTableRangeKeysDemoComponent<TRow> extends NgeTableRangeDemoComponent<TRow> {}
