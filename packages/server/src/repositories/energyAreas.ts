import { db } from "@/config/database";
import { energyAreas } from "@/schemas/energyAreas";

export interface EnergyArea {
  id: number;
  title: string;
  current: number;
  target: number;
  color: string;
  powerFactor: number;
  loadRate: string;
}

export async function getEnergyAreas(): Promise<EnergyArea[]> {
  const rows = await db.select().from(energyAreas);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    current: r.current,
    target: r.target,
    color: r.color,
    powerFactor: r.powerFactor,
    loadRate: r.loadRate,
  }));
}

export async function saveEnergyAreas(data: Omit<EnergyArea, "id">[]): Promise<void> {
  await db.delete(energyAreas);
  if (data.length) {
    await db.insert(energyAreas).values(data);
  }
}
