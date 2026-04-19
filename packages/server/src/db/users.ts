import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/paths";
import type { User } from "@/types/index";

const DATA_FILE = path.join(DATA_DIR, "users.json");

function loadData(): User[] {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as User[];
  } catch {
    return [];
  }
}

function saveData(data: User[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getUsers(): User[] {
  return loadData();
}

export function addUser(user: User) {
  const users = loadData();
  users.push(user);
  saveData(users);
}

export function removeUser(id: string): boolean {
  const users = loadData();
  const index = users.findIndex((u) => u.id === id);
  if (index === -1) return false;
  users.splice(index, 1);
  saveData(users);
  return true;
}
