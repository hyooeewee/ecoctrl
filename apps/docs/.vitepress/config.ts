import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

export default defineConfig({
  title: "EcoCtrl",
  description: "Energy & IoT control platform documentation",
  lastUpdated: true,
  cleanUrls: true,
  ignoreDeadLinks: true,

  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }]],

  markdown: {
    config(md) {
      md.use(tabsMarkdownPlugin);
    },
  },

  sitemap: {
    hostname: "https://ecoctrl.godot.run",
  },

  themeConfig: {
    logo: "/logo.svg",

    socialLinks: [{ icon: "github", link: "https://github.com/hyooeewee/ecoctrl" }],

    search: {
      provider: "local",
      options: {
        locales: {
          zh: {
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
      },
    },
  },

  locales: {
    root: {
      label: "English",
      lang: "en-US",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/guide/introduction", activeMatch: "/guide/" },
          {
            text: "Reference",
            link: "/reference/architecture",
            activeMatch: "/reference/",
          },
          {
            text: "API Docs",
            link: "/reference/api",
          },
        ],

        sidebar: {
          "/guide/": [
            {
              text: "Introduction",
              items: [
                { text: "What is EcoCtrl", link: "/guide/introduction" },
                { text: "Getting Started", link: "/guide/getting-started" },
                { text: "Development", link: "/guide/development" },
                { text: "Testing", link: "/guide/testing" },
                { text: "Internationalization", link: "/guide/i18n" },
                { text: "UI Library", link: "/guide/ui-library" },
              ],
            },
            {
              text: "Concepts",
              items: [
                { text: "Monorepo Structure", link: "/guide/monorepo" },
                { text: "FAQ", link: "/guide/faq" },
              ],
            },
          ],
          "/reference/": [
            {
              text: "Reference",
              items: [
                { text: "Architecture", link: "/reference/architecture" },
                { text: "Workflow Engine", link: "/reference/workflows" },
                { text: "Queue & Worker", link: "/reference/queue" },
                { text: "IoT Integration", link: "/reference/iot" },
                { text: "File Upload", link: "/reference/file-upload" },
                { text: "Reports", link: "/reference/reports" },
                { text: "Dashboard Widgets", link: "/reference/dashboard-widgets" },
                { text: "3D Models", link: "/reference/3d-models" },
                { text: "Environment Variables", link: "/reference/env-vars" },
                { text: "Database Schema", link: "/reference/database-schema" },
                { text: "API Routes", link: "/reference/api" },
                { text: "Authentication", link: "/reference/authentication" },
                { text: "Deployment", link: "/reference/deployment" },
              ],
            },
          ],
        },

        editLink: {
          pattern: "https://github.com/hyooeewee/ecoctrl/edit/main/apps/docs/:path",
          text: "Edit this page on GitHub",
        },

        footer: {
          message: "Released under the MIT License.",
          copyright: "Copyright © 2026 EcoCtrl",
        },

        docFooter: {
          prev: "Previous page",
          next: "Next page",
        },

        outline: { label: "On this page", level: [2, 3] },
        lastUpdated: { text: "Last updated" },
        darkModeSwitchLabel: "Appearance",
        sidebarMenuLabel: "Menu",
        returnToTopLabel: "Return to top",
      },
    },

    zh: {
      label: "简体中文",
      lang: "zh-CN",
      link: "/zh/",
      title: "EcoCtrl",
      description: "EcoCtrl 能源与 IoT 控制平台文档",
      themeConfig: {
        nav: [
          {
            text: "指南",
            link: "/zh/guide/introduction",
            activeMatch: "/zh/guide/",
          },
          {
            text: "参考",
            link: "/zh/reference/architecture",
            activeMatch: "/zh/reference/",
          },
          {
            text: "API 文档",
            link: "/zh/reference/api",
          },
        ],

        sidebar: {
          "/zh/guide/": [
            {
              text: "简介",
              items: [
                { text: "EcoCtrl 是什么", link: "/zh/guide/introduction" },
                { text: "快速上手", link: "/zh/guide/getting-started" },
                { text: "开发指南", link: "/zh/guide/development" },
                { text: "测试", link: "/zh/guide/testing" },
                { text: "国际化", link: "/zh/guide/i18n" },
                { text: "UI 组件库", link: "/zh/guide/ui-library" },
              ],
            },
            {
              text: "核心概念",
              items: [
                { text: "Monorepo 结构", link: "/zh/guide/monorepo" },
                { text: "常见问题", link: "/zh/guide/faq" },
              ],
            },
          ],
          "/zh/reference/": [
            {
              text: "参考资料",
              items: [
                { text: "架构总览", link: "/zh/reference/architecture" },
                { text: "工作流引擎", link: "/zh/reference/workflows" },
                { text: "队列与 Worker", link: "/zh/reference/queue" },
                { text: "IoT 集成", link: "/zh/reference/iot" },
                { text: "文件上传", link: "/zh/reference/file-upload" },
                { text: "报表系统", link: "/zh/reference/reports" },
                { text: "仪表盘组件", link: "/zh/reference/dashboard-widgets" },
                { text: "3D 模型", link: "/zh/reference/3d-models" },
                { text: "环境变量", link: "/zh/reference/env-vars" },
                {
                  text: "数据库 Schema",
                  link: "/zh/reference/database-schema",
                },
                { text: "API 路由", link: "/zh/reference/api" },
                { text: "认证机制", link: "/zh/reference/authentication" },
                { text: "部署指南", link: "/zh/reference/deployment" },
              ],
            },
          ],
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
    },
  },
});
