---
layout: home

hero:
  name: "EcoCtrl"
  text: "能源与 IoT 控制平台"
  tagline: "3D 建筑可视化、实时监控、统一管理控制台 — 全部集成在一个 pnpm 单仓库中。"
  image:
    src: /logo.svg
    alt: EcoCtrl
  actions:
    - theme: brand
      text: 什么是EcoCtrl？
      link: /guide/introduction
    - theme: alt
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub ↗
      link: https://github.com/hyooeewee/ecoctrl
    - theme: alt
      text: 用户手册 📥
      link: /EcoCtrl(易控)用户手册.pdf

features:
  - icon: 🏢
    title: 3D 建筑可视化
    details: 基于 Babylon.js 的交互式场景，从单个 glTF 模型加载，包含热点标签、辉光层和由用户配置驱动的自动旋转相机。
  - icon: 📊
    title: 实时监控
    details: 通过 Fastify REST API 推送实时能耗、故障统计和 IoT 设备告警，配合 Recharts 在管理后台呈现可视化分析。
  - icon: ⚡
    title: 统一管理后台
    details: 基于 React 19 的 Tab 式控制面板，覆盖账号、模型、能源、故障、维护、报告与平台配置 — 由 Drizzle ORM 与 PostgreSQL 提供支撑。
  - icon: 🧱
    title: 现代化 Monorepo
    details: pnpm 工作区，包含共享 schema、源码分发的 UI 组件库、Rolldown 打包的服务端，以及全栈统一的 Voidzero vite-plus 工具链。
  - icon: 🔐
    title: 生产可用的认证
    details: 自动轮转的 JWT + Refresh Token、OAuth 登录、SMTP 邮件验证码、基于角色的权限模型，开箱即用。
  - icon: 🐳
    title: 一键部署
    details: 通过单条 docker compose up 启动整套服务。同时提供离线部署包，适用于无外网环境。
---
