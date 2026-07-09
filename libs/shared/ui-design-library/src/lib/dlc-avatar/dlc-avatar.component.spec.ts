import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcAvatarComponent } from './dlc-avatar.component';

describe('DlcAvatarComponent', () => {
  let component: DlcAvatarComponent;
  let fixture: ComponentFixture<DlcAvatarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcAvatarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcAvatarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-avatar host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-avatar')).toBe(true);
  });

  it('should apply dlc-avatar--sm class when size is sm', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-avatar--sm')).toBe(true);
  });

  it('should apply dlc-avatar--md class when size is md', () => {
    fixture.componentRef.setInput('size', 'md');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-avatar--md')).toBe(true);
  });

  it('should apply dlc-avatar--lg class when size is lg', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-avatar--lg')).toBe(true);
  });

  it('should render initials when no imageUrl is set', () => {
    fixture.componentRef.setInput('initials', 'AB');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent?.trim()).toContain('AB');
    expect(el.querySelector('img')).toBeNull();
  });

  it('should render img when imageUrl is set', () => {
    fixture.componentRef.setInput('imageUrl', 'https://example.com/avatar.jpg');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('should show status dot when status is set', () => {
    fixture.componentRef.setInput('status', 'online');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const statusDot = el.querySelector('.dlc-avatar__status');
    expect(statusDot).toBeTruthy();
  });

  it('should not show status dot when status is null', () => {
    fixture.componentRef.setInput('status', null);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const statusDot = el.querySelector('.dlc-avatar__status');
    expect(statusDot).toBeNull();
  });
});
