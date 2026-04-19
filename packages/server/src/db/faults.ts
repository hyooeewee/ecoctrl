import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/paths";
import type { Fault, FaultStats } from "@/types/index";

const DATA_FILE = path.join(DATA_DIR, "faults.json");

interface FaultData {
  items: Fault[];
  stats: FaultStats;
}

function loadData(): FaultData {
  if (!fs.existsSync(DATA_FILE)) {
    return { items: [], stats: { totalCount: 0, trend: "0%", mttr: 0, avgResponseTime: "0min" } };
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as FaultData;
  } catch {
    return { items: [], stats: { totalCount: 0, trend: "0%", mttr: 0, avgResponseTime: "0min" } };
  }
}

export function getFaults(): Fault[] {
  return loadData().items;
}

export function getFaultStats(): FaultStats {
  return loadData().stats;
}
