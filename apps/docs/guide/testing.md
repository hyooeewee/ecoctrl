# 测试

EcoCtrl monorepo 中的每个包都配备了 [Vitest](https://vitest.dev/) 测试。本页介绍如何运行测试、遵循哪些约定，以及测试基础设施如何连接。

## 运行测试

从 monorepo 根目录：

```bash
pnpm test              # 一次性运行所有包的所有测试
pnpm test:watch        # 所有包的监听模式
pnpm test:coverage     # 生成覆盖率报告
pnpm test:ui           # 打开 Vitest UI
```

运行特定包的测试：

```bash
cd packages/server
pnpm test              # 服务端单元测试

cd apps/admin
pnpm test              # admin 组件测试

cd apps/web
pnpm test              # web 组件测试
```

## 测试配置

只有 `packages/server` 拥有 `vitest.config.ts`（环境：`node`）。前端应用（`apps/admin`、`apps/web`）已安装测试依赖（`@testing-library/react`、`@vitest/coverage-v8`），但尚未配置 Vitest。

### 服务端测试（`packages/server`）

服务端测试套件针对配置的数据库运行（生产环境用 PostgreSQL，CI 中用本地实例）。没有内存回退 — 测试依赖 `DATABASE_URL`：

```ts
import { describe, it, expect } from "vitest";
import { createUser } from "@/repositories/users";

describe("users repository", () => {
  it("creates a user", async () => {
    const user = await createUser({
      username: "test",
      email: "test@example.com",
      password: "hash",
    });
    expect(user).toBeDefined();
    expect(user.username).toBe("test");
  });
});
```

### 前端测试（`apps/admin`、`apps/web`）

测试库（`@testing-library/react`、`@testing-library/jest-dom`）已安装，但尚未配置 Vitest。配置完成后，测试形如：

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@ecoctrl/ui";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });
});
```

## 约定

- **测试文件**：与源码同目录（`*.test.ts` 或 `*.test.tsx`）或放在专用 `__tests__/` 目录中。
- **命名**：`describe` 描述模块，`it` 描述行为。
- **Mock**：优先使用最小 Mock。API 测试应 Mock 仓库层而非数据库。
- **覆盖率**：目前无强制阈值。新服务端功能应包含主路径测试和至少一个错误用例。

## CI 集成

根 `package.json` 未定义测试脚本。直接从服务端包运行测试：

```bash
cd packages/server
pnpm test              # 运行服务端测试
pnpm test:coverage     # 生成覆盖率报告
```

## 为新功能添加测试

1. 先写测试（或与实现同时写）。
2. 如果测试仓库函数，测试放在 `packages/server/src/repositories/__tests__/`。
3. 如果测试 React 组件，测试放在组件文件旁边（等该应用添加 Vitest 配置后）。
4. 从服务端包目录运行 `pnpm test` 验证。
5. 运行 `pnpm test:coverage` 检查覆盖率影响。

## 调试技巧

- 使用 `vitest --reporter=verbose` 获取详细的逐测试输出。
- 使用 `vitest --testNamePattern="creates a user"` 运行单个测试。
- Vitest UI（`pnpm test:ui`）适合可视化检查测试结果和覆盖率地图。
