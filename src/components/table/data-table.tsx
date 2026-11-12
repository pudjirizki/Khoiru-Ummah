import React from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
import { GroupBase, StylesConfig } from 'react-select';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, SortingState, getSortedRowModel, OnChangeFn, RowSelectionState } from '@tanstack/react-table';
// components
import { Button } from '/src/components/button';
import { SelectField } from '/src/components/form';

// ----------------------------------------------------------------------
interface OptionSelectInterface {
  label: string;
  value: string;
  isDisabled?: boolean;
}

interface GroupedOptionSelectInterface extends GroupBase<OptionSelectInterface> {
  label: string;
  options: OptionSelectInterface[];
}

type DataTableProps<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  page?: number;
  perPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  isLoading?: boolean;
  getRowId?: (row: T) => string;
  rowActions?: (row: T) => React.ReactNode;
  className?: string;
};

// ----------------------------------------------------------------------

const pageOptions: OptionSelectInterface[] = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '50', label: '50' },
];

const customStyleSelect: StylesConfig<OptionSelectInterface, false, GroupedOptionSelectInterface> = {
  control: (provided, state) => ({
    ...provided,
    borderWidth: '1px',
    borderColor: state.isDisabled ? '#CBD5E1' : state.isFocused ? '#15803D' : '#E2E8F0',
    boxShadow: state.isFocused ? '0 0 0 1px rgba(21, 128, 61, 0.16)' : 'none',
    backgroundColor: state.isDisabled ? '#F1F5F9' : '#FFFFFF',
    minWidth: '50px',
    width: '100%',
    fontSize: '14px',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    padding: '2px 0',
    borderRadius: '12px',
    transition: 'all 180ms ease',
    fontFamily: 'Poppins, sans-serif',
    ':hover': {
      borderColor: '#15803D',
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#0F172A',
    fontWeight: 500,
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#94A3B8',
  }),
  indicatorSeparator: (provided) => ({
    ...provided,
    backgroundColor: '#E2E8F0',
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
  }),
  option: (provided, state) => ({
    ...provided,
    fontSize: '14px',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 180ms ease',
    fontFamily: 'Poppins, sans-serif',
    color: state.isDisabled ? '#94A3B8' : state.isSelected ? '#FFFFFF' : '#0F172A',
    backgroundColor: state.isSelected ? '#15803D' : state.isFocused ? '#ECFDF5' : '#FFFFFF',
    ':hover': {
      backgroundColor: state.isDisabled ? '#FFFFFF' : state.isSelected ? '#15803D' : '#ECFDF5',
      color: state.isDisabled ? '#94A3B8' : state.isSelected ? '#FFFFFF' : '#0F172A',
    },
  }),
};

// ----------------------------------------------------------------------

const DataTable = <T extends object>({
  columns,
  data,
  page = 1,
  perPage = 5,
  totalCount = 0,
  onPageChange,
  onPerPageChange,
  sorting = [],
  onSortingChange,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  isLoading = false,
  getRowId,
  rowActions,
  className,
}: DataTableProps<T>): JSX.Element => {
  const pageCount = Math.max(1, Math.ceil((totalCount || data.length) / Math.max(1, perPage)));
  const [internalRowSelection, setInternalRowSelection] = React.useState<RowSelectionState>({});
  const resolvedRowSelection = rowSelection ?? internalRowSelection;
  const handleRowSelectionChange = onRowSelectionChange ?? setInternalRowSelection;

  const selectionColumn = React.useMemo<ColumnDef<T>>(
    () => ({
      id: 'select',
      size: 52,
      enableSorting: false,
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Pilih semua baris di halaman ini"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (!el) return;
              el.indeterminate = table.getIsSomeRowsSelected();
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="size-4 cursor-pointer accent-primary-1"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Pilih baris"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            className="size-4 cursor-pointer accent-primary-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      ),
    }),
    []
  );

  const tableColumns = React.useMemo(() => (enableRowSelection ? [selectionColumn, ...columns] : columns), [columns, enableRowSelection, selectionColumn]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      pagination: {
        pageIndex: Math.max(0, page - 1),
        pageSize: perPage,
      },
      rowSelection: resolvedRowSelection,
    },
    manualPagination: true,
    pageCount,
    onSortingChange: onSortingChange ?? (() => {}),
    enableRowSelection,
    onRowSelectionChange: handleRowSelectionChange,
    getRowId: getRowId ? (row) => String(getRowId(row)) : undefined,
  });

  const visibleRows = table.getRowModel().rows;
  const colSpan = (table.getHeaderGroups()?.[0]?.headers.length ?? 1) + (rowActions ? 1 : 0);

  const currentStart = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const currentEnd = Math.min(totalCount, page * perPage);

  return (
    <div className={twMerge('overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full table-fixed border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Data table</caption>

          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gradient-to-r from-primary-1 to-primary-3">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    scope="col"
                    style={{ width: header.getSize() }}
                    className="border-b border-white/10 px-4 py-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.16em] text-white first:pl-5 last:pr-5"
                  >
                    {header.column.getCanSort() ? (
                      <button onClick={header.column.getToggleSortingHandler()} className="flex w-full items-center gap-2 rounded-lg transition hover:bg-white/10">
                        <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        <span className="text-[10px] opacity-80">{header.column.getIsSorted() ? (header.column.getIsSorted() === 'asc' ? '▲' : '▼') : '↕'}</span>
                      </button>
                    ) : (
                      <div className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</div>
                    )}
                  </th>
                ))}

                {rowActions && <th className="border-b border-white/10 px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.16em] text-white">Aksi</th>}
              </tr>
            ))}
          </thead>

          <tbody className="bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-1/10">
                      <Icon icon="svg-spinners:3-dots-scale" width={26} className="text-primary-1" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Memuat data</p>
                      <p className="mt-1 text-sm text-slate-500">Mohon tunggu sebentar, data sedang diproses.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : visibleRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-6 py-16">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <Icon icon="mingcute:database-2-fill" width={26} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">Tidak ada data</p>
                      <p className="mt-1 text-sm text-slate-500">Data belum tersedia atau hasil pencarian kosong.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              visibleRows.map((row, ridx) => (
                <tr key={row.id} className={twMerge('group transition-colors', ridx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60', 'hover:bg-primary-1/5')}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b border-slate-100 px-4 py-4 align-middle text-slate-700 first:pl-5 last:pr-5">
                      <div className="flex items-center">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                    </td>
                  ))}

                  {rowActions && <td className="border-b border-slate-100 px-4 py-4 text-center align-middle last:pr-5">{rowActions(row.original)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-white px-3 py-1 font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
            {currentStart}
            <span className="mx-1 text-slate-400">-</span>
            {currentEnd}
            <span className="mx-1 text-slate-400">dari</span>
            <span className="font-semibold text-primary-1">{totalCount}</span>
            <span className="ml-1 text-slate-500">item</span>
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-2">
            <label className="hidden text-sm font-medium text-slate-600 sm:block">Per halaman</label>
            <SelectField
              options={pageOptions}
              value={pageOptions.find((p) => Number(p.value) === perPage)}
              onChange={(e) => onPerPageChange?.(Number(e?.value))}
              isSearchable={false}
              menuPlacement="top"
              styles={customStyleSelect}
              containerClassname="w-[92px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => onPageChange?.(Math.max(1, page - 1))}
              disabled={page <= 1}
              variant="gost"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60"
            >
              <Icon icon="mingcute:left-fill" width={18} />
            </Button>

            {(() => {
              const pages: (number | '...')[] = [];
              const totalPages = pageCount;

              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                pages.push(1);
                const left = Math.max(2, page - 1);
                const right = Math.min(totalPages - 1, page + 1);

                if (left > 2) pages.push('...');
                for (let i = left; i <= right; i++) pages.push(i);
                if (right < totalPages - 1) pages.push('...');
                pages.push(totalPages);
              }

              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="hidden px-1 text-sm text-slate-400 lg:block">
                    …
                  </span>
                ) : (
                  <Button
                    key={`${p}-${i}`}
                    onClick={() => onPageChange?.(p as number)}
                    variant="gost"
                    className={twMerge(
                      'hidden size-10 items-center justify-center rounded-xl bg-white text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 lg:inline-flex',
                      p === page && 'bg-primary-1 text-white ring-primary-1 hover:bg-primary-3'
                    )}
                  >
                    {p}
                  </Button>
                )
              );
            })()}

            <Button
              onClick={() => onPageChange?.(Math.min(pageCount, page + 1))}
              disabled={page >= pageCount}
              variant="gost"
              className="inline-flex size-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60"
            >
              <Icon icon="mingcute:right-fill" width={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
