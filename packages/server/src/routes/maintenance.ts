import type { FastifyInstance } from "fastify";
import type { MaintenanceReminder, MaintenanceReminderDetail } from "../types/index.js";

const REMINDERS: MaintenanceReminderDetail[] = [
  {
    id: "1",
    task: "发电机组季度维保",
    description: "对主发电机组进行全面检查，包括机油更换、滤清器清洁、皮带张力检测及运行参数校准，确保备用电源可靠性。",
    dueDate: "2026-04-25",
    priority: "high",
    status: "pending",
    assignee: "张工",
    location: "B1 发电机房",
    estimatedHours: 4,
    lastCompleted: "2025-10-20",
  },
  {
    id: "2",
    task: "冷水机组滤网更换",
    description: "更换中央空调冷水机组进风滤网，清洗冷凝器翅片，检查冷媒压力及压缩机运行电流。",
    dueDate: "2026-04-18",
    priority: "medium",
    status: "in_progress",
    assignee: "李师傅",
    location: "屋顶机房",
    estimatedHours: 2,
    lastCompleted: "2025-12-15",
  },
  {
    id: "3",
    task: "楼宇控制系统备份",
    description: "对 BAS（楼宇自动化系统）数据库进行完整备份，导出控制器程序及点位配置，验证备份文件可恢复性。",
    dueDate: "2026-04-28",
    priority: "low",
    status: "pending",
    assignee: "王工",
    location: "3F 弱电间",
    estimatedHours: 1.5,
    lastCompleted: "2025-11-30",
  },
  {
    id: "4",
    task: "消防水泵月度试运行",
    description: "手动启停主备消防水泵，检查压力表读数、阀门启闭状态、电机温升及控制柜信号反馈。",
    dueDate: "2026-04-20",
    priority: "high",
    status: "pending",
    assignee: "赵工",
    location: "B2 消防泵房",
    estimatedHours: 1,
    lastCompleted: "2026-03-20",
  },
  {
    id: "5",
    task: "电梯限速器校验",
    description: "委托第三方机构对全部客梯限速器进行动作速度测试，出具校验报告并更新电梯台账。",
    dueDate: "2026-05-05",
    priority: "high",
    status: "pending",
    assignee: "维保单位",
    location: "各电梯机房",
    estimatedHours: 6,
    lastCompleted: "2025-04-10",
  },
  {
    id: "6",
    task: "变压器红外测温",
    description: "使用红外热像仪对高低压配电变压器进行非接触式测温，记录各相绕组及接线端子温升数据。",
    dueDate: "2026-04-22",
    priority: "medium",
    status: "completed",
    assignee: "刘工",
    location: "B1 变配电室",
    estimatedHours: 2,
    lastCompleted: "2025-10-22",
  },
  {
    id: "7",
    task: "生活水箱清洗消毒",
    description: "排空生活水箱，进行内壁刷洗、消毒药剂投加及水质检测，确保符合国家生活饮用水卫生标准。",
    dueDate: "2026-05-10",
    priority: "medium",
    status: "pending",
    assignee: "陈师傅",
    location: "屋顶水箱间",
    estimatedHours: 5,
    lastCompleted: "2025-11-10",
  },
  {
    id: "8",
    task: "UPS 蓄电池组检测",
    description: "对不间断电源蓄电池组进行内阻测试、容量放电试验，更换内阻超标或容量衰减超过 30% 的单体电池。",
    dueDate: "2026-05-15",
    priority: "low",
    status: "pending",
    assignee: "周工",
    location: "3F UPS 机房",
    estimatedHours: 3,
    lastCompleted: "2025-05-15",
  },
];

const reminderItemSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    task: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string" },
  },
};

const reminderDetailSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    task: { type: "string" },
    description: { type: "string" },
    dueDate: { type: "string" },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    status: { type: "string", enum: ["pending", "in_progress", "completed", "overdue"] },
    assignee: { type: "string" },
    location: { type: "string" },
    estimatedHours: { type: "number" },
    lastCompleted: { type: "string", nullable: true },
  },
};

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
  },
};

export default async function maintenanceRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/reminders",
    {
      schema: {
        summary: "Get maintenance reminders list",
        response: {
          200: {
            type: "array",
            items: reminderItemSchema,
          },
        },
      },
    },
    async (_request, reply) => {
      const list: MaintenanceReminder[] = REMINDERS.map((r) => ({
        id: r.id,
        task: r.task,
        dueDate: r.dueDate,
        priority: r.priority,
      }));
      return reply.send(list);
    },
  );

  fastify.get(
    "/reminders/:id",
    {
      schema: {
        summary: "Get maintenance reminder detail",
        params: {
          type: "object",
          properties: {
            id: { type: "string", description: "Reminder ID" },
          },
          required: ["id"],
        },
        response: {
          200: reminderDetailSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const reminder = REMINDERS.find((r) => r.id === id);
      if (!reminder) {
        return reply.status(404).send({ error: "Reminder not found" });
      }
      return reply.send(reminder);
    },
  );
}
