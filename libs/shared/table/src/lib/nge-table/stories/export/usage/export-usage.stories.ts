import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableExportUsageStoriesComponent } from './export-usage-stories.component';

const meta: Meta<NgeTableExportUsageStoriesComponent> = {
  component: NgeTableExportUsageStoriesComponent,
  title: 'Table/NgeTable/Export/Usage',
};

export default meta;
type Story = StoryObj<NgeTableExportUsageStoriesComponent>;

export const Usage: Story = {
  args: {},
};
