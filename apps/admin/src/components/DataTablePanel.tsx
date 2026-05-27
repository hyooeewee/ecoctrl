import * as React from "react";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@ecoctrl/ui/button";
import { Checkbox } from "@ecoctrl/ui/checkbox";
import { IndeterminateCheckbox } from "@ecoctrl/ui/indeterminate-checkbox";
import { Input } from "@ecoctrl/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@ecoctrl/ui/table";

// ========================================
// Pagination
// ========================================

function getPageNumbers(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

// ========================================
// Selection Column
// ========================================

function createSelectionColumn<TData>(): ColumnDef<TData, any> {
  return {
    id: "select",
    header: ({ table }) => (
      <IndeterminateCheckbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  };
}

// ========================================
// DataTablePanel
// ========================================

export interface DataTablePanelProps<TData = unknown> {
  title: string;
  description: string;
  action?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  data: TData[];
  columns: ColumnDef<TData, any>[];
  getRowId?: (row: TData) => string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  enableRowSelection?: boolean;
  selectedRowIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  batchActions?: React.ReactNode;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  getRowClassName?: (row: TData) => string;
  onRowClick?: (row: TData) => void;
  // Manual pagination (server-side)
  manualPagination?: boolean;
  pageCount?: number;
  rowCount?: number;
  pagination?: { pageIndex: number; pageSize: number };
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
}

export function DataTablePanel<TData>({
  title,
  description,
  action,
  loading = false,
  loadingText = "加载中...",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  data,
  columns,
  getRowId,
  searchValue,
  onSearchChange,
  searchPlaceholder = "搜索...",
  enableRowSelection = false,
  selectedRowIds,
  onSelectionChange,
  batchActions,
  pageSizeOptions = [10, 50, 200],
  onPageSizeChange,
  getRowClassName,
  onRowClick,
  manualPagination = false,
  pageCount,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
}: DataTablePanelProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: 0,
    pageSize: pageSizeOptions[0] ?? 10,
  });

  const effectivePagination = manualPagination
    ? (controlledPagination ?? { pageIndex: 0, pageSize: pageSizeOptions[0] ?? 10 })
    : internalPagination;

  const allColumns = React.useMemo(() => {
    if (enableRowSelection) {
      return [createSelectionColumn<TData>(), ...columns];
    }
    return columns;
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    rowCount: manualPagination ? rowCount : undefined,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(effectivePagination) : updater;
      if (manualPagination) {
        onPaginationChange?.(next);
      } else {
        setInternalPagination(next);
      }
    },
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      setRowSelection(next);
      if (onSelectionChange) {
        onSelectionChange(Object.keys(next).filter((k) => next[k]));
      }
    },
    getRowId,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
      pagination: effectivePagination,
    },
  });

  // Sync external search value
  React.useEffect(() => {
    if (searchValue !== undefined && searchValue !== globalFilter) {
      setGlobalFilter(searchValue);
    }
  }, [searchValue]);

  // Sync external selectedRowIds
  React.useEffect(() => {
    if (selectedRowIds !== undefined) {
      const map: Record<string, boolean> = {};
      for (const id of selectedRowIds) {
        map[id] = true;
      }
      setRowSelection(map);
    }
  }, [selectedRowIds]);

  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const pages = getPageNumbers(currentPage, totalPages);
  const filteredCount = manualPagination
    ? (rowCount ?? data.length)
    : table.getFilteredRowModel().rows.length;
  const pageSize = table.getState().pagination.pageSize;

  const hasSelection = enableRowSelection && Object.keys(rowSelection).some((k) => rowSelection[k]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search - desktop */}
            {onSearchChange && (
              <>
                <div className="relative hidden sm:block">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter}
                    onChange={(e) => {
                      setGlobalFilter(e.target.value);
                      onSearchChange(e.target.value);
                    }}
                    className="h-8 w-56 py-0 pl-9 text-sm"
                  />
                </div>
                {/* Search - mobile toggle */}
                <div className="sm:hidden">
                  {searchExpanded ? (
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={searchPlaceholder}
                        value={globalFilter}
                        onChange={(e) => {
                          setGlobalFilter(e.target.value);
                          onSearchChange(e.target.value);
                        }}
                        className="h-8 w-40 py-0 pl-9 text-sm"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="ml-1 h-8 w-8"
                        onClick={() => setSearchExpanded(false)}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-8 w-8"
                      onClick={() => setSearchExpanded(true)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
            {action}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            {loadingText}
          </div>
        ) : filteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-20">
            {emptyIcon}
            <h3 className="mt-4 text-sm font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            {emptyAction}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={getRowClassName ? getRowClassName(row.original) : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredCount > 0 && (
        <div className="shrink-0 px-6 py-3 flex items-center justify-between gap-4">
          {/* Left: batch actions + total */}
          <div className="flex items-center gap-3 min-w-0">
            {batchActions && (
              <div className={hasSelection ? "" : "pointer-events-none opacity-50"}>
                {batchActions}
              </div>
            )}
            <span className="text-sm text-muted-foreground">共 {filteredCount} 条</span>
          </div>

          {/* Right: page size + pagination */}
          <div className="flex items-center gap-3">
            {pageSizeOptions.length > 0 && (
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  const size = Number(v);
                  table.setPageSize(size);
                  onPageSizeChange?.(size);
                }}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((opt) => (
                    <SelectItem key={opt} value={String(opt)}>
                      每页 {opt} 条
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pages.map((page, i) =>
                  page === "ellipsis" ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted-foreground">
                      ...
                    </span>
                  ) : (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="icon-sm"
                      className="h-8 w-8 text-xs"
                      onClick={() => table.setPageIndex(page - 1)}
                    >
                      {page}
                    </Button>
                  ),
                )}
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
