import type { Bill } from '@nge/ledger-models';

export const ledgerBills: Bill[] = [
  {
    id: 'bill-rent',
    name: 'Rent',
    amountCents: 150000, // $1500
    dueDate: '2026-07-05',
    recurrence: 'monthly',
    categoryId: 'cat-housing',
    accountId: 'acc-checking',
    autopay: true,
    status: 'paid',
  },
  {
    id: 'bill-electric',
    name: 'Electric Bill',
    amountCents: 12000, // $120
    dueDate: '2026-07-15',
    recurrence: 'monthly',
    categoryId: 'cat-utilities',
    accountId: 'acc-checking',
    autopay: true,
    status: 'upcoming',
  },
  {
    id: 'bill-internet',
    name: 'Internet Service',
    amountCents: 7500, // $75
    dueDate: '2026-07-08',
    recurrence: 'monthly',
    categoryId: 'cat-utilities',
    accountId: 'acc-checking',
    autopay: true,
    status: 'paid',
  },
  {
    id: 'bill-phone',
    name: 'Mobile Phone',
    amountCents: 8000, // $80
    dueDate: '2026-07-20',
    recurrence: 'monthly',
    categoryId: 'cat-utilities',
    accountId: 'acc-checking',
    autopay: true,
    status: 'upcoming',
  },
  {
    id: 'bill-netflix',
    name: 'Netflix Subscription',
    amountCents: 1599, // $15.99
    dueDate: '2026-07-12',
    recurrence: 'monthly',
    categoryId: 'cat-entertainment',
    accountId: 'acc-credit',
    autopay: true,
    status: 'paid',
  },
  {
    id: 'bill-insurance',
    name: 'Auto Insurance',
    amountCents: 15000, // $150
    dueDate: '2026-07-01',
    recurrence: 'monthly',
    categoryId: 'cat-transportation',
    accountId: 'acc-checking',
    autopay: true,
    status: 'paid',
  },
  {
    id: 'bill-gym',
    name: 'Gym Membership',
    amountCents: 5000, // $50
    dueDate: '2026-07-10',
    recurrence: 'monthly',
    categoryId: 'cat-health',
    accountId: 'acc-credit',
    autopay: true,
    status: 'upcoming',
  },
  {
    id: 'bill-cloud-storage',
    name: 'Cloud Storage',
    amountCents: 1199, // $11.99
    dueDate: '2026-07-25',
    recurrence: 'monthly',
    categoryId: 'cat-shopping',
    accountId: 'acc-checking',
    autopay: false,
    status: 'upcoming',
  },
];
