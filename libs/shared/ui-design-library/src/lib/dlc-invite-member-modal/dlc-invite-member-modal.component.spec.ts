import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import {
  type DlcInviteMemberFormValue,
  DlcInviteMemberModalComponent,
} from './dlc-invite-member-modal.component';

describe('DlcInviteMemberModalComponent', () => {
  let component: DlcInviteMemberModalComponent;
  let fixture: ComponentFixture<DlcInviteMemberModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcInviteMemberModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcInviteMemberModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-invite-member-modal host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-invite-member-modal')).toBe(true);
  });

  it('should not render overlay when visible is false', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-invite-member-modal__overlay')).toBeNull();
  });

  it('should render overlay when visible is true', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-invite-member-modal__overlay')).toBeTruthy();
  });

  it('should emit dismissed when close button is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const closeBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-modal-close-btn"]'
    ) as HTMLButtonElement;
    closeBtn.click();
    expect(emitted).toBe(true);
  });

  it('should emit dismissed when cancel button is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const cancelBtn = Array.from(fixture.nativeElement.querySelectorAll('dlc-button')).find(
      (el: Element) => el.getAttribute('data-testid') === 'invite-cancel-btn'
    ) as HTMLElement | undefined;
    cancelBtn?.click();
    expect(emitted).toBe(true);
  });

  it('should emit dismissed when backdrop is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const overlay = fixture.nativeElement.querySelector(
      '.dlc-invite-member-modal__overlay'
    ) as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('should emit dismissed when Escape key is pressed while visible', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    fixture.detectChanges();

    expect(emitted).toBe(true);
  });

  it('should NOT emit dismissed when Escape is pressed while hidden', () => {
    // visible defaults to false — the host listener guard should suppress the emit.
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));

    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    fixture.detectChanges();

    expect(emitted).toBe(false);
  });

  it('should keep submit button disabled when no recipient is provided', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const submitBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-submit-btn"]'
    ) as HTMLElement;
    expect(submitBtn.classList.contains('dlc-button--disabled')).toBe(true);
  });

  it('should disable submit button when inFlight is true', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('inFlight', true);
    fixture.detectChanges();
    const submitBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-submit-btn"]'
    ) as HTMLElement;
    expect(submitBtn.classList.contains('dlc-button--disabled')).toBe(true);
  });

  it('should render error message when errorMessage is set', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('errorMessage', 'Invitation failed: rate limited.');
    fixture.detectChanges();
    const err = fixture.nativeElement.querySelector('[data-testid="invite-error"]') as HTMLElement;
    expect(err).toBeTruthy();
    expect(err.textContent).toContain('rate limited');
  });

  it('should NOT render error message when errorMessage is null', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="invite-error"]')).toBeNull();
  });

  it('should emit submitted with email recipient + default agent role when valid', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    let emitted: DlcInviteMemberFormValue | undefined;
    component.submitted.subscribe(v => (emitted = v));

    typeIntoDlcInput(fixture, 'invite-email-input', 'new.agent@example.com');
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-submit-btn"]'
    ) as HTMLElement;
    submitBtn.click();

    expect(emitted).toBeDefined();
    expect(emitted?.recipient.kind).toBe('email');
    expect(emitted?.recipient.email).toBe('new.agent@example.com');
    expect(emitted?.recipient.phone).toBeUndefined();
    expect(emitted?.inviteeRole).toBe('agent');
    expect(emitted?.message).toBeUndefined();
  });

  it('should emit submitted with phone recipient when kind switched to phone', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    let emitted: DlcInviteMemberFormValue | undefined;
    component.submitted.subscribe(v => (emitted = v));

    // Switch to phone
    const phoneChip = fixture.nativeElement.querySelector(
      '[data-testid="invite-kind-phone"]'
    ) as HTMLButtonElement;
    phoneChip.click();
    fixture.detectChanges();

    typeIntoDlcInput(fixture, 'invite-phone-input', '5551234567');
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-submit-btn"]'
    ) as HTMLElement;
    submitBtn.click();

    expect(emitted?.recipient.kind).toBe('phone');
    expect(emitted?.recipient.phone).toBe('5551234567');
    expect(emitted?.recipient.email).toBeUndefined();
  });

  it('should include trimmed message in payload when provided', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    let emitted: DlcInviteMemberFormValue | undefined;
    component.submitted.subscribe(v => (emitted = v));

    typeIntoDlcInput(fixture, 'invite-email-input', 'invitee@example.com');
    typeIntoDlcTextarea(fixture, 'invite-message-input', '  Welcome to the team!  ');
    fixture.detectChanges();

    const submitBtn = fixture.nativeElement.querySelector(
      '[data-testid="invite-submit-btn"]'
    ) as HTMLElement;
    submitBtn.click();

    expect(emitted?.message).toBe('Welcome to the team!');
  });

  it('should reset the form when visible toggles from false → true', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    typeIntoDlcInput(fixture, 'invite-email-input', 'first@example.com');
    fixture.detectChanges();

    // Close
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    // Re-open — the effect should reset the form
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    const freshInput = innerInput(fixture, 'invite-email-input');
    expect(freshInput.value).toBe('');
  });

  // REX-527 — the modal is now scope-agnostic. Host pages can swap the
  // header copy + the role option set so the same primitive serves the
  // brokerage settings page AND circle invites from dlc-property-search.
  describe('scope-agnostic configuration (REX-527)', () => {
    it('renders the default brokerage title + subtitle when no inputs are passed', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();
      const titleEl = fixture.nativeElement.querySelector(
        '[data-testid="invite-modal-title"]'
      ) as HTMLElement;
      const subtitleEl = fixture.nativeElement.querySelector(
        '[data-testid="invite-modal-subtitle"]'
      ) as HTMLElement;
      expect(titleEl.textContent).toContain('Invite member');
      expect(subtitleEl.textContent).toContain('Send an invitation by email or phone');
    });

    it('renders host-provided title + subtitle copy', () => {
      fixture.componentRef.setInput('visible', true);
      fixture.componentRef.setInput('title', 'Invite to circle');
      fixture.componentRef.setInput('subtitle', 'Send a circle invitation');
      fixture.detectChanges();
      const titleEl = fixture.nativeElement.querySelector(
        '[data-testid="invite-modal-title"]'
      ) as HTMLElement;
      const subtitleEl = fixture.nativeElement.querySelector(
        '[data-testid="invite-modal-subtitle"]'
      ) as HTMLElement;
      expect(titleEl.textContent).toContain('Invite to circle');
      expect(subtitleEl.textContent).toContain('Send a circle invitation');
    });

    it('emits submitted with the host-provided role default when a custom roleOptions set is passed', () => {
      const circleOptions = [
        { label: 'Buyer', value: 'buyer' },
        { label: 'Seller', value: 'seller' },
        { label: 'Agent', value: 'agent' },
      ];
      fixture.componentRef.setInput('roleOptions', circleOptions);
      fixture.componentRef.setInput('visible', true);
      fixture.detectChanges();

      let emitted: DlcInviteMemberFormValue | undefined;
      component.submitted.subscribe(v => (emitted = v));

      typeIntoDlcInput(fixture, 'invite-email-input', 'circle.buyer@example.com');
      fixture.detectChanges();

      const submitBtn = fixture.nativeElement.querySelector(
        '[data-testid="invite-submit-btn"]'
      ) as HTMLElement;
      submitBtn.click();

      // First option is the default selection — `buyer` lands on the
      // payload without the user picking a role explicitly.
      expect(emitted?.inviteeRole).toBe('buyer');
    });
  });
});

/**
 * The `<dlc-input>` primitive renders an inner `<input>` element — drilling
 * down lets us drive the value the same way a user would and triggers the
 * CVA bridge that propagates back up through `(ngModelChange)`.
 */
function innerInput(
  fixture: ComponentFixture<DlcInviteMemberModalComponent>,
  testid: string
): HTMLInputElement {
  const host = fixture.nativeElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement;
  return host.querySelector('input') as HTMLInputElement;
}

function innerTextarea(
  fixture: ComponentFixture<DlcInviteMemberModalComponent>,
  testid: string
): HTMLTextAreaElement {
  const host = fixture.nativeElement.querySelector(`[data-testid="${testid}"]`) as HTMLElement;
  return host.querySelector('textarea') as HTMLTextAreaElement;
}

function typeIntoDlcInput(
  fixture: ComponentFixture<DlcInviteMemberModalComponent>,
  testid: string,
  value: string
): void {
  const input = innerInput(fixture, testid);
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function typeIntoDlcTextarea(
  fixture: ComponentFixture<DlcInviteMemberModalComponent>,
  testid: string,
  value: string
): void {
  const textarea = innerTextarea(fixture, testid);
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
}
