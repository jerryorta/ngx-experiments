import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcSearchInputComponent } from './dlc-search-input.component';

describe('DlcSearchInputComponent', () => {
  let component: DlcSearchInputComponent;
  let fixture: ComponentFixture<DlcSearchInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSearchInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcSearchInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply host class', () => {
    expect((fixture.nativeElement as HTMLElement).classList.contains('dlc-search-input')).toBe(true);
  });

  it('should render search icon, input, and mic button', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('input')).not.toBeNull();
    expect(el.querySelector('button[aria-label="Voice search"]')).not.toBeNull();
  });

  it('should emit queryChange on input event', () => {
    let emitted = '';
    component.queryChange.subscribe((v: string) => {
      emitted = v;
    });
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    input.value = 'hello';
    input.dispatchEvent(new Event('input'));
    expect(emitted).toBe('hello');
  });

  it('should emit micClick when mic button is clicked', () => {
    let clicked = false;
    component.micClick.subscribe(() => {
      clicked = true;
    });
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    btn.click();
    expect(clicked).toBe(true);
  });

  it('should bind value input to the input element', () => {
    fixture.componentRef.setInput('value', 'Smith');
    fixture.detectChanges();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Smith');
  });
});
