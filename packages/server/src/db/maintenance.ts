import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/paths";
import type { MaintenanceReminderDetail } from "@/types/index";

const DATA_FILE = path.join(DATA_DIR, "maintenance.json");

export function loadData(): MaintenanceReminderDetail[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as MaintenanceReminderDetail[];
  } catch {
    return [];
  }
}

export function saveData(data: MaintenanceReminderDetail[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getReminders(): MaintenanceReminderDetail[] {
  return loadData();
}
