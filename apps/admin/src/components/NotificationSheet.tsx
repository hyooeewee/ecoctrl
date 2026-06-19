import React, { useEffect, useMemo, useState } from "react";
import { Bell, MailOpen } from "lucide-react";

import { Button } from "@ecoctrl/ui/button";
import { Checkbox } from "@ecoctrl/ui/checkbox";
import { ScrollArea } from "@ecoctrl/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@ecoctrl/ui/sheet";
import { cn } from "@/lib/utils";
import { notificationsApi, type Notification } from "@/api/notifications";
import { toast } from "sonner";

// ========================================
// Props
// ========================================

interface NotificationSheetProps {
  trigger: React.ReactElement;
  onCountChange?: (count: number) => void;
}

// ========================================
// Component
// ========================================

export function NotificationSheet({ trigger, onCountChange }: NotificationSheetProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  useEffect(() => {
    onCountChange?.(unreadCount);
  }, [unreadCount, onCountChange]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.list();
      setItems(data);
    } catch (err) {
      console.error("[NotificationSheet] failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((n) => n.id)));
    }
  };

  const handleMarkRead = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await notificationsApi.markReadBatch(ids);
      setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
      setSelectedIds(new Set());
      toast.success(`已标记 ${ids.length} 条通知为已读`);
    } catch (err) {
      console.error("[NotificationSheet] failed to mark notifications read:", err);
      toast.error("标记已读失败，请重试");
    }
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent className="flex w-full flex-col sm:max-w-md p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Bell size={18} />
              通知中心
            </SheetTitle>
            <span className="text-muted-foreground text-xs">{unreadCount} 条未读</span>
          </div>
        </SheetHeader>

        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={toggleAll}
              aria-label="全选"
            />
            <span className="text-xs text-muted-foreground">已选择 {selectedIds.size} 条</span>
          </div>
          {selectedIds.size > 0 && (
            <Button size="sm" variant="outline" onClick={handleMarkRead}>
              <MailOpen size={14} className="mr-1" />
              标记已读
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="divide-y">
            {loading && items.length === 0 && (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">加载中...</div>
            )}

            {!loading && items.length === 0 && (
              <div className="text-muted-foreground px-4 py-8 text-center text-sm">暂无通知</div>
            )}

            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                  !item.read && "bg-primary/5",
                )}
              >
                <div className="pt-0.5">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelection(item.id)}
                    aria-label={`选择通知 ${item.title}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm truncate",
                      !item.read ? "font-medium" : "text-muted-foreground",
                    )}
                  >
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="text-muted-foreground text-xs line-clamp-2 mt-0.5">
                      {item.message}
                    </p>
                  )}
                  <p className="text-muted-foreground text-[10px] mt-1">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : "-"}
                  </p>
                </div>
                {!item.read && (
                  <span className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
