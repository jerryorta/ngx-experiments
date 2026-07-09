import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import type { TemplateRef } from '@angular/core';

import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  contentChildren,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import type { DlcCellContext } from './dlc-cell.directive';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';
import { DlcCellDirective } from './dlc-cell.directive';
import { DlcRowExpansionDirective } from './dlc-row-expansion.directive';

export interface DlcTableColumn {
  key: string;
  label: string;
  /**
   * Pins the column to the left edge. Only one sticky column is supported;
   * multiple sticky columns will overlap because they all use `left: 0`.
   */
  sticky?: boolean;
  width?: string;
}

export interface DlcTableGroup<T = Record<string, unknown>> {
  accentColor?: string;
  collapsible?: boolean;
  /**
   * Optional stable identifier used as the collapse key.
   * When omitted, `label` is used instead — ensure labels are unique within
   * a table instance if `id` is not provided.
   */
  id?: string;
  label: string;
  rows: T[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-data-table' },
  imports: [CdkDrag, CdkDragPreview, CdkDropList, DlcIconDirective, NgTemplateOutlet],
  selector: 'dlc-data-table',
  styleUrl: './dlc-data-table.component.scss',
  templateUrl: './dlc-data-table.component.html',
})
export class DlcDataTableComponent<T = Record<string, unknown>> {
  readonly columns = input<DlcTableColumn[]>([]);
  readonly groups = input<DlcTableGroup<T>[]>([]);
  readonly rows = input<T[]>([]);

  /** ID of the currently expanded row. Matches the value returned by `getRowId`. */
  readonly expandedRowId = input<null | string>(null);

  /**
   * Function that returns a stable string ID for a given row.
   * Required to enable inline row expansion — if omitted, expansion is disabled.
   */
  readonly getRowId = input<((row: T) => string) | null>(null);

  /** Emitted when the user drags a column header to a new position. */
  readonly columnDropped = output<{ currentIndex: number; previousIndex: number }>();

  readonly cellDirectives = contentChildren(DlcCellDirective);
  readonly rowExpansion = contentChild(DlcRowExpansionDirective);

  readonly cellTemplateMap = computed(() => {
    const map = new Map<string, TemplateRef<DlcCellContext>>();
    for (const d of this.cellDirectives()) {
      map.set(d.dlcCell(), d.template);
    }
    return map;
  });

  readonly effectiveGroups = computed((): DlcTableGroup<T>[] => {
    if (this.groups().length > 0) return this.groups();
    const flatRows = this.rows();
    if (flatRows.length > 0) {
      return [{ label: '', rows: flatRows }];
    }
    return [];
  });

  private readonly _collapsedGroups = signal(new Set<string>());

  getGroupKey(group: DlcTableGroup<T>): string {
    return group.id ?? group.label;
  }

  isGroupCollapsed(groupKey: string): boolean {
    return this._collapsedGroups().has(groupKey);
  }

  toggleGroup(groupKey: string): void {
    const s = new Set(this._collapsedGroups());
    if (s.has(groupKey)) {
      s.delete(groupKey);
    } else {
      s.add(groupKey);
    }
    this._collapsedGroups.set(s);
  }

  getCellTemplate(key: string): TemplateRef<DlcCellContext> | undefined {
    return this.cellTemplateMap().get(key);
  }

  getCellValue(row: T, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  getExpandedRowKey(row: T): null | string {
    const fn = this.getRowId();
    return fn ? fn(row) : null;
  }

  dropHeader(event: CdkDragDrop<DlcTableColumn[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.columnDropped.emit({ currentIndex: event.currentIndex, previousIndex: event.previousIndex });
  }
}
