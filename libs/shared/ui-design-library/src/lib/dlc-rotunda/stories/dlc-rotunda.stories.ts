import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  applicationConfig,
  type Meta,
  type StoryObj,
} from '@storybook/angular';

import { DlcRotundaStoriesComponent } from './dlc-rotunda-stories.component';

const CORE_HALLS = [
  { accent: '#d4a843', icon: 'note', id: 'notes', label: 'Notes' },
  { accent: '#2dd4bf', icon: 'quiz', id: 'quizzes', label: 'Quiz' },
  {
    accent: '#a78bfa',
    icon: 'group',
    id: 'study-groups',
    label: 'Groups',
  },
  { accent: '#60a5fa', icon: 'school', id: 'classrooms', label: 'Class' },
  { accent: '#d4a843', icon: 'book', id: 'journal', label: 'Journal' },
];

const ALL_HALLS = [
  ...CORE_HALLS,
  { accent: '#4ade80', icon: 'work', id: 'projects', label: 'Projects' },
  {
    accent: '#fb923c',
    icon: 'search',
    id: 'investigations',
    label: 'Inquiry',
  },
  { accent: '#f87171', icon: 'science', id: 'research', label: 'Research' },
];

const meta: Meta<DlcRotundaStoriesComponent> = {
  argTypes: {
    coachMark: { control: 'boolean' },
    doorways: { control: 'object' },
    open: { control: 'boolean' },
  },
  component: DlcRotundaStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'Mobile Footer Nav/Rotunda',
};

export default meta;
type Story = StoryObj<DlcRotundaStoriesComponent>;

export const Closed: Story = {
  args: {
    doorways: CORE_HALLS,
    open: false,
  },
};

/** First run: the oculus has to teach its own gesture before it can be used (COG-60). */
export const Coaching: Story = {
  args: {
    coachMark: true,
    doorways: CORE_HALLS,
    open: false,
  },
};

export const BloomedFiveHalls: Story = {
  args: {
    doorways: CORE_HALLS,
    open: true,
  },
};

export const BloomedEightHalls: Story = {
  args: {
    doorways: ALL_HALLS,
    open: true,
  },
};

export const SingleHall: Story = {
  args: {
    doorways: [CORE_HALLS[0]],
    open: true,
  },
};
