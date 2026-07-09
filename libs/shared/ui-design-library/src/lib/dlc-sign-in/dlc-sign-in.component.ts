import type { AbstractControl, ValidationErrors } from '@angular/forms';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcInputComponent } from '../dlc-input/dlc-input.component';

export interface SignInCredentials {
  email: string;
  password: string;
}

export type DlcSignInMode = 'signIn' | 'signUp';

function passwordMatchValidator(group: AbstractControl): null | ValidationErrors {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  // Let `required` handle empty values — only flag mismatches between two non-empty entries.
  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sign-in' },
  imports: [ReactiveFormsModule, DlcButtonComponent, DlcInputComponent],
  selector: 'dlc-sign-in',
  templateUrl: './dlc-sign-in.component.html',
})
export class DlcSignInComponent {
  readonly loading = input(false);
  readonly errorMessage = input<null | string>(null);
  readonly googleEnabled = input(false);

  readonly signIn = output<SignInCredentials>();
  readonly signUp = output<SignInCredentials>();
  readonly googleSignIn = output<void>();

  protected readonly mode = signal<DlcSignInMode>('signIn');

  protected readonly heading = computed(() =>
    this.mode() === 'signIn' ? 'Sign in to concierge' : 'Create your concierge account'
  );

  protected readonly subheading = computed(() =>
    this.mode() === 'signIn'
      ? 'Enter your credentials to continue.'
      : 'Use your work email to get started.'
  );

  protected readonly primaryLabel = computed(() =>
    this.mode() === 'signIn' ? 'Sign in' : 'Create account'
  );

  protected readonly togglePrompt = computed(() =>
    this.mode() === 'signIn' ? "Don't have an account?" : 'Already have an account?'
  );

  protected readonly toggleAction = computed(() =>
    this.mode() === 'signIn' ? 'Create one' : 'Sign in'
  );

  protected readonly isSignUp = computed(() => this.mode() === 'signUp');

  private readonly fb = inject(FormBuilder);
  protected readonly form = this.fb.nonNullable.group({
    confirmPassword: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected emailError(): null | string {
    const control = this.form.controls.email;
    if (!(control.touched && control.invalid)) return null;
    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Enter a valid email';
    return null;
  }

  protected passwordError(): null | string {
    const control = this.form.controls.password;
    if (!(control.touched && control.invalid)) return null;
    if (control.hasError('required')) return 'Password is required';
    if (control.hasError('minlength')) return 'Password must be at least 6 characters';
    return null;
  }

  protected confirmPasswordError(): null | string {
    if (this.mode() !== 'signUp') return null;
    const control = this.form.controls.confirmPassword;
    if (!control.touched) return null;
    if (control.hasError('required')) return 'Please confirm your password';
    if (control.hasError('minlength')) return 'Password must be at least 6 characters';
    if (this.form.hasError('passwordMismatch')) return 'Passwords do not match';
    return null;
  }

  protected onGoogleClick(): void {
    if (this.loading()) return;
    this.googleSignIn.emit();
  }

  protected toggleMode(): void {
    const next: DlcSignInMode = this.mode() === 'signIn' ? 'signUp' : 'signIn';
    this.mode.set(next);
    this.form.reset();
    this.applyModeValidators(next);
  }

  private applyModeValidators(mode: DlcSignInMode): void {
    const confirmPassword = this.form.controls.confirmPassword;
    if (mode === 'signUp') {
      confirmPassword.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.setValidators(passwordMatchValidator);
    } else {
      confirmPassword.clearValidators();
      this.form.clearValidators();
    }
    confirmPassword.updateValueAndValidity({ emitEvent: false });
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const credentials: SignInCredentials = {
      email: this.form.controls.email.value,
      password: this.form.controls.password.value,
    };
    if (this.mode() === 'signIn') {
      this.signIn.emit(credentials);
    } else {
      this.signUp.emit(credentials);
    }
  }
}
