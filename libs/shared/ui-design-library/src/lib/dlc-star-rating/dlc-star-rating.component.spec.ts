import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcStarRatingComponent } from './dlc-star-rating.component';

describe('DlcStarRatingComponent', () => {
  let component: DlcStarRatingComponent;
  let fixture: ComponentFixture<DlcStarRatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcStarRatingComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcStarRatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-star-rating host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-star-rating')).toBe(true);
  });

  it('should render 5 star buttons', () => {
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    expect(buttons.length).toBe(5);
  });

  it('should render filled stars up to the rating value', () => {
    fixture.componentRef.setInput('rating', 3);
    fixture.detectChanges();
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span.material-symbols-outlined'
    );
    const iconTexts = Array.from(icons).map(el => el.textContent?.trim());
    expect(iconTexts.slice(0, 3)).toEqual(['star', 'star', 'star']);
    expect(iconTexts.slice(3)).toEqual(['star_border', 'star_border']);
  });

  it('should render all empty stars when rating is null', () => {
    fixture.componentRef.setInput('rating', null);
    fixture.detectChanges();
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span.material-symbols-outlined'
    );
    const iconTexts = Array.from(icons).map(el => el.textContent?.trim());
    expect(iconTexts.every(t => t === 'star_border')).toBe(true);
  });

  it('should emit ratingChange when a star is clicked', () => {
    let emitted: null | number = null;
    component.ratingChange.subscribe((v: number) => {
      emitted = v;
    });
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[2] as HTMLElement).click();
    expect(emitted).toBe(3);
  });

  it('should not emit ratingChange when readonly', () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    let emitted = false;
    component.ratingChange.subscribe(() => {
      emitted = true;
    });
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[0] as HTMLElement).click();
    expect(emitted).toBe(false);
  });

  it('should fill stars up to hovered index on mouseenter', () => {
    // Simulate mouseenter on 4th star
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[3] as HTMLElement).dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span.material-symbols-outlined'
    );
    const iconTexts = Array.from(icons).map(el => el.textContent?.trim());
    expect(iconTexts.slice(0, 4)).toEqual(['star', 'star', 'star', 'star']);
    expect(iconTexts[4]).toBe('star_border');
  });

  it('should restore original rating on mouseleave', () => {
    fixture.componentRef.setInput('rating', 2);
    fixture.detectChanges();
    const group = (fixture.nativeElement as HTMLElement).querySelector('[role="group"]');
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll('button');
    (buttons[4] as HTMLElement).dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();
    group?.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    const icons = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'span.material-symbols-outlined'
    );
    const iconTexts = Array.from(icons).map(el => el.textContent?.trim());
    expect(iconTexts.slice(0, 2)).toEqual(['star', 'star']);
    expect(iconTexts.slice(2)).toEqual(['star_border', 'star_border', 'star_border']);
  });
});
