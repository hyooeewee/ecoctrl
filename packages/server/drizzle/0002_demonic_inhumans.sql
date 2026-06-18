-- Data migration: copy old title_key values into metric_key using the new
-- unified kebab-case convention, then drop the redundant title_key column.
UPDATE "dashboard_widgets" SET "metric_key" = CASE
  WHEN "title_key" = 'totalEnergy' THEN 'energy-total'
  WHEN "title_key" = 'todayCost' THEN 'energy-cost'
  WHEN "title_key" = 'carbonEmission' THEN 'carbon-emission'
  WHEN "title_key" = 'energyIntensity' THEN 'energy-intensity'
  WHEN "title_key" = 'loadStatus' THEN 'load-status'
  WHEN "title_key" = 'renewableRate' THEN 'renewable-rate'
  WHEN "title_key" = 'weather' THEN 'weather'
  WHEN "title_key" = 'charts.trendTitle' THEN 'energy-chart'
  WHEN "title_key" = 'charts.breakdownTitle' THEN 'energy-breakdown'
  WHEN "title_key" = 'alerts.title' THEN 'alerts-list'
  WHEN "title_key" = 'devices.title' THEN 'devices-status'
  WHEN "title_key" = 'ai.title' THEN 'ai-suggestions'
  ELSE "title_key"
END;
--> statement-breakpoint
ALTER TABLE "dashboard_widgets" DROP COLUMN "title_key";--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ALTER COLUMN "metric_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_metric_key_unique" UNIQUE("metric_key");