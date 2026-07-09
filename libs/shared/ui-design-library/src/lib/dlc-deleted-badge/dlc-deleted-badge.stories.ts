import type { Meta, StoryObj } from '@storybook/angular';

import { DlcDeletedBadgeComponent } from './dlc-deleted-badge.component';

const meta: Meta<DlcDeletedBadgeComponent> = {
  argTypes: {
    daysRemaining: {
      control: { type: 'number' },
      description:
        'Days until permanent deletion. `null` shows only “Deleted”; `0` shows “expires today”; a positive number shows a countdown.',
    },
  },
  component: DlcDeletedBadgeComponent,
  tags: ['autodocs'],
  title: 'UI Design Library/Deleted Badge',
};

export default meta;

type Story = StoryObj<DlcDeletedBadgeComponent>;

export const Default: Story = {
  args: { daysRemaining: null },
};

export const CountdownDays: Story = {
  args: { daysRemaining: 15 },
};

export const OneDayLeft: Story = {
  args: { daysRemaining: 1 },
};

export const ExpiresToday: Story = {
  args: { daysRemaining: 0 },
};
