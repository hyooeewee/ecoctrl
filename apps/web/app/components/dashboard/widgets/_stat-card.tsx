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

export function StatCardWidget({ data, titleKey }: { data: DashboardData; titleKey: string }) {
  const t = useLocale();
  const card = data.cards.find((c) => c.titleKey === titleKey);
  if (!card) return null;

  const props = {
    title: t.cards[card.titleKey as keyof typeof t.cards] ?? card.titleKey,
    icon: ICON_MAP[card.titleKey],
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
