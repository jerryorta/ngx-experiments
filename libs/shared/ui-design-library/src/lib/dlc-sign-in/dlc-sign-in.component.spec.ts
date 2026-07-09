import type { ComponentFixture } from '@angular/core/testing';
import type { FormControl, FormGroup } from '@angular/forms';

import { TestBed } from '@angular/core/testing';

import type { SignInCredentials } from './dlc-sign-in.component';

import { DlcSignInComponent } from './dlc-sign-in.component';

type SignInForm = FormGroup<{
  confirmPassword: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
}>;

interface DlcSignInComponentInternals {
  form: SignInForm;
}

const internals = (component: DlcSignInComponent): DlcSignInComponentInternals =>
  component as unknown as DlcSignInComponentInternals;

describe('DlcSignInComponent', () => {
  let component: DlcSignInComponent;
  let fixture: ComponentFixture<DlcSignInComponent>;
  let compiled: HTMLElement;

  const setFormValue = (email: string, password: string, confirmPassword?: string): void => {
    const form = internals(component).form;
    form.controls.email.setValue(email);
    form.controls.password.setValue(password);
    if (confirmPassword !== undefined) {
      form.controls.confirmPassword.setValue(confirmPassword);
    }
  };

  const submitForm = (): void => {
    const formEl = compiled.querySelector('form') as HTMLFormElement;
    formEl.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSignInComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcSignInComponent);
    component = fixture.componentInstance;
    compiled = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-sign-in host class', () => {
    expect(compiled.classList.contains('dlc-sign-in')).toBe(true);
  });

  it('emits signIn with credentials on valid submit in signIn mode', () => {
    const signInSpy = jest.fn();
    const signUpSpy = jest.fn();
    component.signIn.subscribe((creds: SignInCredentials) => signInSpy(creds));
    component.signUp.subscribe((creds: SignInCredentials) => signUpSpy(creds));

    setFormValue('user@example.com', 'secret123');
    submitForm();

    expect(signInSpy).toHaveBeenCalledTimes(1);
    expect(signInSpy).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret123' });
    expect(signUpSpy).not.toHaveBeenCalled();
  });

  it('emits signUp after toggling to signUp mode', () => {
    const signInSpy = jest.fn();
    const signUpSpy = jest.fn();
    component.signIn.subscribe((creds: SignInCredentials) => signInSpy(creds));
    component.signUp.subscribe((creds: SignInCredentials) => signUpSpy(creds));

    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    setFormValue('new@example.com', 'secret123', 'secret123');
    submitForm();

    expect(signUpSpy).toHaveBeenCalledTimes(1);
    expect(signUpSpy).toHaveBeenCalledWith({ email: 'new@example.com', password: 'secret123' });
    expect(signInSpy).not.toHaveBeenCalled();
  });

  it('does not emit when email is invalid; marks controls touched', () => {
    const signInSpy = jest.fn();
    component.signIn.subscribe((creds: SignInCredentials) => signInSpy(creds));

    setFormValue('not-an-email', 'secret123');
    submitForm();

    expect(signInSpy).not.toHaveBeenCalled();
    const form = internals(component).form;
    expect(form.controls.email.touched).toBe(true);
    expect(form.controls.password.touched).toBe(true);
  });

  it('does not emit when password is shorter than 6 characters', () => {
    const signInSpy = jest.fn();
    component.signIn.subscribe((creds: SignInCredentials) => signInSpy(creds));

    setFormValue('user@example.com', 'abc');
    submitForm();

    expect(signInSpy).not.toHaveBeenCalled();
  });

  it('surfaces errorMessage input in the template', () => {
    fixture.componentRef.setInput('errorMessage', 'Invalid credentials');
    fixture.detectChanges();
    const errorEl = compiled.querySelector('[data-testid="dlc-sign-in-error"]');
    expect(errorEl?.textContent?.trim()).toBe('Invalid credentials');
  });

  it('disables the submit button when loading is true', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const submitButton = compiled.querySelector(
      '[data-testid="dlc-sign-in-submit"] button'
    ) as HTMLButtonElement;
    expect(submitButton.hasAttribute('disabled')).toBe(true);
  });

  it('hides the Google sign-in button by default', () => {
    const googleButton = compiled.querySelector('[data-testid="dlc-sign-in-google"]');
    expect(googleButton).toBeNull();
  });

  it('shows the Google sign-in button when googleEnabled is true', () => {
    fixture.componentRef.setInput('googleEnabled', true);
    fixture.detectChanges();
    const googleButton = compiled.querySelector(
      '[data-testid="dlc-sign-in-google"]'
    ) as HTMLButtonElement | null;
    expect(googleButton).not.toBeNull();
    expect(googleButton?.textContent?.trim()).toContain('Continue with Google');
  });

  it('emits googleSignIn exactly once when the Google button is clicked', () => {
    const googleSpy = jest.fn();
    component.googleSignIn.subscribe(() => googleSpy());

    fixture.componentRef.setInput('googleEnabled', true);
    fixture.detectChanges();

    const googleButton = compiled.querySelector(
      '[data-testid="dlc-sign-in-google"]'
    ) as HTMLButtonElement;
    googleButton.click();

    expect(googleSpy).toHaveBeenCalledTimes(1);
  });

  it('does not emit googleSignIn when loading is true and marks the button disabled', () => {
    const googleSpy = jest.fn();
    component.googleSignIn.subscribe(() => googleSpy());

    fixture.componentRef.setInput('googleEnabled', true);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const googleButton = compiled.querySelector(
      '[data-testid="dlc-sign-in-google"]'
    ) as HTMLButtonElement;
    expect(googleButton.hasAttribute('disabled')).toBe(true);
    googleButton.click();

    expect(googleSpy).not.toHaveBeenCalled();
  });

  it('toggles heading and primary button label between signIn and signUp modes', () => {
    const heading = () =>
      compiled.querySelector('[data-testid="dlc-sign-in-heading"]')?.textContent?.trim();
    const submit = () =>
      compiled.querySelector('[data-testid="dlc-sign-in-submit"]')?.textContent?.trim();

    expect(heading()).toBe('Sign in to concierge');
    expect(submit()).toBe('Sign in');

    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(heading()).toBe('Create your concierge account');
    expect(submit()).toBe('Create account');
  });

  it('renders the toggle CTA as a prompt above a ghost dlc-button', () => {
    const alt = compiled.querySelector('.dlc-sign-in__alt') as HTMLElement;
    const toggleHost = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    const promptSpan = alt.querySelector(':scope > span') as HTMLElement;
    const innerButton = toggleHost.querySelector('button') as HTMLButtonElement;

    expect(alt).not.toBeNull();
    expect(promptSpan.textContent?.trim()).toBe("Don't have an account?");
    expect(toggleHost.tagName.toLowerCase()).toBe('dlc-button');
    expect(toggleHost.classList.contains('dlc-button--ghost')).toBe(true);
    expect(innerButton.textContent?.trim()).toBe('Create one');
  });

  it('renders the toggle outside the form to avoid hijacking submit', () => {
    const form = compiled.querySelector('form') as HTMLFormElement;
    const toggleHost = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;

    expect(form.contains(toggleHost)).toBe(false);
  });

  it('updates the prompt and action when toggled to signUp mode', () => {
    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    const alt = compiled.querySelector('.dlc-sign-in__alt') as HTMLElement;
    const promptSpan = alt.querySelector(':scope > span') as HTMLElement;
    const innerButton = toggle.querySelector('button') as HTMLButtonElement;

    expect(promptSpan.textContent?.trim()).toBe('Already have an account?');
    expect(innerButton.textContent?.trim()).toBe('Sign in');
  });

  it('does not render the confirm-password field in signIn mode', () => {
    const confirm = compiled.querySelector('[data-testid="dlc-sign-in-confirm-password"]');
    expect(confirm).toBeNull();
  });

  it('renders the confirm-password field after toggling to signUp mode', () => {
    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    const confirm = compiled.querySelector('[data-testid="dlc-sign-in-confirm-password"]');
    expect(confirm).not.toBeNull();
  });

  it('enables the visibility toggle on the password field', () => {
    const passwordVisibilityToggle = compiled.querySelector(
      '[data-testid="dlc-input-visibility-toggle"]'
    );
    expect(passwordVisibilityToggle).not.toBeNull();
  });

  it('enables the visibility toggle on the confirm-password field in signUp mode', () => {
    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    // After toggling to signUp mode there are now two password fields,
    // each carrying its own visibility toggle button.
    const allVisibilityToggles = compiled.querySelectorAll(
      '[data-testid="dlc-input-visibility-toggle"]'
    );
    expect(allVisibilityToggles.length).toBe(2);
  });

  it('blocks signUp emit when confirmPassword does not match password', () => {
    const signUpSpy = jest.fn();
    component.signUp.subscribe((creds: SignInCredentials) => signUpSpy(creds));

    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    const form = internals(component).form;
    form.controls.email.setValue('new@example.com');
    form.controls.password.setValue('secret123');
    form.controls.confirmPassword.setValue('different123');
    submitForm();

    expect(signUpSpy).not.toHaveBeenCalled();
    expect(form.hasError('passwordMismatch')).toBe(true);
  });

  it('blocks signUp emit when confirmPassword is empty', () => {
    const signUpSpy = jest.fn();
    component.signUp.subscribe((creds: SignInCredentials) => signUpSpy(creds));

    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    const form = internals(component).form;
    form.controls.email.setValue('new@example.com');
    form.controls.password.setValue('secret123');
    // confirmPassword intentionally left empty
    submitForm();

    expect(signUpSpy).not.toHaveBeenCalled();
    expect(form.controls.confirmPassword.hasError('required')).toBe(true);
  });

  it('emits signUp when password and confirmPassword match', () => {
    const signUpSpy = jest.fn();
    component.signUp.subscribe((creds: SignInCredentials) => signUpSpy(creds));

    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click();
    fixture.detectChanges();

    const form = internals(component).form;
    form.controls.email.setValue('new@example.com');
    form.controls.password.setValue('secret123');
    form.controls.confirmPassword.setValue('secret123');
    submitForm();

    expect(signUpSpy).toHaveBeenCalledTimes(1);
    expect(signUpSpy).toHaveBeenCalledWith({ email: 'new@example.com', password: 'secret123' });
  });

  it('clears confirmPassword validators when toggling back to signIn mode', () => {
    const toggle = compiled.querySelector('[data-testid="dlc-sign-in-toggle"]') as HTMLElement;
    toggle.click(); // → signUp
    fixture.detectChanges();
    toggle.click(); // → signIn
    fixture.detectChanges();

    const signInSpy = jest.fn();
    component.signIn.subscribe((creds: SignInCredentials) => signInSpy(creds));

    setFormValue('user@example.com', 'secret123');
    submitForm();

    expect(signInSpy).toHaveBeenCalledTimes(1);
    expect(signInSpy).toHaveBeenCalledWith({ email: 'user@example.com', password: 'secret123' });
  });
});
