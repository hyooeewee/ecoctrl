---
layout: home

hero:
  name: "EcoCtrl"
  text: "Energy & IoT Control Platform"
  tagline: "3D building visualization, real-time monitoring, and a unified management dashboard — all in one pnpm monorepo."
  image:
    src: /logo.svg
    alt: EcoCtrl
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Architecture
      link: /reference/architecture
    - theme: alt
      text: GitHub
      link: https://github.com/hyooeewee/ecoctrl

features:
  - icon: 🏢
    title: 3D Building Visualization
    details: Interactive Babylon.js scene loaded from a single glTF model, with hotspot labels, glow layers and an auto-rotating camera driven entirely by user settings.
  - icon: 📊
    title: Real-time Monitoring
    details: Live energy usage, fault stats and IoT device alerts streamed through a Fastify REST API, with Recharts visualizations on the admin dashboard.
  - icon: ⚡
    title: Unified Admin Dashboard
    details: Tab-based React 19 control panel for accounts, models, energy, faults, maintenance, reports and platform configuration — backed by Drizzle ORM and PostgreSQL.
  - icon: 🧱
    title: Modern Monorepo
    details: pnpm workspace with shared schemas, a source-distributed UI library, Rolldown-bundled server and Voidzero vite-plus tooling across all apps.
  - icon: 🔐
    title: Production-ready Auth
    details: Self-rotating JWT + refresh tokens, OAuth login, SMTP email verification and a role-based permission model out of the box.
  - icon: 🐳
    title: One-command Deploy
    details: Ship the full stack with a single docker compose up, or grab a pre-built release zip and run start.sh — your choice.
---
