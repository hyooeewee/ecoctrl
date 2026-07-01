import { defineConfig } from "vitepress";
import { tabsMarkdownPlugin } from "vitepress-plugin-tabs";

export default defineConfig({
  title: "EcoCtrl",
  description: "EcoCtrl 能源与 IoT 控制平台文档",
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
        text: "指南",
        link: "/guide/introduction",
        activeMatch: "/guide/",
      },
      {
        text: "参考",
        link: "/reference/architecture",
        activeMatch: "/reference/",
      },
      {
        text: "API 文档",
        link: "/reference/api",
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "简介",
          items: [
            { text: "EcoCtrl 是什么", link: "/guide/introduction" },
            { text: "快速上手", link: "/guide/getting-started" },
            { text: "开发指南", link: "/guide/development" },
            { text: "测试", link: "/guide/testing" },
            { text: "国际化", link: "/guide/i18n" },
            { text: "UI 组件库", link: "/guide/ui-library" },
          ],
        },
        {
          text: "核心概念",
          items: [
            { text: "Monorepo 结构", link: "/guide/monorepo" },
            { text: "常见问题", link: "/guide/faq" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "参考资料",
          items: [
            { text: "架构总览", link: "/reference/architecture" },
            { text: "工作流引擎", link: "/reference/workflows" },
            { text: "队列与 Worker", link: "/reference/queue" },
            { text: "IoT 集成", link: "/reference/iot" },
            { text: "文件上传", link: "/reference/file-upload" },
            { text: "报表系统", link: "/reference/reports" },
            { text: "仪表盘组件", link: "/reference/dashboard-widgets" },
            { text: "3D 模型", link: "/reference/3d-models" },
            { text: "环境变量", link: "/reference/env-vars" },
            {
              text: "数据库 Schema",
              link: "/reference/database-schema",
            },
            { text: "API 路由", link: "/reference/api" },
            { text: "认证机制", link: "/reference/authentication" },
            { text: "部署指南", link: "/reference/deployment" },
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
});
