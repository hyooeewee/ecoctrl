import { Vector3 } from "@babylonjs/core";
import type { DashboardModelLabel } from "@ecoctrl/shared";

// ========================================
// Camera defaults
// ========================================

export const INITIAL_ALPHA = Math.PI / 4;
export const INITIAL_BETA = Math.PI / 2.8;
export const INITIAL_TARGET = new Vector3(0, 2, 0);

// ========================================
// Model fallback
// ========================================

export const FALLBACK_URL = "/building.glb";

// ========================================
// Default area labels (V2 format with operations)
// ========================================

export interface LabelDef {
  key: string;
  name: string;
  fallbackPosition: Vector3;
  meshKeywords: string[];
}

export const DEFAULT_LABELS: LabelDef[] = [
  {
    key: "office1",
    name: "Office Area 1",
    fallbackPosition: new Vector3(-4, 2.5, -3),
    meshKeywords: ["office", "办公"],
  },
  {
    key: "meeting",
    name: "Meeting Room",
    fallbackPosition: new Vector3(0, 3.2, -3),
    meshKeywords: ["meeting", "会议"],
  },
  {
    key: "dataCenter",
    name: "Data Center",
    fallbackPosition: new Vector3(-1.5, 1.5, 0),
    meshKeywords: ["data", "server", "机房", "数据"],
  },
  {
    key: "exhibition",
    name: "Exhibition Hall",
    fallbackPosition: new Vector3(2.5, 2.2, -2),
    meshKeywords: ["exhibition", "hall", "展示", "展厅"],
  },
  {
    key: "office2",
    name: "Office Area 2",
    fallbackPosition: new Vector3(3.5, 2.5, -3),
    meshKeywords: ["office", "办公"],
  },
  {
    key: "lobby",
    name: "Lobby",
    fallbackPosition: new Vector3(3.5, 0.8, 2),
    meshKeywords: ["lobby", "大堂", "大厅", "entrance"],
  },
];

// ========================================
// Default V2 labels with camera operations
// ========================================

export const DEFAULT_V2_LABELS: DashboardModelLabel[] = [
  {
    id: "office1",
    key: "office1",
    name: "Office Area 1",
    position: { x: -4, y: 2.5, z: -3 },
    meshKeywords: ["office", "办公"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: -4, y: 2.5, z: -3 },
          distance: 14,
          fov: 0.8,
          duration: 45,
        },
      },
    ],
    order: 0,
  },
  {
    id: "meeting",
    key: "meeting",
    name: "Meeting Room",
    position: { x: 0, y: 3.2, z: -3 },
    meshKeywords: ["meeting", "会议"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: 0, y: 3.2, z: -3 },
          distance: 14,
          fov: 0.8,
          duration: 45,
        },
      },
    ],
    order: 1,
  },
  {
    id: "dataCenter",
    key: "dataCenter",
    name: "Data Center",
    position: { x: -1.5, y: 1.5, z: 0 },
    meshKeywords: ["data", "server", "机房", "数据"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: -1.5, y: 1.5, z: 0 },
          distance: 12,
          fov: 0.8,
          duration: 45,
        },
      },
    ],
    order: 2,
  },
  {
    id: "exhibition",
    key: "exhibition",
    name: "Exhibition Hall",
    position: { x: 2.5, y: 2.2, z: -2 },
    meshKeywords: ["exhibition", "hall", "展示", "展厅"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: 2.5, y: 2.2, z: -2 },
          distance: 14,
          fov: 0.8,
          duration: 45,
        },
      },
    ],
    order: 3,
  },
  {
    id: "office2",
    key: "office2",
    name: "Office Area 2",
    position: { x: 3.5, y: 2.5, z: -3 },
    meshKeywords: ["office", "办公"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: 3.5, y: 2.5, z: -3 },
          distance: 14,
          fov: 0.8,
          duration: 45,
        },
      },
    ],
    order: 4,
  },
  {
    id: "lobby",
    key: "lobby",
    name: "Lobby",
    position: { x: 3.5, y: 0.8, z: 2 },
    meshKeywords: ["lobby", "大堂", "大厅", "entrance"],
    operations: [
      {
        type: "camera",
        config: {
          target: { x: 3.5, y: 0.8, z: 2 },
          distance: 13,
          fov: 0.8,
          duration: 45,
        },
      },
      {
        type: "clipping",
        config: {
          planeNormal: { x: 0, y: 1, z: 0 },
          planeOffset: 3.5,
          duration: 30,
        },
      },
    ],
    order: 5,
  },
];
