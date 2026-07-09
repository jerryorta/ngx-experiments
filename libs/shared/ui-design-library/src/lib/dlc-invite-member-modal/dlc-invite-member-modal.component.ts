import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';
import { DlcInputComponent } from '../dlc-input/dlc-input.component';
import { DlcSelectComponent } from '../dlc-select/dlc-select.component';
import { DlcTextareaComponent } from '../dlc-textarea/dlc-textarea.component';

/** Recipient channel — what kind of address the form is collecting. */
export type DlcInviteMemberRecipientKind = 'email' | 'phone';

/**
 * Job role the recipient is being invited as. Aligned with `RoleSubtype`
 * (`ProfessionalRole`) on the backend. Note: this is the *job-role* axis
 * (what they do), NOT the *org-permission* axis (admin vs member). All
 * invitees default to `orgRole: 'member'` on accept; promotion to admin is
 * a separate post-accept affordance and is OUT OF SCOPE for REX-415.
 *
 * REX-527 — widened to `string` so the modal can render role options for
 * scopes beyond the brokerage (e.g. circle invites carry `'buyer'`,
 * `'seller'`, `'agent'`). The backend accepts `inviteeRole: string` and
 * validates it as a `RoleSubtype` at consume time — so widening the form
 * payload here only relaxes the modal, not the wire contract.
 */
export type DlcInviteMemberRole = string;

/**
 * Option shape consumed by the `roleOptions` input. Mirrors `dlc-select`'s
 * `{ label, value }` so the modal can hand the options straight to the
 * select primitive without an adapter.
 */
export interface DlcInviteMemberRoleOption {
  label: string;
  value: string;
}

/**
 * Submission payload emitted by the invite-member modal. Mirrors the
 * `SendInvitationInput.recipient` + role/message shape consumed by
 * `InvitationsFacade.sendInvitation` — the parent page composes the full
 * payload by stamping `orgId` and `scope` (and `circleId` for circle-scope
 * invites — REX-527) before dispatching.
 */
export interface DlcInviteMemberFormValue {
  inviteeRole: DlcInviteMemberRole;
  message?: string;
  recipient: {
    email?: string;
    kind: DlcInviteMemberRecipientKind;
    phone?: string;
  };
}

/**
 * Default role options for brokerage-scope invitations (the original REX-415
 * shape). Circle-scope hosts override via the `roleOptions` input — see
 * `dlc-property-search` (REX-527) for the `[Buyer, Seller, Agent]` set.
 */
const DEFAULT_BROKERAGE_ROLE_OPTIONS: DlcInviteMemberRoleOption[] = [
  { label: 'Agent', value: 'agent' },
  { label: 'Broker', value: 'broker' },
];

