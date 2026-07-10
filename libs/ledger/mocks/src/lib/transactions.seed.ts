import type { Transaction } from '@nge/ledger-models';

/**
 * Generate deterministic transactions for the seed dataset.
 * Transactions span Feb 1 - Jul 10, 2026, with recurring income and varied expenses.
 */
function generateTransactions(): Transaction[] {
  const transactions: Transaction[] = [];
  let txnId = 1;

  // Helper to format date as YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number): string => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Helper to get number of days in a month
  const daysInMonth = (year: number, month: number): number => {
    if (month === 2) return 28; // 2026 is not a leap year
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  };

  // Merchant names for varied expenses
  const groceryMerchants = [
    'Trader Joe\'s',
    'Whole Foods',
    'Safeway',
    'Kroger',
    'Costco',
  ];
  const diningMerchants = [
    'Chipotle',
    'The Shed',
    'Chez Pierre',
    'Curry House',
    'Pizza Parlor',
    'Sushi Bar',
    'Thai Palace',
  ];
  const shoppingMerchants = [
    'Target',
    'Amazon',
    'Best Buy',
    'H&M',
    'Gap',
    'REI',
    'Nordstrom',
  ];
  const transportationMerchants = [
    'Shell Gas',
    'Chevron',
    'Uber',
    'Lyft',
    'BART',
    'United Airlines',
  ];
  const healthMerchants = [
    'CVS Pharmacy',
    'Walgreens',
    'Dr. Smith',
    'Dental Associates',
    'Gym Membership',
  ];
  const entertainmentMerchants = [
    'Netflix',
    'Spotify',
    'AMC Theaters',
    'Local Theater',
    'Concert Hall',
  ];

  // Month ranges to process: Feb (2) through Jul (7)
  for (let month = 2; month <= 7; month++) {
    const year = 2026;
    const daysInCurrentMonth = daysInMonth(year, month);
    const lastDay = month === 7 ? 10 : daysInCurrentMonth; // Only through Jul 10

    // --- Recurring income ---
    // Salary on the 1st and 15th (or within the month)
    if (month < 7 || lastDay >= 1) {
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-salary',
        amountCents: 350000, // $3500 (positive = income)
        date: formatDate(year, month, 1),
        merchant: 'Employer Payroll',
        notes: 'Monthly salary deposit',
      });
      txnId++;
    }

    if ((month < 7 || lastDay >= 15) && lastDay >= 15) {
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-salary',
        amountCents: 350000, // $3500
        date: formatDate(year, month, 15),
        merchant: 'Employer Payroll',
        notes: 'Monthly salary deposit',
      });
      txnId++;
    }

    // Interest on savings (end of month)
    if (lastDay >= 28 || (month === 7 && lastDay >= 10)) {
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-savings',
        categoryId: 'cat-interest',
        amountCents: 2000, // $20 (positive = inflow)
        date: formatDate(year, month, Math.min(lastDay, 28)),
        merchant: 'Bank Interest',
        notes: 'Monthly interest',
      });
      txnId++;
    }

    // --- Recurring fixed expenses ---
    // Rent on the 5th
    if (lastDay >= 5) {
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-housing',
        amountCents: -150000, // -$1500 (negative = expense)
        date: formatDate(year, month, 5),
        merchant: 'Landlord Rent',
        notes: 'Monthly rent payment',
      });
      txnId++;
    }

    // Utilities on the 15th
    if (lastDay >= 15) {
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-utilities',
        amountCents: -12000, // -$120
        date: formatDate(year, month, 15),
        merchant: 'City Power & Water',
        notes: 'Utility bill',
      });
      txnId++;
    }

    // --- Variable expenses spread throughout the month ---
    // Groceries (2-3 times per week, deterministic based on month)
    const groceryDays = [3, 10, 17, 24, Math.min(31, lastDay)];
    for (let i = 0; i < groceryDays.length && groceryDays[i] <= lastDay; i++) {
      const amount = -4000 - (i * 500); // -$40 to -$60 per trip
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-groceries',
        amountCents: amount,
        date: formatDate(year, month, groceryDays[i]),
        merchant: groceryMerchants[i % groceryMerchants.length],
      });
      txnId++;
    }

    // Dining out (1-2 times per week)
    const diningDays = [4, 11, 18, 25];
    for (let i = 0; i < diningDays.length && diningDays[i] <= lastDay; i++) {
      const amount = -2500 - (i * 300); // -$25 to -$40
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-credit',
        categoryId: 'cat-dining',
        amountCents: amount,
        date: formatDate(year, month, diningDays[i]),
        merchant: diningMerchants[i % diningMerchants.length],
      });
      txnId++;
    }

    // Transportation (2 times per month + occasional Uber)
    const transDays = [2, 9, 16, 23, 27];
    for (let i = 0; i < transDays.length && transDays[i] <= lastDay; i++) {
      const amount = i === 4 ? -3500 : -5000; // -$35 or -$50
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-transportation',
        amountCents: amount,
        date: formatDate(year, month, transDays[i]),
        merchant:
          i === 2 ? 'Uber' : transportationMerchants[i % transportationMerchants.length],
      });
      txnId++;
    }

    // Health (occasional)
    const healthDays = [6, 14, 22];
    for (let i = 0; i < healthDays.length && healthDays[i] <= lastDay; i++) {
      const amount = i === 0 ? -15000 : -3000; // -$150 for pharmacy, -$30 for gym
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-checking',
        categoryId: 'cat-health',
        amountCents: amount,
        date: formatDate(year, month, healthDays[i]),
        merchant: healthMerchants[i % healthMerchants.length],
      });
      txnId++;
    }

    // Entertainment (1-2 times per month)
    const entertainmentDays = [8, 21];
    for (let i = 0; i < entertainmentDays.length && entertainmentDays[i] <= lastDay; i++) {
      const amount = -1500 - (i * 500); // -$15 to -$20
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-credit',
        categoryId: 'cat-entertainment',
        amountCents: amount,
        date: formatDate(year, month, entertainmentDays[i]),
        merchant: entertainmentMerchants[i % entertainmentMerchants.length],
      });
      txnId++;
    }

    // Shopping (occasional purchases)
    const shoppingDays = [7, 19, 26];
    for (let i = 0; i < shoppingDays.length && shoppingDays[i] <= lastDay; i++) {
      const amount = -5000 - (i * 1000); // -$50 to -$70
      transactions.push({
        id: `txn-${String(txnId).padStart(3, '0')}`,
        accountId: 'acc-credit',
        categoryId: 'cat-shopping',
        amountCents: amount,
        date: formatDate(year, month, shoppingDays[i]),
        merchant: shoppingMerchants[i % shoppingMerchants.length],
      });
      txnId++;
    }
  }

  // Add a few pending transactions near the end (July)
  transactions.push({
    id: `txn-${String(txnId).padStart(3, '0')}`,
    accountId: 'acc-credit',
    categoryId: 'cat-dining',
    amountCents: -3500,
    date: '2026-07-09',
    merchant: 'Local Bistro',
    notes: 'Pending transaction',
    pending: true,
  });
  txnId++;

  transactions.push({
    id: `txn-${String(txnId).padStart(3, '0')}`,
    accountId: 'acc-checking',
    categoryId: 'cat-groceries',
    amountCents: -5500,
    date: '2026-07-10',
    merchant: 'Whole Foods',
    notes: 'Pending transaction',
    pending: true,
  });

  return transactions;
}

export const ledgerTransactions: Transaction[] = generateTransactions();
