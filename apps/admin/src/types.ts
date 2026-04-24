export interface NavItem {
  id: string;
  label: string;
  icon: any;
}

export interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  icon: any;
}
