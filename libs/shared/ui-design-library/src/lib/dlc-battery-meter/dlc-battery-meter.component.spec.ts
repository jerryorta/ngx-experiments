import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcBatteryMeterComponent } from './dlc-battery-meter.component';

/**
 * Normalize a CSS color value the way the browser/jsdom does when read back
 * from `element.style.backgroundColor`. The component stores hex tokens,
 * but reading them via `style.backgroundColor` returns the rgb() form, so
 * the expected side has to pass through the same round-trip.
 */
function normalizeColor(value: string): string {
  const tmp = document.createElement('div');
  tmp.style.backgroundColor = value;
  return tmp.style.backgroundColor;
}

describe('DlcBatteryMeterComponent', () => {
  let component: DlcBatteryMeterComponent;
  let fixture: ComponentFixture<DlcBatteryMeterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcBatteryMeterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcBatteryMeterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-battery-meter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-battery-meter')).toBe(true);
  });

  it('should have role="meter"', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('role')).toBe('meter');
  });

  it('should set aria-valuemin to 0', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-valuemin')).toBe('0');
  });

  describe('aria attributes', () => {
    it('should reflect states.length in aria-valuemax', () => {
      fixture.componentRef.setInput('states', ['default', 'in-progress', 'done']);
      fixture.detectChanges();
      expect(fixture.nativeElement.getAttribute('aria-valuemax')).toBe('3');
    });

    it('should reflect doneCount in aria-valuenow', () => {
      fixture.componentRef.setInput('states', ['done', 'done', 'in-progress', 'default']);
      fixture.detectChanges();
      expect(fixture.nativeElement.getAttribute('aria-valuenow')).toBe('2');
    });
  });

  describe('doneCount', () => {
    it('should return 0 when no states are done', () => {
      fixture.componentRef.setInput('states', ['default', 'default', 'in-progress']);
      fixture.detectChanges();
      expect(component.doneCount()).toBe(0);
    });

    it('should count only done states', () => {
      fixture.componentRef.setInput('states', ['done', 'done', 'in-progress', 'default']);
      fixture.detectChanges();
      expect(component.doneCount()).toBe(2);
    });

    it('should return states.length when all are done', () => {
      fixture.componentRef.setInput('states', ['done', 'done', 'done']);
      fixture.detectChanges();
      expect(component.doneCount()).toBe(3);
    });
  });

  describe('displayStates', () => {
    it('should sort done first, then in-progress, then default', () => {
      fixture.componentRef.setInput('states', ['default', 'in-progress', 'done']);
      fixture.detectChanges();
      expect(component.displayStates()).toEqual(['done', 'in-progress', 'default']);
    });

    it('should sort a mixed real-world sequence: done, default, in-progress, done → done, done, in-progress, default', () => {
      fixture.componentRef.setInput('states', ['done', 'default', 'in-progress', 'done']);
      fixture.detectChanges();
      expect(component.displayStates()).toEqual(['done', 'done', 'in-progress', 'default']);
    });

    it('should not mutate the original states input', () => {
      const original = ['default', 'in-progress', 'done'];
      fixture.componentRef.setInput('states', original);
      fixture.detectChanges();
      component.displayStates();
      expect(component.states()).toEqual(['default', 'in-progress', 'done']);
    });
  });

  describe('segments', () => {
    it('should render one segment per state', () => {
      fixture.componentRef.setInput('states', ['default', 'in-progress', 'done', 'done']);
      fixture.detectChanges();
      const segs = fixture.nativeElement.querySelectorAll('.dlc-battery-meter__segment');
      expect(segs.length).toBe(4);
    });

    it('should render zero segments for empty states', () => {
      fixture.componentRef.setInput('states', []);
      fixture.detectChanges();
      const segs = fixture.nativeElement.querySelectorAll('.dlc-battery-meter__segment');
      expect(segs.length).toBe(0);
    });

    it('should apply the default color for default state', () => {
      fixture.componentRef.setInput('states', ['default']);
      fixture.detectChanges();
      const seg: HTMLElement = fixture.nativeElement.querySelector('.dlc-battery-meter__segment');
      expect(seg.style.backgroundColor).toBe(normalizeColor(component.segmentColor('default')));
    });

    it('should apply the in-progress color for in-progress state', () => {
      fixture.componentRef.setInput('states', ['in-progress']);
      fixture.detectChanges();
      const seg: HTMLElement = fixture.nativeElement.querySelector('.dlc-battery-meter__segment');
      expect(seg.style.backgroundColor).toBe(normalizeColor(component.segmentColor('in-progress')));
    });

    it('should apply the done color for done state', () => {
      fixture.componentRef.setInput('states', ['done']);
      fixture.detectChanges();
      const seg: HTMLElement = fixture.nativeElement.querySelector('.dlc-battery-meter__segment');
      expect(seg.style.backgroundColor).toBe(normalizeColor(component.segmentColor('done')));
    });

    it('should apply correct inline colors across a mixed states array', () => {
      fixture.componentRef.setInput('states', ['done', 'in-progress', 'default']);
      fixture.detectChanges();
      const segs: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll(
        '.dlc-battery-meter__segment'
      );
      expect(segs[0].style.backgroundColor).toBe(normalizeColor(component.segmentColor('done')));
      expect(segs[1].style.backgroundColor).toBe(
        normalizeColor(component.segmentColor('in-progress'))
      );
      expect(segs[2].style.backgroundColor).toBe(normalizeColor(component.segmentColor('default')));
    });
  });

  describe('colorMap override', () => {
    it('should use the overridden color when colorMap is provided', () => {
      fixture.componentRef.setInput('states', ['done']);
      fixture.componentRef.setInput('colorMap', { done: 'rgb(0, 128, 0)' });
      fixture.detectChanges();
      expect(component.segmentColor('done')).toBe('rgb(0, 128, 0)');
    });

    it('should fall back to default map for states not in the override', () => {
      fixture.componentRef.setInput('colorMap', { done: 'rgb(0, 128, 0)' });
      fixture.detectChanges();
      expect(component.segmentColor('in-progress')).toBe(
        component.resolvedColorMap()['in-progress']
      );
    });

    it('should merge override on top of defaults without mutating DEFAULT_BATTERY_COLOR_MAP', () => {
      fixture.componentRef.setInput('colorMap', { done: 'red' });
      fixture.detectChanges();
      expect(component.resolvedColorMap()['done']).toBe('red');
      expect(component.resolvedColorMap()['default']).toBeTruthy();
    });
  });

  describe('nub', () => {
    it('should render the nub by default', () => {
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.dlc-battery-meter__nub')).toBeTruthy();
    });

    it('should hide the nub when showIcon is false', () => {
      fixture.componentRef.setInput('showIcon', false);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.querySelector('.dlc-battery-meter__nub')).toBeNull();
    });
  });

  describe('trailing label', () => {
    it('should not render date label when trailingLabel is null', () => {
      fixture.componentRef.setInput('trailingLabel', null);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.dlc-battery-meter__date')).toBeNull();
    });

    it('should render date label when trailingLabel is provided', () => {
      fixture.componentRef.setInput('trailingLabel', 'May 15');
      fixture.detectChanges();
      const dateEl = fixture.nativeElement.querySelector('.dlc-battery-meter__date');
      expect(dateEl).toBeTruthy();
      expect(dateEl?.textContent?.trim()).toBe('May 15');
    });
  });

  describe('ariaLabel', () => {
    it('should summarise done count out of total', () => {
      fixture.componentRef.setInput('states', [
        'done',
        'done',
        'in-progress',
        'default',
        'default',
      ]);
      fixture.detectChanges();
      expect(component.ariaLabel()).toBe('2 of 5 done (40%)');
    });

    it('should include trailing label when provided', () => {
      fixture.componentRef.setInput('states', ['done', 'done', 'done']);
      fixture.componentRef.setInput('trailingLabel', 'Jun 1');
      fixture.detectChanges();
      expect(component.ariaLabel()).toBe('3 of 3 done (100%) — Jun 1');
    });

    it('should handle empty states gracefully', () => {
      fixture.componentRef.setInput('states', []);
      fixture.detectChanges();
      expect(component.ariaLabel()).toBe('0 of 0 done (0%)');
    });
  });

  describe('size variants', () => {
    it('should apply dlc-battery-meter--md class by default', () => {
      expect(fixture.nativeElement.classList.contains('dlc-battery-meter--md')).toBe(true);
    });

    it('should apply dlc-battery-meter--sm class for sm size', () => {
      fixture.componentRef.setInput('size', 'sm');
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.classList.contains('dlc-battery-meter--sm')).toBe(true);
      expect(el.classList.contains('dlc-battery-meter--md')).toBe(false);
    });

    it('should apply dlc-battery-meter--lg class for lg size', () => {
      fixture.componentRef.setInput('size', 'lg');
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      expect(el.classList.contains('dlc-battery-meter--lg')).toBe(true);
      expect(el.classList.contains('dlc-battery-meter--md')).toBe(false);
    });
  });
});
