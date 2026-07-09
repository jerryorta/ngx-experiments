import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcTableColumn, DlcTableGroup } from '../dlc-data-table.component';

import { DlcCellDirective } from '../dlc-cell.directive';
import { DlcDataTableComponent } from '../dlc-data-table.component';

interface CrmRow {
  email: string;
  name: string;
  phone: string;
  status: string;
}

interface CmaRow {
  address: string;
  baths: number;
  beds: number;
  price: string;
  sqft: number;
  yearBuilt: number;
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-data-table-stories',
  },
  imports: [DlcDataTableComponent, DlcCellDirective, NgeStorybookReviewContainerComponent],
  selector: 'dlc-data-table-stories',
  standalone: true,
  styleUrl: './dlc-data-table-stories.component.scss',
  templateUrl: './dlc-data-table-stories.component.html',
})
export class DlcDataTableStoriesComponent {
  readonly crmColumns: DlcTableColumn[] = [
    { key: 'name', label: 'Name', sticky: true },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status', width: '120px' },
  ];

  readonly crmGroups: DlcTableGroup<CrmRow>[] = [
    {
      accentColor: '#4caf50',
      collapsible: true,
      label: 'Active Clients',
      rows: [
        {
          email: 'alice@example.com',
          name: 'Alice Johnson',
          phone: '(555) 201-3456',
          status: 'active',
        },
        {
          email: 'bob@example.com',
          name: 'Bob Martinez',
          phone: '(555) 307-8921',
          status: 'active',
        },
      ],
    },
    {
      accentColor: '#ff9800',
      collapsible: true,
      label: 'Leads',
      rows: [
        {
          email: 'carol@example.com',
          name: 'Carol Smith',
          phone: '(555) 412-6730',
          status: 'pending',
        },
      ],
    },
  ];

  readonly cmaColumns: DlcTableColumn[] = [
    { key: 'address', label: 'Address', sticky: true, width: '200px' },
    { key: 'price', label: 'Price' },
    { key: 'sqft', label: 'Sq Ft' },
    { key: 'beds', label: 'Beds' },
    { key: 'baths', label: 'Baths' },
    { key: 'yearBuilt', label: 'Year Built' },
  ];

  readonly cmaRows: CmaRow[] = [
    { address: '123 Oak Ave', baths: 2, beds: 3, price: '$485,000', sqft: 1850, yearBuilt: 2001 },
    {
      address: '456 Maple Blvd',
      baths: 3,
      beds: 4,
      price: '$612,500',
      sqft: 2340,
      yearBuilt: 2008,
    },
    { address: '789 Pine St', baths: 2, beds: 3, price: '$459,000', sqft: 1720, yearBuilt: 1998 },
  ];

  readonly statusColors: Record<string, string> = {
    active: '#4caf50',
    inactive: '#9e9e9e',
    pending: '#ff9800',
  };

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-data-table/stories';
}
