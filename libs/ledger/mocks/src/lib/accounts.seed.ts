import type { Account } from '@nge/ledger-models';

export const ledgerAccounts: Account[] = [
  {
    id: 'acc-checking',
    name: 'Checking',
    type: 'checking',
    balanceCents: 542350, // $5423.50
    currency: 'USD',
    institution: 'Chase',
    last4: '4412',
  },
  {
    id: 'acc-savings',
    name: 'Savings',
    type: 'savings',
    balanceCents: 2500000, // $25000.00
    currency: 'USD',
    institution: 'Bank of America',
    last4: '8901',
  },
  {
    id: 'acc-credit',
    name: 'Credit Card',
    type: 'credit',
    balanceCents: -350500, // -$3505.00 (money owed)
    currency: 'USD',
    institution: 'American Express',
    last4: '3456',
  },
  {
    id: 'acc-investment',
    name: 'Brokerage',
    type: 'investment',
    balanceCents: 8500000, // $85000.00
    currency: 'USD',
    institution: 'Fidelity',
    last4: '7890',
  },
];
