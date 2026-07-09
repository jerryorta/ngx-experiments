import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NgeCalendarFilter } from '../../core/models/nge-calendar-filter.model';

import { DEFAULT_GIGA_CALENDAR_FILTER } from '../../core/models/nge-calendar-filter.model';
import { NgeCalendarDefaultFilterComponent } from './nge-calendar-default-filter.component';

describe('NgeCalendarDefaultFilterComponent', () => {
  function setup(
    filter: NgeCalendarFilter = DEFAULT_GIGA_CALENDAR_FILTER,
    availableColors: string[] = ['#ff0000', '#00ff00']
  ): {
    changes: Partial<NgeCalendarFilter>[];
    el: HTMLElement;
    fixture: ComponentFixture<NgeCalendarDefaultFilterComponent>;
  } {
    TestBed.configureTestingModule({ imports: [NgeCalendarDefaultFilterComponent] });
    const fixture = TestBed.createComponent(NgeCalendarDefaultFilterComponent);
    fixture.componentRef.setInput('filter', filter);
    fixture.componentRef.setInput('availableColors', availableColors);
    const changes: Partial<NgeCalendarFilter>[] = [];
    fixture.componentInstance.valueChange.subscribe(p => changes.push(p));
    fixture.detectChanges();
    return { changes, el: fixture.nativeElement as HTMLElement, fixture };
  }

  it('renders a colour swatch per available colour', () => {
    const { el } = setup(DEFAULT_GIGA_CALENDAR_FILTER, ['#ff0000', '#00ff00', '#0000ff']);
    const swatches = el.querySelectorAll('[data-testid^="nge-calendar-filter-color-"]');
    expect(swatches.length).toBe(3);
  });

  it('hides the colour facet when no colours are available', () => {
    const { el } = setup(DEFAULT_GIGA_CALENDAR_FILTER, []);
    expect(el.querySelector('[data-testid^="nge-calendar-filter-color-"]')).toBeNull();
  });

  it('renders all three timing segments', () => {
    const { el } = setup();
    expect(el.querySelector('[data-testid="nge-calendar-filter-timing-all"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="nge-calendar-filter-timing-allDay"]')).toBeTruthy();
    expect(el.querySelector('[data-testid="nge-calendar-filter-timing-timed"]')).toBeTruthy();
  });

  it('emits a query partial on search input', () => {
    const { changes, el, fixture } = setup();
    const input = el.querySelector<HTMLInputElement>('[data-testid="nge-calendar-filter-query"]');
    expect(input).toBeTruthy();
    if (input) {
      input.value = 'sync';
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    expect(changes).toContainEqual({ query: 'sync' });
  });

  it('adds a colour to the active set when an unselected swatch is clicked', () => {
    const { changes, el } = setup(DEFAULT_GIGA_CALENDAR_FILTER, ['#ff0000', '#00ff00']);
    el.querySelector<HTMLButtonElement>(
      '[data-testid="nge-calendar-filter-color-#ff0000"]'
    )?.click();
    expect(changes).toContainEqual({ colors: ['#ff0000'] });
  });

  it('removes a colour from the active set when a selected swatch is clicked', () => {
    const { changes, el } = setup(
      { ...DEFAULT_GIGA_CALENDAR_FILTER, colors: ['#ff0000', '#00ff00'] },
      ['#ff0000', '#00ff00']
    );
    el.querySelector<HTMLButtonElement>(
      '[data-testid="nge-calendar-filter-color-#ff0000"]'
    )?.click();
    expect(changes).toContainEqual({ colors: ['#00ff00'] });
  });

  it('marks a selected colour swatch with aria-pressed', () => {
    const { el } = setup({ ...DEFAULT_GIGA_CALENDAR_FILTER, colors: ['#ff0000'] }, ['#ff0000']);
    const swatch = el.querySelector('[data-testid="nge-calendar-filter-color-#ff0000"]');
    expect(swatch?.getAttribute('aria-pressed')).toBe('true');
  });

  it('emits a timing partial when a segment is chosen', () => {
    const { changes, el } = setup();
    el.querySelector<HTMLButtonElement>(
      '[data-testid="nge-calendar-filter-timing-timed"]'
    )?.click();
    expect(changes).toContainEqual({ timing: 'timed' });
  });

  it('reflects the active timing segment via aria-pressed', () => {
    const { el } = setup({ ...DEFAULT_GIGA_CALENDAR_FILTER, timing: 'allDay' });
    const segment = el.querySelector('[data-testid="nge-calendar-filter-timing-allDay"]');
    expect(segment?.getAttribute('aria-pressed')).toBe('true');
  });

  it('exposes the timing group as role="group" (not a radiogroup)', () => {
    const { el } = setup();
    const group = el.querySelector('[aria-label="Filter events by timing"]');
    expect(group?.getAttribute('role')).toBe('group');
    // Toggle buttons, not radios — so no roving-tabindex / arrow-key obligation.
    expect(el.querySelector('[role="radio"]')).toBeNull();
  });
});
