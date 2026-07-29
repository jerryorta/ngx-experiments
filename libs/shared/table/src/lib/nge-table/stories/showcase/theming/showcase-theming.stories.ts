import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableShowcaseThemingComponent } from './showcase-theming.component';

const meta: Meta<NgeTableShowcaseThemingComponent> = {
  component: NgeTableShowcaseThemingComponent,
  title: 'Table/NgeTable/Showcase/Theming',
};

export default meta;
type Story = StoryObj<NgeTableShowcaseThemingComponent>;

export const Theming: Story = {
  args: {},
};
