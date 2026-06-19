import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { LightingGroup } from "@ecoctrl/shared";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ecoctrl/ui/select";
import { Switch } from "@ecoctrl/ui/switch";

import {
  batchUpdateLightingGroups,
  fetchLightingGroups,
  updateLightingGroup,
} from "~/lib/lighting-api";
import { cn } from "~/lib/utils";
import { useLocale } from "~/locales";

// ========================================
// Label key → region mapping
// Config side generates region/group data; this maps 3D labels to regions.
// ========================================

const LABEL_TO_REGION: Record<string, string> = {
  label_1: "南序厅",
  label_2: "西序厅",
  label_3: "东序厅",
  label_4: "北序厅",
  label_5: "多功能厅1号",
  label_6: "多功能厅2号",
  lobby: "南序厅",
  office1: "西序厅",
  meeting: "东序厅",
  dataCenter: "北序厅",
  exhibition: "多功能厅1号",
  office2: "多功能厅2号",
};

// ========================================
// Props
// ========================================

interface LightingSheetProps {
  activeLabel: string | null;
  onClose: () => void;
}

// ========================================
// Component
// ========================================

export function LightingSheet({ activeLabel, onClose }: LightingSheetProps) {
  const t = useLocale();
  const [region, setRegion] = useState("");
  const [groups, setGroups] = useState<LightingGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const allRegions = useMemo(() => Array.from(new Set(Object.values(LABEL_TO_REGION))), []);

  // Pick region when a 3D label is selected.
  useEffect(() => {
    if (activeLabel) {
      setRegion(LABEL_TO_REGION[activeLabel] ?? allRegions[0] ?? activeLabel);
    }
  }, [activeLabel, allRegions]);

  // Load groups whenever the selected region changes.
  useEffect(() => {
    if (!region) return;
    let cancelled = false;
    setLoading(true);

    fetchLightingGroups(region)
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.data) {
          setGroups(res.data.groups);
        } else {
          console.error("[LightingSheet] fetch groups failed:", res.error);
          toast.error(t.lighting.error);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[LightingSheet] fetch groups error:", err);
        toast.error(t.lighting.error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [region, t.lighting.error]);

  const handleToggle = async (key: string, opened: boolean) => {
    const snapshot = groups.map((g) => ({ ...g }));
    setGroups((prev) => prev.map((g) => (g.key === key ? { ...g, opened } : g)));

    const res = await updateLightingGroup(region, key, opened);
    if (!res.ok) {
      console.error("[LightingSheet] update group failed:", res.error);
      toast.error(t.lighting.error);
      setGroups(snapshot);
      return;
    }
    if (res.data) {
      setGroups((prev) => prev.map((g) => (g.key === key ? res.data!.group : g)));
    }
  };

  const handleBatch = async (opened: boolean) => {
    const snapshot = groups.map((g) => ({ ...g }));
    setGroups((prev) => prev.map((g) => ({ ...g, opened })));

    const res = await batchUpdateLightingGroups(region, opened);
    if (!res.ok) {
      console.error("[LightingSheet] batch update failed:", res.error);
      toast.error(t.lighting.error);
      setGroups(snapshot);
      return;
    }
    if (res.data) {
      setGroups(res.data.groups);
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
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t.lighting.selectRegion} />
            </SelectTrigger>
            <SelectContent className="dark">
              {allRegions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
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
                key={group.key}
                className="flex items-center justify-between gap-3 border-b border-white/5 px-2 py-3 last:border-b-0"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      group.opened ? "bg-cyber-cyan" : "border border-cyber-cyan/40 bg-transparent",
                    )}
                  />
                  <span className="truncate text-xs font-medium text-foreground">
                    {`${group.key}_${group.label}`}
                  </span>
                </div>
                <Switch
                  checked={group.opened}
                  onCheckedChange={(opened) => handleToggle(group.key, opened)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}

        {/* Batch actions */}
        <div className="border-t border-white/10 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleBatch(true)}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-white/10"
            >
              {t.lighting.allOn}
            </button>
            <button
              type="button"
              onClick={() => handleBatch(false)}
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
