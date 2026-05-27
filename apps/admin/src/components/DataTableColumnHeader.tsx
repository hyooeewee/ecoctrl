import * as React from "react";

import { ArrowUpDown, ListFilter } from "lucide-react";

import { Button } from "@ecoctrl/ui/button";
import { Input } from "@ecoctrl/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@ecoctrl/ui/popover";

// ========================================
// DataTableColumnHeader
// ========================================

interface DataTableColumnHeaderProps<TData> {
  column: any;
  title: string;
  enableFiltering?: boolean;
  filterPlaceholder?: string;
}

export function DataTableColumnHeader<TData>({
  column,
  title,
  enableFiltering = false,
  filterPlaceholder = "筛选...",
}: DataTableColumnHeaderProps<TData>) {
  const filterValue = (column.getFilterValue() as string) ?? "";

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 justify-start font-medium"
      >
        {title}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      {enableFiltering && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className={`h-8 w-8 ${filterValue ? "text-primary" : "text-muted-foreground"}`}
              >
                <ListFilter size={14} />
              </Button>
            }
          />
          <PopoverContent className="w-48 p-2" align="start" side="bottom">
            <Input
              placeholder={filterPlaceholder}
              value={filterValue}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="h-8 text-xs"
            />
            {filterValue && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-7 w-full text-xs text-muted-foreground"
                onClick={() => column.setFilterValue(undefined)}
              >
                清除筛选
              </Button>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
