import { User, Alert, MaintenanceReminder, ReportPlan, Fault } from "../types";

export const USERS: User[] = [
  { id: "1", name: "张三", role: "超级管理员", status: "active", lastLogin: "2024-03-20 10:00" },
  { id: "2", name: "李四", role: "运维工程师", status: "active", lastLogin: "2024-03-20 09:30" },
  { id: "3", name: "王五", role: "财务分析师", status: "inactive", lastLogin: "2024-03-19 16:45" },
  { id: "4", name: "赵六", role: "系统管理员", status: "active", lastLogin: "2024-03-20 08:00" },
  { id: "5", name: "孙七", role: "观察员", status: "active", lastLogin: "2024-03-15 11:20" },
];

export const ALERTS: Alert[] = [
  {
    id: "1",
    device: "中央空调 A1",
    level: "high",
    message: "能耗异常波动 (超出阈值 20%)",
    time: "10:15:22",
    status: "pending",
  },
  {
    id: "2",
    device: "配电柜 B3",
    level: "medium",
    message: "电压不稳定告警",
    time: "09:45:10",
    status: "pending",
  },
  {
    id: "3",
    device: "水泵 C1",
    level: "low",
    message: "例行维保提醒",
    time: "08:00:00",
    status: "resolved",
  },
  {
    id: "4",
    device: "电梯 #4",
    level: "high",
    message: "传感器故障",
    time: "11:20:05",
    status: "pending",
  },
  {
    id: "5",
    device: "照明控制系统",
    level: "medium",
    message: "通讯中断",
    time: "10:55:30",
    status: "pending",
  },
];

export const REMINDERS: MaintenanceReminder[] = [
  { id: "1", task: "发电机组季度维保", dueDate: "2024-03-25", priority: "high" },
  { id: "2", task: "冷水机组滤网更换", dueDate: "2024-03-22", priority: "medium" },
  { id: "3", task: "楼宇控制系统备份", dueDate: "2024-03-28", priority: "low" },
];

export const REPORT_PLANS: ReportPlan[] = [
  {
    id: "1",
    name: "周度能耗报表",
    receiver: "admin@energy.com",
    frequency: "每周一",
    status: true,
  },
  {
    id: "2",
    name: "碳排放统计报表",
    receiver: "sustainability@energy.com",
    frequency: "每月 1 日",
    status: true,
  },
  {
    id: "3",
    name: "设备故障率分析",
    receiver: "maintenance@energy.com",
    frequency: "每月末",
    status: false,
  },
];

export const FAULTS: Fault[] = [
  { id: "1", device: "冷水主机 #1", level: "严重", time: "2024-03-20 10:15", status: "待处理" },
  { id: "2", device: "风机 #4", level: "一般", time: "2024-03-20 09:45", status: "维保中" },
  { id: "3", device: "电表 M-42", level: "提示", time: "2024-03-20 08:30", status: "已修复" },
];

export const ENERGY_CHART_DATA = [
  { name: "Mon", value: 400 },
  { name: "Tue", value: 300 },
  { name: "Wed", value: 500 },
  { name: "Thu", value: 280 },
  { name: "Fri", value: 590 },
  { name: "Sat", value: 320 },
  { name: "Sun", value: 250 },
];
