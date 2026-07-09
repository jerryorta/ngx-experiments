import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcButtonComponent } from '../../dlc-button/dlc-button.component';
import { DlcInputComponent } from '../../dlc-input/dlc-input.component';
import { DlcDialogComponent } from '../dlc-dialog.component';
import { DlcDialogStoriesComponent } from './dlc-dialog-stories.component';

const meta: Meta<DlcDialogStoriesComponent> = {
  argTypes: {
    ariaLabel: { control: 'text' },
    dismissOnBackdropClick: { control: 'boolean' },
    dismissOnEscape: { control: 'boolean' },
    showCloseButton: { control: 'boolean' },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    visible: { control: 'boolean' },
  },
  component: DlcDialogStoriesComponent,
  decorators: [applicationConfig({ providers: [provideAnimationsAsync()] })],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Dialog',
};
export default meta;
type Story = StoryObj<DlcDialogStoriesComponent>;

export const primary: Story = {
  args: {
    ariaLabel: 'Example dialog',
    dismissOnBackdropClick: true,
    dismissOnEscape: true,
    showCloseButton: true,
    size: 'md',
    visible: true,
  },
  name: 'Dialog',
};

const dialogModule = moduleMetadata({
  imports: [DlcDialogComponent, DlcButtonComponent, DlcInputComponent],
});

export const SmallConfirm: Story = {
  decorators: [dialogModule],
  name: 'Small (Confirm)',
  render: () => ({
    template: `
      <div style="position:relative;height:420px;background:var(--dlc-surface);overflow:hidden">
        <dlc-dialog [visible]="true" size="sm" ariaLabel="Delete contact">
          <h2 dlc-dialog-title class="text-lg font-semibold text-(--dlc-on-surface) font-[family-name:var(--dlc-font-family-display)]">Delete contact?</h2>
          <p dlc-dialog-content class="text-sm text-(--dlc-on-surface-variant)">This permanently removes the contact and cannot be undone.</p>
          <div dlc-dialog-actions>
            <dlc-button variant="ghost">Cancel</dlc-button>
            <dlc-button variant="danger">Delete</dlc-button>
          </div>
        </dlc-dialog>
      </div>`,
  }),
};

export const MediumForm: Story = {
  decorators: [dialogModule],
  name: 'Medium (Form)',
  render: () => ({
    template: `
      <div style="position:relative;height:520px;background:var(--dlc-surface);overflow:hidden">
        <dlc-dialog [visible]="true" size="md" ariaLabel="Create circle">
          <h2 dlc-dialog-title class="text-lg font-semibold text-(--dlc-on-surface) font-[family-name:var(--dlc-font-family-display)]">Create circle</h2>
          <div dlc-dialog-content class="flex flex-col gap-4">
            <dlc-input label="Circle name" placeholder="e.g. Smith Family Buy" />
            <dlc-input label="Primary contact" placeholder="Jane Smith" />
          </div>
          <div dlc-dialog-actions>
            <dlc-button variant="ghost">Cancel</dlc-button>
            <dlc-button variant="primary">Create</dlc-button>
          </div>
        </dlc-dialog>
      </div>`,
  }),
};

export const Large: Story = {
  decorators: [dialogModule],
  name: 'Large',
  render: () => ({
    template: `
      <div style="position:relative;height:560px;background:var(--dlc-surface);overflow:hidden">
        <dlc-dialog [visible]="true" size="lg" ariaLabel="Transaction details">
          <h2 dlc-dialog-title class="text-lg font-semibold text-(--dlc-on-surface) font-[family-name:var(--dlc-font-family-display)]">Transaction details</h2>
          <div dlc-dialog-content class="text-sm text-(--dlc-on-surface-variant)">
            <p>A larger surface for richer content — multi-column forms, summaries, or document previews.</p>
          </div>
          <div dlc-dialog-actions>
            <dlc-button variant="ghost">Close</dlc-button>
            <dlc-button variant="primary">Save</dlc-button>
          </div>
        </dlc-dialog>
      </div>`,
  }),
};

export const NonDismissable: Story = {
  decorators: [dialogModule],
  name: 'Non-Dismissable',
  render: () => ({
    template: `
      <div style="position:relative;height:420px;background:var(--dlc-surface);overflow:hidden">
        <dlc-dialog
          [visible]="true"
          size="sm"
          ariaLabel="Processing"
          [dismissOnBackdropClick]="false"
          [dismissOnEscape]="false"
          [showCloseButton]="false"
        >
          <h2 dlc-dialog-title class="text-lg font-semibold text-(--dlc-on-surface) font-[family-name:var(--dlc-font-family-display)]">Processing payment…</h2>
          <p dlc-dialog-content class="text-sm text-(--dlc-on-surface-variant)">No backdrop click, no Escape, no close button — the user must complete the flow.</p>
        </dlc-dialog>
      </div>`,
  }),
};
