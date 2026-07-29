import { type Meta, type StoryObj } from '@storybook/angular';

import { NgeTableExportInteractionStoriesComponent } from './export-interaction-stories.component';

const meta: Meta<NgeTableExportInteractionStoriesComponent> = {
  argTypes: {
    byteOrderMark: {
      control: 'boolean',
      description:
        'Prepend U+FEFF. Off by default; Excel on Windows needs it to read a UTF-8 file as UTF-8.',
      table: { category: 'CSV - Encoding' },
    },
    delimiter: {
      control: 'select',
      description:
        'The field separator. Quoting is decided against THIS value, never a literal comma.',
      options: [',', ';', '\t', '|'],
      table: { category: 'CSV - Flags' },
    },
    escapeFormulas: {
      control: 'boolean',
      description:
        "Prefix a formula-shaped field with `'` so a spreadsheet reads it as text. Off by default — it alters the data, so an escaped field no longer round-trips. A no-op over the fixture; section 7 supplies values that show it working.",
      table: { category: 'CSV - Flags' },
    },
    header: {
      control: 'boolean',
      description: "Emit a first record from the export's columns.",
      table: { category: 'CSV - Flags' },
    },
    values: {
      control: 'inline-radio',
      description:
        'Which reading of each cell becomes its text — `formatted` for a person, `raw` for a machine.',
      options: ['formatted', 'raw'],
      table: { category: 'CSV - Flags' },
    },
  },
  component: NgeTableExportInteractionStoriesComponent,
  title: 'Table/NgeTable/Export/Interaction',
};

export default meta;
type Story = StoryObj<NgeTableExportInteractionStoriesComponent>;

export const Interaction: Story = {
  args: {
    byteOrderMark: false,
    delimiter: ',',
    escapeFormulas: false,
    header: true,
    values: 'formatted',
  },
};
