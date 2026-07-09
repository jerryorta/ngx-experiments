import { signalStore, withFeature, withState } from '@ngrx/signals';

import { withCalendarDrag } from './features/with-calendar-drag';
import { withCalendarFilter } from './features/with-calendar-filter';
import { withCalendarNavigation } from './features/with-calendar-navigation';
import { withCalendarPopover } from './features/with-calendar-popover';
import { withCalendarSelection } from './features/with-calendar-selection';
import { withCalendarViewModel } from './features/with-calendar-viewmodel';
import { initialNgeCalendarStoreState } from './nge-calendar-store.state';

/**
 * Component-scoped calendar SignalStore. Provide it on the calendar shell
 * component (`providers: [NgeCalendarStore]`) — NEVER `providedIn: 'root'` —
 * and let descendant view components `inject()` it.
 *
 * It injects nothing and supplements (never replaces) any global domain store a
 * consumer runs. Feature order matters: the filter feature must come before the
 * view-model feature (which reads its `activeEventFilter` for the cross-view
 * `_filteredConfig` seam), and the view-model feature must come before selection
 * / drag / popover because they depend on its `events` / `slotMinutes` /
 * `editable` / `monthViewModel` computeds.
 */
export const NgeCalendarStore = signalStore(
  withState(initialNgeCalendarStoreState),
  withFeature(store => withCalendarNavigation(store)),
  withFeature(store => withCalendarFilter(store)),
  withFeature(store => withCalendarViewModel(store)),
  withFeature(store => withCalendarSelection(store)),
  withFeature(store => withCalendarDrag(store)),
  withFeature(store => withCalendarPopover(store))
);
