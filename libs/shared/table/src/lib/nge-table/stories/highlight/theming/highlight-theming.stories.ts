import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableHighlightThemingComponent } from './highlight-theming.component';

const meta: Meta<NgeTableHighlightThemingComponent> = {
  component: NgeTableHighlightThemingComponent,
  title: 'Table/NgeTable/Highlight/Theming',
};

export default meta;
type Story = StoryObj<NgeTableHighlightThemingComponent>;

export const Theming: Story = {
  args: {},
};
