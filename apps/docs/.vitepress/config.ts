import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

export const guideSidebar = [
  {
    text: "快速入门",
    items: [
      { text: "平台概述", link: "/guide/getting-started/platform-overview" },
      { text: "登录与账户访问", link: "/guide/getting-started/login-auth" },
      { text: "导航与界面布局", link: "/guide/getting-started/navigation" },
    ],
  },
  {
    text: "仪表盘与可视化",
    items: [
      { text: "Admin 管理总览", link: "/guide/dashboard/admin-overview" },
      { text: "Web 3D 建筑驾驶舱", link: "/guide/dashboard/web-3d" },
      { text: "仪表盘小组件参考", link: "/guide/dashboard/widgets" },
      { text: "编辑仪表盘布局", link: "/guide/dashboard/bento-layout" },
      { text: "3D 区域标签与照明控制", link: "/guide/dashboard/lighting-control" },
    ],
  },
  {
    text: "能源管理",
    items: [
      { text: "分区域能耗总览", link: "/guide/energy/zone-overview" },
      { text: "详细能耗数据", link: "/guide/energy/detailed-data" },
      { text: "能耗统计报表", link: "/guide/energy/stats" },
      { text: "碳排放因子管理", link: "/guide/energy/carbon-factors" },
    ],
  },
  {
    text: "故障与维保管理",
    items: [
      { text: "实时故障监控", link: "/guide/faults/real-time" },
      { text: "故障统计与分析", link: "/guide/faults/analytics" },
      { text: "维保说明书管理", link: "/guide/faults/maintenance" },
    ],
  },
  {
    text: "工作流自动化",
    items: [
      { text: "工作流管理概览", link: "/guide/workflows/overview" },
      { text: "可视化工作流编辑器", link: "/guide/workflows/editor" },
      { text: "配置工作流节点", link: "/guide/workflows/node-config" },
      { text: "执行记录与监控", link: "/guide/workflows/execution-logs" },
    ],
  },
  {
    text: "设备与数据配置",
    items: [
      { text: "数据模型管理", link: "/guide/data/models" },
      { text: "业务对象管理", link: "/guide/data/objects" },
      { text: "点位管理", link: "/guide/data/points" },
      { text: "3D 模型编辑器", link: "/guide/data/model-editor" },
    ],
  },
  {
    text: "报表管理",
    items: [
      { text: "定时报表计划", link: "/guide/reports/schedules" },
      { text: "数据导出", link: "/guide/reports/export" },
    ],
  },
  {
    text: "账户与个性化",
    items: [
      { text: "用户账户管理", link: "/guide/account/users" },
      { text: "个人信息与安全", link: "/guide/account/profile" },
      { text: "偏好设置", link: "/guide/account/preferences" },
      { text: "系统全局配置", link: "/guide/account/system-config" },
    ],
  },
  {
    text: "高级功能",
    items: [
      { text: "第三方系统集成", link: "/guide/advanced/web-talk" },
      { text: "AI 智能助手", link: "/guide/advanced/ai-assistant" },
    ],
  },
];