/**
 * Declarative modal for issuing an invitation (brokerage or circle scope —
 * REX-415, REX-527). The parent page controls visibility, in-flight, and
 * error state via signal inputs; the modal emits `submitted` with validated
 * form values and `dismissed` on cancel / escape / backdrop click. Mirrors
 * the `dlc-template-picker-modal` pattern (REX-403).
 *
 * REX-527 — the modal is now scope-agnostic. Hosts customise the
 * `title` / `subtitle` (e.g. "Invite to circle" / "Send a circle
 * invitation…") and the `roleOptions` set so circle scope can present
 * `[Buyer, Seller, Agent]` instead of the brokerage `[Agent, Broker]`
 * default. Parents still stamp `orgId` + `scope` (+ `circleId` for circle
 * mode) on the dispatched payload — the modal itself never sees them.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-invite-member-modal' },
  imports: [
    DlcButtonComponent,
    DlcIconDirective,
    DlcInputComponent,
    DlcSelectComponent,
    DlcTextareaComponent,
    FormsModule,
  ],
  selector: 'dlc-invite-member-modal',
  styleUrl: './dlc-invite-member-modal.component.scss',
  templateUrl: './dlc-invite-member-modal.component.html',
})
export class DlcInviteMemberModalComponent {
  readonly visible = input(false);
  readonly inFlight = input(false);
  readonly errorMessage = input<null | string>(null);
  /** REX-527 — header copy. Defaults preserve the brokerage-scope wording. */
  readonly title = input('Invite member');
  readonly subtitle = input('Send an invitation by email or phone');
  /**
   * REX-527 — role options bound to the role-picker `dlc-select`. Defaults to
   * the brokerage `[Agent, Broker]` set (the original REX-415 list) so
   * existing hosts (e.g. settings-team-members-page) keep the same UX with
   * no input change. Circle-scope hosts pass their own option set
   * (e.g. `[Buyer, Seller, Agent]`); the first option's value is treated
   * as the default selection on each open.
   */
  readonly roleOptions = input<DlcInviteMemberRoleOption[]>(DEFAULT_BROKERAGE_ROLE_OPTIONS);

  readonly dismissed = output<void>();
  readonly submitted = output<DlcInviteMemberFormValue>();

  protected readonly _kind = signal<DlcInviteMemberRecipientKind>('email');
  protected readonly _email = signal('');
  protected readonly _phone = signal('');
  /**
   * REX-527 — initialised empty; the first `roleOptions()[0]?.value` lands
   * on every visible-true transition via `resetForm()`, so the selected
   * role always matches whichever option set the host is showing.
   */
  protected readonly _role = signal<DlcInviteMemberRole>('');
  protected readonly _message = signal('');

  /**
   * REX-527 — Valid role-option values keyed off the live `roleOptions`
   * input. Used by `onRoleChange` to silently ignore a `null` clear from
   * the select primitive (which would otherwise blank out a perfectly
   * valid selection if the user re-opened the picker without picking).
   */
  protected readonly _validRoleValues = computed(
    () => new Set(this.roleOptions().map(option => option.value))
  );

  /**
   * Recipient address is valid when the channel-matched field is populated.
   * Light email shape check (matches `something@something`); phone gets a
   * conservative digits-only floor of 7 characters so test phone fixtures
   * like `5551234567` pass without forcing E.164 yet.
   */
  protected readonly _isAddressValid = computed(() => {
    if (this._kind() === 'email') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this._email().trim());
    }
    const digits = this._phone().replace(/\D/g, '');
    return digits.length >= 7;
  });

  protected readonly _canSubmit = computed(() => !this.inFlight() && this._isAddressValid());

  /**
   * Reset all form fields whenever the modal transitions from hidden to
   * visible. Parent pages toggle `visible` to false then back to true to
   * re-open with a fresh form — keeping the reset here means callers don't
   * need to thread an `@ViewChild` ref through.
   */
  constructor() {
    effect(() => {
      if (this.visible()) {
        this.resetForm();
      }
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible()) this.dismissed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dlc-invite-member-modal__overlay')) {
      this.dismissed.emit();
    }
  }

  protected onKindChange(kind: DlcInviteMemberRecipientKind): void {
    this._kind.set(kind);
  }

  protected onEmailChange(value: string): void {
    this._email.set(value);
  }

  protected onPhoneChange(value: string): void {
    this._phone.set(value);
  }

  protected onRoleChange(value: null | string): void {
    if (value === null) return;
    // REX-527 — guard against an unexpected payload that doesn't match the
    // current option set; we only commit values the host has declared as
    // selectable so a malformed `dlc-select` event can never strand the form
    // with an invalid role.
    if (this._validRoleValues().has(value)) {
      this._role.set(value);
    }
  }

  protected onMessageChange(value: string): void {
    this._message.set(value);
  }

  protected onSubmit(): void {
    if (!this._canSubmit()) return;
    const kind = this._kind();
    const trimmedMessage = this._message().trim();
    const payload: DlcInviteMemberFormValue = {
      inviteeRole: this._role(),
      recipient:
        kind === 'email'
          ? { email: this._email().trim(), kind: 'email' }
          : { kind: 'phone', phone: this._phone().trim() },
    };
    if (trimmedMessage.length > 0) {
      payload.message = trimmedMessage;
    }
    this.submitted.emit(payload);
  }

  private resetForm(): void {
    this._kind.set('email');
    this._email.set('');
    this._phone.set('');
    // REX-527 — default to whichever option the host is presenting first; an
    // empty `roleOptions` set (defensive) lands as empty-string so the form
    // simply renders with no selection until the user picks.
    this._role.set(this.roleOptions()[0]?.value ?? '');
    this._message.set('');
  }
}
