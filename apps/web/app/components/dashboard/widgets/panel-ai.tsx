import { IconActivity, IconAi, IconBulb, IconWind } from "@tabler/icons-react";

import { useLocale } from "~/locales";

import type { DashboardData } from "~/lib/dashboard-api";
import type { DashboardWidget } from "./types";

function SectionHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-cyber-cyan">{icon}</span>}
        <h3 className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
          {title}
        </h3>
      </div>
    </div>
  );
}

interface SuggestionItemProps {
  icon: React.ReactNode;
  text: string;
  saving?: string;
}

function SuggestionItem({ icon, text, saving }: SuggestionItemProps) {
  return (
    <div className="border-cyber-cyan/15 bg-cyber-cyan/5 flex items-start gap-2 rounded-lg border px-2.5 py-2">
      <span className="text-cyber-cyan mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground/80 text-[11px] leading-snug">{text}</p>
        {saving && <p className="text-cyber-green mt-0.5 text-[9px] font-semibold">↓ {saving}</p>}
      </div>
    </div>
  );
}

type AiCategory = NonNullable<DashboardData["aiSuggestions"]>[number]["category"];

function getAiIcon(category: AiCategory) {
  switch (category) {
    case "hvac":
      return <IconWind size={12} />;
    case "lighting":
      return <IconBulb size={12} />;
    case "server":
      return <IconActivity size={12} />;
  }
}

export function AiWidget({ data }: { data: DashboardData | null }) {
  const t = useLocale();
  const suggestions = data?.aiSuggestions ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 px-3 pt-3">
        <SectionHeader title={t.ai.title} icon={<IconAi size={14} />} />
      </div>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-3">
        <div className="flex flex-col gap-1.5">
          {suggestions.map((item, index) => (
            <SuggestionItem
              key={`${item.category}-${index}`}
              icon={getAiIcon(item.category)}
              text={item.text}
              saving={item.saving}
            />
          ))}
          {suggestions.length === 0 && (
            <div className="text-muted-foreground flex flex-1 items-center justify-center text-[11px]">
              {t.charts.noData}
            </div>
          )}
        </div>

        {/* AI globe decoration */}
        <div className="flex justify-center pt-2">
          <div className="relative flex size-14 items-center justify-center">
            <div className="border-cyber-cyan/20 absolute size-14 animate-ping rounded-full border" />
            <div className="border-cyber-cyan/30 absolute size-10 animate-pulse rounded-full border" />
            <div className="border-cyber-cyan/50 bg-cyber-cyan/10 relative flex size-9 items-center justify-center rounded-full border">
              <IconAi size={16} className="text-cyber-cyan" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const aiWidget: DashboardWidget = {
  id: "panel-ai",
  title: (t) => t.bentoWidgets["panel-ai"],
  defaultLayout: { x: 14, y: 6, w: 3, h: 2 },
  component: AiWidget,
};
