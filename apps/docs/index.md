---
layout: home

hero:
  name: "EcoCtrl"
  text: "能源与 IoT 控制平台"
  tagline: "3D 建筑可视化 · 实时监控 · 统一管理后台 — 一个 monorepo 全部集成。"
  image:
    src: /logo.svg
    alt: EcoCtrl
  actions:
    - theme: brand
      text: 什么是 EcoCtrl ?
      link: /guide/getting-started/platform-overview
    - theme: alt
      text: 用户手册 📥
      link: /EcoCtrl User Manual.pdf

features:
  - icon: 🏢
    title: 3D 建筑可视化
    details: 基于 Babylon.js 的交互式 3D 场景，支持热点标签、辉光效果和可配置的自动旋转相机。
  - icon: 📊
    title: 实时监控
    details: 通过 SSE 实时推送能耗、故障和 IoT 设备数据，配合 Recharts 可视化分析。
  - icon: ⚡
    title: 统一管理后台
    details: React 19 Tab 式控制面板，覆盖用户、模型、能源、故障、维保、报表与平台配置。
  - icon: 🧱
    title: 现代化 Monorepo
    details: pnpm 工作区，包含源码分发的 UI 组件库、Rolldown 打包的服务端、统一工具链。
  - icon: 🔐
    title: 生产级认证
    details: 自动轮转 JWT + Refresh Token、OAuth 登录、SMTP 邮件验证码、基于角色的权限模型。
  - icon: 🐳
    title: 一键部署
    details: 一条 docker compose up 启动整套服务，支持离线部署包与无外网环境。
---