export const referenceSidebar = [
  {
    text: "系统架构",
    items: [
      { text: "整体架构概览", link: "/reference/architecture/overview" },
      { text: "Admin 前端架构", link: "/reference/architecture/admin-arch" },
      { text: "Web 前端架构", link: "/reference/architecture/web-arch" },
      { text: "共享包体系", link: "/reference/architecture/shared-packages" },
    ],
  },
  {
    text: "子系统设计",
    items: [
      { text: "工作流引擎", link: "/reference/subsystems/workflow-engine" },
      { text: "物联网 (IoT) 集成", link: "/reference/subsystems/iot" },
      { text: "3D 模型管线", link: "/reference/subsystems/3d-pipeline" },
      { text: "实时通信 (SSE)", link: "/reference/subsystems/sse" },
      { text: "AI 与智能助手", link: "/reference/subsystems/ai-pet" },
      { text: "任务队列系统", link: "/reference/subsystems/queue" },
      { text: "WebTalk 反向代理", link: "/reference/subsystems/webtalk" },
      { text: "碳排放因子系统", link: "/reference/subsystems/carbon" },
      { text: "照明控制系统", link: "/reference/subsystems/lighting" },
    ],
  },
  {
    text: "API 参考",
    items: [
      { text: "认证与用户 API", link: "/reference/api/auth-user" },
      { text: "数据模型与对象 API", link: "/reference/api/data-model" },
      { text: "能源与碳排放 API", link: "/reference/api/energy-carbon" },
      { text: "工作流与执行 API", link: "/reference/api/workflow-exec" },
      { text: "IoT 与实时事件 API", link: "/reference/api/iot-events" },
      { text: "报表与导出 API", link: "/reference/api/reports-export" },
      { text: "照明控制 API", link: "/reference/api/lighting" },
      { text: "WebTalk 代理 API", link: "/reference/api/webtalk" },
    ],
  },
  {
    text: "数据模型",
    items: [
      { text: "核心实体参考", link: "/reference/data-model/entities" },
      { text: "实体关系图 (ERD)", link: "/reference/data-model/erd" },
    ],
  },
];

export const deploymentSidebar = [
  {
    text: "部署运维",
    items: [
      { text: "系统要求与前提条件", link: "/deployment/requirements" },
      { text: "Docker 部署指南", link: "/deployment/docker" },
      { text: "环境变量参考", link: "/deployment/env-vars" },
      { text: "SMTP 邮件服务配置", link: "/deployment/smtp" },
      { text: "数据库备份与恢复", link: "/deployment/backup" },
      { text: "监控与日志", link: "/deployment/monitoring" },
      { text: "性能调优", link: "/deployment/tuning" },
      { text: "安全加固", link: "/deployment/security" },
      { text: "版本升级指南", link: "/deployment/upgrade" },
      { text: "常见问题排查", link: "/deployment/faq" },
    ],
  },
];

export default defineConfig({
  title: "EcoCtrl",
  description: "EcoCtrl 能源与 IoT 控制平台 — 用户手册与技术参考",
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: false,

  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }]],

  markdown: {
    languageAlias: {
      caddyfile: "nginx",
      env: "ini",
    },
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  sitemap: {
    hostname: "https://docs.godot.qzz.io",
  },

  themeConfig: {
    logo: "/logo.svg",

    socialLinks: [{ icon: "github", link: "https://github.com/hyooeewee/ecoctrl" }],

    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "搜索文档",
            buttonAriaLabel: "搜索文档",
          },
          modal: {
            noResultsText: "无法找到相关结果",
            resetButtonTitle: "清除查询条件",
            footer: {
              selectText: "选择",
              navigateText: "切换",
              closeText: "关闭",
            },
          },
        },
      },
    },

    nav: [
      {
        text: "用户指南",
        link: "/guide/getting-started/platform-overview",
        activeMatch: "/guide/",
      },
      {
        text: "技术参考",
        link: "/reference/architecture/overview",
        activeMatch: "/reference/",
      },
      {
        text: "部署运维",
        link: "/deployment/requirements",
        activeMatch: "/deployment/",
      },
    ],

    sidebar: {
      "/guide/": guideSidebar,
      "/reference/": referenceSidebar,
      "/deployment/": deploymentSidebar,
    },

    editLink: {
      pattern: "https://github.com/hyooeewee/ecoctrl/edit/main/apps/docs/:path",
      text: "在 GitHub 上编辑此页",
    },

    footer: {
      message: "基于 MIT 协议发布",
      copyright: "Copyright © 2026 EcoCtrl",
    },

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: { label: "页面导航", level: [2, 3] },
    lastUpdated: { text: "最后更新" },
    darkModeSwitchLabel: "外观",
    sidebarMenuLabel: "菜单",
    returnToTopLabel: "返回顶部",
  },
});
