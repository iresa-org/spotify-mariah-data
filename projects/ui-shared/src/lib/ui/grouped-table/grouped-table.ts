import { NgTemplateOutlet } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import {
  Component,
  Directive,
  TemplateRef,
  computed,
  contentChildren,
  input,
  signal,
} from '@angular/core';

export interface GroupedTableColumn<T> {
  id: string;
  header: string;
  width?: string;
  align?: 'start' | 'end';
  value?: (row: T) => string | number | null | undefined;
}

export interface GroupedTableGroup<T> {
  id: string | number;
  label: string;
  rows: ReadonlyArray<T>;
}

export interface GroupedTableCellContext<T> {
  $implicit: T;
  row: T;
  group: GroupedTableGroup<T>;
  column: GroupedTableColumn<T>;
}

@Directive({
  selector: 'ng-template[libGroupedTableCell]',
})
export class GroupedTableCellDirective {
  readonly columnId = input.required<string>({ alias: 'libGroupedTableCell' });

  constructor(readonly template: TemplateRef<GroupedTableCellContext<unknown>>) {}
}

type GroupedTableRow<T> =
  | { kind: 'group'; group: GroupedTableGroup<T> }
  | { kind: 'data'; group: GroupedTableGroup<T>; row: T };

@Component({
  selector: 'lib-grouped-table',
  imports: [CdkTableModule, NgTemplateOutlet],
  templateUrl: './grouped-table.html',
  styleUrl: './grouped-table.scss',
})
export class GroupedTableComponent<T> {
  readonly columns = input.required<ReadonlyArray<GroupedTableColumn<T>>>();
  readonly groups = input.required<ReadonlyArray<GroupedTableGroup<T>>>();
  readonly ariaLabel = input('Grouped data table');
  readonly emptyMessage = input('No rows to display.');

  readonly cellTemplates = contentChildren(GroupedTableCellDirective);

  readonly dataRowColumns = computed(() => this.columns().map((column) => column.id));
  readonly groupRowColumns = computed(() => [this.groupColumnId]);

  readonly flattenedRows = computed<ReadonlyArray<GroupedTableRow<T>>>(() => {
    const rows: GroupedTableRow<T>[] = [];

    for (const group of this.groups()) {
      rows.push({ kind: 'group', group });

      if (!this.isGroupCollapsed(group.id)) {
        for (const row of group.rows) {
          rows.push({ kind: 'data', group, row });
        }
      }
    }

    return rows;
  });

  readonly templateMap = computed(() => {
    const map = new Map<string, TemplateRef<GroupedTableCellContext<T>>>();

    for (const templateDef of this.cellTemplates()) {
      map.set(
        templateDef.columnId(),
        templateDef.template as TemplateRef<GroupedTableCellContext<T>>,
      );
    }

    return map;
  });

  readonly isGroupRow = (_: number, row: GroupedTableRow<T>) => row.kind === 'group';
  readonly isDataRow = (_: number, row: GroupedTableRow<T>) => row.kind === 'data';

  readonly groupColumnId = '__group__';

  readonly collapsedGroupIds = signal<ReadonlySet<string | number>>(new Set());

  readonly isGroupCollapsed = (groupId: string | number) => this.collapsedGroupIds().has(groupId);

  toggleGroup(groupId: string | number) {
    const collapsedGroupIds = new Set(this.collapsedGroupIds());

    if (collapsedGroupIds.has(groupId)) {
      collapsedGroupIds.delete(groupId);
    } else {
      collapsedGroupIds.add(groupId);
    }

    this.collapsedGroupIds.set(collapsedGroupIds);
  }

  getCellTemplate(columnId: string) {
    return this.templateMap().get(columnId) ?? null;
  }

  getCellValue(column: GroupedTableColumn<T>, row: T) {
    return column.value?.(row) ?? '';
  }
}
