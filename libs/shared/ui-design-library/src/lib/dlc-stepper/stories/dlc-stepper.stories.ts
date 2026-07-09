import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcStepperComponent } from '../dlc-stepper.component';
import { DlcStepperStoriesComponent } from './dlc-stepper-stories.component';

const meta: Meta<DlcStepperStoriesComponent> = {
  argTypes: {
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
    },
  },
  component: DlcStepperStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Stepper',
};

export default meta;
type Story = StoryObj<DlcStepperStoriesComponent>;

export const primary: Story = {
  args: {
    orientation: 'horizontal',
  },
  name: 'Stepper',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcStepperComponent] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
        <div class="dlc-professional-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
        <div class="dlc-home-dark"          style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
        <div class="dlc-home-light"         style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
        <div class="dlc-service-provider-dark"  style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
        <div class="dlc-service-provider-light" style="padding:2rem;background:var(--dlc-surface)"><dlc-stepper [steps]="[{label:'Start',state:'completed'},{label:'Middle',state:'active'},{label:'End',state:'upcoming'}]"></dlc-stepper></div>
      </div>`,
  }),
};
