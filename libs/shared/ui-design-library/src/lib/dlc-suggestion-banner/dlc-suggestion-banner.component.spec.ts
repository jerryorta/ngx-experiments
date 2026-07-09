import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcSuggestionBannerComponent } from './dlc-suggestion-banner.component';

describe('DlcSuggestionBannerComponent', () => {
  let component: DlcSuggestionBannerComponent;
  let fixture: ComponentFixture<DlcSuggestionBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSuggestionBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcSuggestionBannerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Template Suggested');
    fixture.componentRef.setInput('description', "Apply 'Under Contract – Buyer' to get started");
    fixture.componentRef.setInput('templateName', 'Under Contract – Buyer');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title input', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Template Suggested');
  });

  it('should render description input', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Apply 'Under Contract – Buyer' to get started");
  });

  it('should emit accept when Apply button is clicked', () => {
    const acceptSpy = jest.fn();
    component.accept.subscribe(acceptSpy);

    const applyBtn = fixture.nativeElement.querySelector('[data-testid="accept"]') as HTMLButtonElement;
    applyBtn.click();
    fixture.detectChanges();

    expect(acceptSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit dismiss when × button is clicked', () => {
    const dismissSpy = jest.fn();
    component.dismiss.subscribe(dismissSpy);

    const dismissBtn = fixture.nativeElement.querySelector('[data-testid="dismiss"]') as HTMLButtonElement;
    dismissBtn.click();
    fixture.detectChanges();

    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit chooseAlternative when Choose different is clicked', () => {
    const chooseAltSpy = jest.fn();
    component.chooseAlternative.subscribe(chooseAltSpy);

    const chooseDiffBtn = fixture.nativeElement.querySelector('[data-testid="choose-alternative"]') as HTMLButtonElement;
    chooseDiffBtn.click();
    fixture.detectChanges();

    expect(chooseAltSpy).toHaveBeenCalledTimes(1);
  });
});
