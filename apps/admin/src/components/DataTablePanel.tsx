import * as React from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@ecoctrl/ui/pagination";

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

interface TablePaginationProps {
  table: {
    getState: () => { pagination: { pageIndex: number; pageSize: number } };
    getPageCount: () => number;
    getCanPreviousPage: () => boolean;
    getCanNextPage: () => boolean;
    previousPage: () => void;
    nextPage: () => void;
    setPageIndex: (index: number) => void;
    getFilteredRowModel: () => { rows: unknown[] };
  };
}

export function TablePagination({ table }: TablePaginationProps) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = table.getPageCount();
  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <Pagination className="mx-0 w-auto">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="上一页"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (table.getCanPreviousPage()) table.previousPage();
            }}
            className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
        {pages.map((page, i) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  table.setPageIndex(page - 1);
                }}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            text="下一页"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              if (table.getCanNextPage()) table.nextPage();
            }}
            className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// ========================================
// DataTablePanel
// ========================================

export interface DataTablePanelProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  loading: boolean;
  loadingText?: string;
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  children: React.ReactNode;
  rowCount: number;
  paginationTable?: TablePaginationProps["table"];
}

export function DataTablePanel({
  title,
  description,
  action,
  loading,
  loadingText = "加载中...",
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  rowCount,
  paginationTable,
}: DataTablePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold leading-none tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            {loadingText}
          </div>
        ) : rowCount === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted py-20">
            {emptyIcon}
            <h3 className="mt-4 text-sm font-semibold text-foreground">{emptyTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
            {emptyAction}
          </div>
        ) : (
          children
        )}
      </div>

      {rowCount > 0 && paginationTable && (
        <div className="shrink-0 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">共 {rowCount} 条</div>
          <TablePagination table={paginationTable} />
        </div>
      )}
    </div>
  );
}
