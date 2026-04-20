import * as LucideIcons from "lucide-react";

interface DynamicIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function DynamicIcon({ name, size = 14, className }: DynamicIconProps) {
  const Icon = (
    LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>
  )[name];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}
