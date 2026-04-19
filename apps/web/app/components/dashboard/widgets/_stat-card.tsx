import { IconActivity, IconBolt, IconCoin, IconLeaf, IconSun, IconWind } from "@tabler/icons-react";

import {
  GraphButtonBlock,
  GraphButtonBlockDetail,
} from "~/components/dashboard/graph-button-block";
import { ExpandableModal } from "~/components/expandable-modal";
import type { DashboardData } from "~/lib/dashboard-api";
import { useLocale } from "~/locales";

const ICON_MAP: Record<string, React.ReactNode> = {
  totalEnergy: <IconBolt size={12} />,
  carbonEmission: <IconLeaf size={12} />,
  energyIntensity: <IconActivity size={12} />,
  todayCost: <IconCoin size={12} />,
  renewableRate: <IconSun size={12} />,
  loadStatus: <IconWind size={12} />,
};

function getIcon(titleKey: string): React.ReactNode {
  return ICON_MAP[titleKey] ?? <IconActivity size={12} />;
}

export function StatCardWidget({
  data,
  titleKey,
}: {
  data: DashboardData | null;
  titleKey: string;
}) {
  const t = useLocale();
  const card = data?.cards.find((c) => c.titleKey === titleKey);
  const title = t.cards[titleKey as keyof typeof t.cards] ?? titleKey;
  const icon = getIcon(titleKey);

  if (!card) {
    return (
      <div className="flex h-full flex-col gap-1.5 overflow-hidden rounded-xl px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="flex size-[14px] shrink-0 items-center justify-center text-foreground">
            {icon}
          </span>
          <span className="text-muted-foreground truncate text-[10px] font-medium tracking-wide">
            {title}
          </span>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground text-xs">{t.cards.noData}</span>
        </div>
      </div>
    );
  }

  const props = {
    title: t.cards[card.titleKey as keyof typeof t.cards] ?? card.titleKey,
    icon: getIcon(card.titleKey),
    value: card.value,
    unit: card.unit.startsWith("cost")
      ? (t.cards[card.unit as keyof typeof t.cards] ?? card.unit)
      : card.unit,
    delta: card.delta
      ? card.delta.startsWith("renewable") || card.delta.startsWith("load")
        ? (t.cards[card.delta as keyof typeof t.cards] ?? card.delta)
        : card.delta
      : undefined,
    deltaVariant: card.deltaVariant,
    chartType: card.chartType,
    chartData: card.chartData,
    chartColor: card.chartColor,
    footer: card.footerKey ? t.cards[card.footerKey as keyof typeof t.cards] : undefined,
    progressValue: card.progressValue,
  };

  return (
    <ExpandableModal
      className="flex min-h-0 flex-1 flex-col"
      trigger={<GraphButtonBlock {...props} className="flex-1" />}
    >
      <GraphButtonBlockDetail {...props} />
    </ExpandableModal>
  );
}
