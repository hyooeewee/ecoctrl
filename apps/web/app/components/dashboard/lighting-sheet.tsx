import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { DashboardModelLabel } from "@ecoctrl/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";

import { LightBulb } from "./light-bulb";
import {
  batchToggleLightingGroups,
  fetchLightingStatus,
  toggleLightingGroup,
} from "~/lib/lighting-api";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";
import { useLightingStore, type LightingGroupState } from "~/store/lighting";

// ========================================
// Props
// ========================================

interface LightingSheetProps {
  activeLabel: string;
  labels: DashboardModelLabel[];
  onClose: () => void;
}

// ========================================
// Component
// ========================================

export function LightingSheet({ activeLabel, labels, onClose }: LightingSheetProps) {
  const t = useLocale();
  const [selectedId, setSelectedId] = useState(activeLabel);
  const [loading, setLoading] = useState(false);

  const entries = useLightingStore((s) => s.entries);
  const setStatus = useLightingStore((s) => s.setStatus);

  // Labels that have groups
  const labelsWithGroups = useMemo(
    () => labels.filter((l) => l.groups && l.groups.length > 0),
    [labels],
  );

  const selectedLabel = labels.find((l) => l.meta.name === selectedId);
  const labelId = selectedLabel?.meta.id ?? "";
  const groups: LightingGroupState[] = entries[labelId] ?? [];

  // Sync selection when activeLabel changes
  useEffect(() => {
    const match = labels.find((l) => l.meta.id === activeLabel);
    setSelectedId(match?.meta.name ?? activeLabel);
  }, [activeLabel, labels]);

  // Fetch status when label selection changes
  useEffect(() => {
    if (!labelId) return;

    let cancelled = false;
    setLoading(true);

    fetchLightingStatus(labelId)
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setStatus(labelId, res.data.groups);
        } else {
          console.error("[LightingSheet] fetch status failed:", res.error);
        }
      })
      .catch((err) => {
        console.error("[LightingSheet] fetch status error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [labelId, setStatus]);

  const handleToggle = async (group: LightingGroupState) => {
    const newStatus = group.status === "on" ? "off" : "on";

    // Optimistic update
    useLightingStore.getState().updateGroup(labelId, group.id, newStatus);

    const res = await toggleLightingGroup(labelId, group.id, newStatus);
    if (!res.ok) {
      console.error("[LightingSheet] toggle failed:", res.error);
      if (res.error === "HTTP 401") {
        toast.warning(t.lighting.authRequired);
      } else {
        toast.error(t.lighting.error);
      }
      // Revert on error — re-fetch from server
      fetchLightingStatus(labelId).then((r) => {
        if (r.ok && r.data) setStatus(labelId, r.data.groups);
      });
      return;
    }

    // SSE will also broadcast, but update immediately for responsiveness
    if (res.data) {
      useLightingStore.getState().updateGroup(labelId, res.data.id, res.data.status);
    }
  };

  const handleBatch = async (status: "off" | "on") => {
    // Optimistic update
    const current = useLightingStore.getState().entries[labelId] ?? [];
    for (const g of current) {
      useLightingStore.getState().updateGroup(labelId, g.id, status);
    }

    const res = await batchToggleLightingGroups(labelId, status);
    if (!res.ok) {
      console.error("[LightingSheet] batch failed:", res.error);
      if (res.error === "HTTP 401") {
        toast.warning(t.lighting.authRequired);
      } else {
        toast.error(t.lighting.error);
      }
      // Revert
      fetchLightingStatus(labelId).then((r) => {
        if (r.ok && r.data) setStatus(labelId, r.data.groups);
      });
      return;
    }

    if (res.data) {
      setStatus(labelId, res.data.groups);
    }
  };

  return (
    <div className="dark text-foreground absolute top-0 bottom-0 left-0 z-30 flex w-[320px] flex-col border-r border-white/10 bg-black/80 backdrop-blur-md pointer-events-auto">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">{t.lighting.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-foreground/60 hover:text-foreground flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.lighting.selectRegion} />
            </SelectTrigger>
            <SelectContent className="dark">
              {labelsWithGroups.map((l) => (
                <SelectItem key={l.meta.id} value={l.meta.name}>
                  {l.meta.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Group list */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {loading && groups.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center text-xs">
            {t.common.loading}
          </div>
        ) : groups.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center px-4 text-center text-xs">
            {t.lighting.empty}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between gap-3 border-b border-white/5 px-2 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full transition-colors duration-300",
                      group.status === "on"
                        ? "bg-cyber-cyan"
                        : group.status === "half"
                          ? "bg-yellow-500"
                          : "border border-cyber-cyan/40 bg-transparent",
                    )}
                  />
                  <span className="truncate text-xs font-medium text-foreground">{group.name}</span>
                </div>
                <LightBulb status={group.status} onClick={() => handleToggle(group)} />
              </div>
            ))}
          </div>
        )}

        {/* Batch actions */}
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleBatch("on")}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
            >
              {t.lighting.allOn}
            </button>
            <button
              type="button"
              onClick={() => handleBatch("off")}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
            >
              {t.lighting.allOff}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
