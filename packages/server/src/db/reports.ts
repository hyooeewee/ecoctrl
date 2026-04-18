import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ReportPlan } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "../../data/reports.json");

interface ReportsData {
  plans: ReportPlan[];
  templates: string[];
}

function loadData(): ReportsData {
  if (!fs.existsSync(DATA_FILE)) {
    return { plans: [], templates: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as ReportsData;
  } catch {
    return { plans: [], templates: [] };
  }
}

function saveData(data: ReportsData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getReportPlans(): ReportPlan[] {
  return loadData().plans;
}

export function addReportPlan(plan: ReportPlan) {
  const data = loadData();
  data.plans.push(plan);
  saveData(data);
}

export function updateReportPlan(id: string, patch: Partial<ReportPlan>): ReportPlan | null {
  const data = loadData();
  const index = data.plans.findIndex((p) => p.id === id);
  if (index === -1) return null;
  data.plans[index] = { ...data.plans[index], ...patch };
  saveData(data);
  return data.plans[index];
}

export function getReportTemplates(): string[] {
  return loadData().templates;
}
