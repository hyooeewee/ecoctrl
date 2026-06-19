import { CronExpressionParser } from "cron-parser";
import type { WorkflowDSL, WorkflowNode } from "./types";

interface ScheduleEntry {
  workflowId: string;
  userId: string;
  nodeId: string;
  cron: string;
  timezone: string;
  timer: NodeJS.Timeout | null;
}

export type ScheduleFireHandler = (entry: {
  workflowId: string;
  userId: string;
  nodeId: string;
}) => Promise<void>;

// Lightweight in-process scheduler for trigger-category schedule nodes.
// Replaces pg-boss minute-level scheduling so second-level cron (e.g. every
// second) can fire reliably.
class ScheduleEngine {
  private entries = new Map<string, ScheduleEntry>();
  private fireHandler: ScheduleFireHandler | null = null;

  private key(workflowId: string, nodeId: string): string {
    return `${workflowId}.${nodeId}`;
  }

  private clear(key: string): void {
    const entry = this.entries.get(key);
    if (entry?.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
  }

  private scheduleNext(entry: ScheduleEntry): void {
    try {
      const interval = CronExpressionParser.parse(entry.cron, {
        tz: entry.timezone,
        strict: false,
      });
      const next = interval.next().toDate();
      const delay = Math.max(0, next.getTime() - Date.now());

      entry.timer = setTimeout(() => {
        void this.fire(entry);
      }, delay);
    } catch {
      // Invalid cron expressions are caught during DSL validation; ignore
      // runtime parse failures to avoid crashing the scheduler loop.
    }
  }

  private async fire(entry: ScheduleEntry): Promise<void> {
    await this.fireHandler?.(entry);
    this.scheduleNext(entry);
  }

  sync(
    fireHandler: ScheduleFireHandler,
    workflows: Array<{
      id: string;
      userId: string;
      dsl: WorkflowDSL;
      scheduleNodes: WorkflowNode[];
    }>,
  ): void {
    this.fireHandler = fireHandler;
    const activeKeys = new Set<string>();

    for (const workflow of workflows) {
      for (const node of workflow.scheduleNodes) {
        const config = node.config as { cron?: string; timezone?: string } | undefined;
        if (!config?.cron) continue;

        const key = this.key(workflow.id, node.id);
        activeKeys.add(key);

        const existing = this.entries.get(key);
        if (
          existing &&
          existing.cron === config.cron &&
          existing.timezone === (config.timezone ?? "Asia/Shanghai")
        ) {
          // No change; keep the existing timer.
          continue;
        }

        this.clear(key);
        const entry: ScheduleEntry = {
          workflowId: workflow.id,
          userId: workflow.userId,
          nodeId: node.id,
          cron: config.cron,
          timezone: config.timezone ?? "Asia/Shanghai",
          timer: null,
        };
        this.entries.set(key, entry);
        this.scheduleNext(entry);
      }
    }

    // Cancel timers for schedules that are no longer active.
    for (const [key] of this.entries) {
      if (!activeKeys.has(key)) {
        this.clear(key);
        this.entries.delete(key);
      }
    }
  }

  stop(): void {
    for (const key of this.entries.keys()) {
      this.clear(key);
    }
    this.entries.clear();
  }
}

export const scheduleEngine = new ScheduleEngine();
