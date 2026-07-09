import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { DlcFeatureShowcaseComponent } from './dlc-feature-showcase.component';

describe('DlcFeatureShowcaseComponent', () => {
  let fixture: ComponentFixture<DlcFeatureShowcaseComponent>;
  let component: DlcFeatureShowcaseComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcFeatureShowcaseComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcFeatureShowcaseComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('src', '/marketing/broker-dashboard.svg');
  });

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('creates', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renders the screenshot with src, alt and loading', () => {
    fixture.componentRef.setInput('alt', 'Broker dashboard');
    fixture.componentRef.setInput('loading', 'eager');
    fixture.detectChanges();

    const img = host().querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('/marketing/broker-dashboard.svg');
    expect(img?.getAttribute('alt')).toBe('Broker dashboard');
    expect(img?.getAttribute('loading')).toBe('eager');
  });

  it('renders the browser chrome dots and the faux address by default', () => {
    fixture.componentRef.setInput('url', 'app/dashboard');
    fixture.detectChanges();

    // three decorative traffic-light dots inside the aria-hidden container
    expect(host().querySelectorAll('figure [aria-hidden="true"] > span').length).toBe(3);
    expect(host().textContent).toContain('app/dashboard');
  });

  it('omits the faux address bar when no url is provided', () => {
    fixture.detectChanges();
    expect(host().textContent).not.toContain('app/dashboard');
  });

  it('renders a bare image with no frame chrome for frame="none"', () => {
    fixture.componentRef.setInput('frame', 'none');
    fixture.detectChanges();

    expect(host().querySelectorAll('img').length).toBe(1);
    // no chrome wrapper div (browser/device wrap the image in a <div>; none does not)
    expect(host().querySelector('figure > div')).toBeNull();
  });

  it('renders the caption and eyebrow when provided', () => {
    fixture.componentRef.setInput('eyebrow', 'Command center');
    fixture.componentRef.setInput('caption', 'Broker Command Dashboard');
    fixture.detectChanges();

    const figcaption = host().querySelector('figcaption');
    expect(figcaption).not.toBeNull();
    expect(figcaption?.textContent).toContain('Command center');
    expect(figcaption?.textContent).toContain('Broker Command Dashboard');
  });

  it('omits the figcaption when neither caption nor eyebrow is set', () => {
    fixture.detectChanges();
    expect(host().querySelector('figcaption')).toBeNull();
  });
});
