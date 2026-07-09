import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcTextareaComponent } from './dlc-textarea.component';

describe('DlcTextareaComponent', () => {
  let component: DlcTextareaComponent;
  let fixture: ComponentFixture<DlcTextareaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcTextareaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-textarea host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-textarea')).toBe(true);
  });

  it('should render label when label input is set', () => {
    fixture.componentRef.setInput('label', 'Description');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const label = el.querySelector('.dlc-textarea__label');
    expect(label?.textContent?.trim()).toBe('Description');
  });

  it('should show error text when errorText is set', () => {
    fixture.componentRef.setInput('errorText', 'Field is required');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const errorEl = el.querySelector('.dlc-textarea__error');
    expect(errorEl?.textContent?.trim()).toBe('Field is required');
  });

  it('should apply rows attribute to textarea', () => {
    fixture.componentRef.setInput('rows', 6);
    fixture.detectChanges();
    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.rows).toBe(6);
  });
});
