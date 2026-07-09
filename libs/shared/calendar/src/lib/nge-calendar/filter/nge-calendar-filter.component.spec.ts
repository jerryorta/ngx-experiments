import type { TemplateRef } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';

import { ESCAPE } from '@angular/cdk/keycodes';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, signal, viewChild, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeCalendarConfig } from '../../core/models/nge-calendar-config.model';
import type {
  NgeCalendarEventPredicate,
  NgeCalendarFilterContext,
} from '../../core/models/nge-calendar-filter.model';

import { NgeCalendarStore } from '../store';
import { NgeCalendarFilterComponent } from './nge-calendar-filter.component';

const CONFIG: NgeCalendarConfig = {
  date: new Date(2026, 0, 15),
  events: [
    {
      allDay: false,
      color: '#ff0000',
      end: new Date(2026, 0, 15, 10, 0),
      id: 'a',
      start: new Date(2026, 0, 15, 9, 0),
      title: 'Morning sync',
    },
    {
      allDay: true,
      color: '#00ff00',
      id: 'b',
      start: new Date(2026, 0, 16),
      title: 'Holiday',
    },
  ],
  view: 'month',
};

/** Host driving the filter component, optionally with a custom `#ngeCalendarFilter`. */
@Component({
  encapsulation: ViewEncapsulation.None,
  imports: [NgeCalendarFilterComponent],
  providers: [NgeCalendarStore],
  selector: 'nge-calendar-filter-host',
  standalone: true,
  template: `
    @if (useHostPanel()) {
      <nge-calendar-filter [hostPanel]="hostTpl()" />
      <ng-template #ngeCalendarFilter let-apply="apply" let-setFilter="setFilter">
        <button type="button" class="host-apply" (click)="apply(predicate)">Apply host</button>
        <button type="button" class="host-set" (click)="setFilter({ query: 'edited' })">
          Edit
        </button>
      </ng-template>
    } @else {
      <nge-calendar-filter />
    }
  `,
})
class HostComponent {
  readonly useHostPanel = signal(false);
  readonly hostTpl = viewChild<TemplateRef<NgeCalendarFilterContext>>('ngeCalendarFilter');
  readonly predicate: NgeCalendarEventPredicate = () => false;
}

describe('NgeCalendarFilterComponent', () => {
  function setup(useHostPanel = false): {
    fixture: ComponentFixture<HostComponent>;
    store: InstanceType<typeof NgeCalendarStore>;
  } {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.useHostPanel.set(useHostPanel);
    fixture.detectChanges();
    const store = fixture.debugElement
      .query(node => node.componentInstance instanceof NgeCalendarFilterComponent)
      .injector.get(NgeCalendarStore);
    store.setConfig(CONFIG);
    fixture.detectChanges();
    return { fixture, store };
  }

  function overlayContainerEl(): HTMLElement {
    return TestBed.inject(OverlayContainer).getContainerElement();
  }

  /** The popover card inside the CDK overlay container, or null when closed. */
  function panel(): HTMLElement | null {
    return overlayContainerEl().querySelector<HTMLElement>(
      '[data-testid="nge-calendar-filter-panel"]'
    );
  }

  function trigger(fixture: ComponentFixture<HostComponent>): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="nge-calendar-filter-trigger"]'
    );
  }

  function clickInPanel(id: string): void {
    overlayContainerEl().querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)?.click();
  }

  afterEach(() => {
    // Tear down the singleton overlay container the CDK creates in the DOM.
    TestBed.inject(OverlayContainer).ngOnDestroy();
  });

  it('opens the popover on trigger click and closes on a second click', () => {
    const { fixture } = setup();
    expect(panel()).toBeNull();

    trigger(fixture)?.click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
    expect(trigger(fixture)?.getAttribute('aria-expanded')).toBe('true');

    trigger(fixture)?.click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
    expect(trigger(fixture)?.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the default body when no host template is supplied', () => {
    const { fixture } = setup();
    trigger(fixture)?.click();
    fixture.detectChanges();
    expect(overlayContainerEl().querySelector('nge-calendar-default-filter')).toBeTruthy();
  });

  it('commits the draft to the store on Done', () => {
    const { fixture, store } = setup();
    trigger(fixture)?.click();
    fixture.detectChanges();

    const query = overlayContainerEl().querySelector<HTMLInputElement>(
      '[data-testid="nge-calendar-filter-query"]'
    );
    expect(query).toBeTruthy();
    if (query) {
      query.value = 'sync';
      query.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();

    clickInPanel('nge-calendar-filter-done');
    fixture.detectChanges();

    expect(store.filter().query).toBe('sync');
    expect(panel()).toBeNull();
  });

  it('clears the store filter on Clear', () => {
    const { fixture, store } = setup();
    store.setFilter({ query: 'preset' });
    fixture.detectChanges();

    trigger(fixture)?.click();
    fixture.detectChanges();

    clickInPanel('nge-calendar-filter-clear');
    fixture.detectChanges();

    expect(store.filter().query).toBe('');
    expect(store.filterActive()).toBe(false);
  });

  it('renders the activeFilterCount badge when the filter is active', () => {
    const { fixture, store } = setup();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="nge-calendar-filter-badge"]'
      )
    ).toBeNull();

    store.setFilter({ colors: ['#ff0000'], query: 'x' });
    fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="nge-calendar-filter-badge"]'
    );
    expect(badge?.textContent?.trim()).toBe('2');
  });

  it('exposes active state + count in the trigger accessible name', () => {
    const { fixture, store } = setup();
    expect(trigger(fixture)?.getAttribute('aria-label')).toBe('Filter events');

    store.setFilter({ colors: ['#ff0000'], query: 'x' });
    fixture.detectChanges();

    expect(trigger(fixture)?.getAttribute('aria-label')).toBe('Filter events, 2 active');
  });

  it('closes on Escape', () => {
    const { fixture } = setup();
    trigger(fixture)?.click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    // CDK routes keystrokes to the top overlay via a document-level dispatcher,
    // so the keydown must bubble out of the pane to reach it.
    const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
    pane?.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, keyCode: ESCAPE } as KeyboardEventInit)
    );
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('renders a host panel and calls setHostPredicate on apply', () => {
    const { fixture, store } = setup(true);
    trigger(fixture)?.click();
    fixture.detectChanges();

    expect(overlayContainerEl().querySelector('.host-apply')).toBeTruthy();
    // No default footer when a host panel is supplied.
    expect(
      overlayContainerEl().querySelector('[data-testid="nge-calendar-filter-done"]')
    ).toBeNull();

    overlayContainerEl().querySelector<HTMLButtonElement>('.host-apply')?.click();
    fixture.detectChanges();

    expect(store.activeEventFilter()).toBe(fixture.componentInstance.predicate);
    expect(panel()).toBeNull();
  });
});
