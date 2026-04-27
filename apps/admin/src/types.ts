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

export interface PointProp {
  key: string;
  name: string;
  unit?: string;
}

export interface PointItem {
  id: string;
  name: string;
  props: PointProp[];
}

export interface ObjectPoint {
  id: string;
  pointId: string;
  pointName: string;
  values: Record<string, string>;
}

export interface BusinessObject {
  id: string;
  name: string;
  modelId: string;
  modelName: string;
  points: ObjectPoint[];
}
