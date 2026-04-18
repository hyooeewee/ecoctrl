import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MaintenanceReminderDetail } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/maintenance.json");

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
