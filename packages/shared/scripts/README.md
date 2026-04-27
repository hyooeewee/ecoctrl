# gen-env-example.mjs

从 `.env.local` 生成 `.env.example`,支持行级注解控制输出行为。

## 注解约定

在 `.env.local` 的任意行尾添加以下注释来控制生成行为:

- `# @secret` → 值清空(适合 API key、密码等敏感字段)
- `# @example: VALUE` → 用 VALUE 替换原值(适合需要说明格式/默认值的非敏感字段)
- 无标注 → 保留原值及所有 dotenv 注释

### 示例

```env
# 公开默认值 — 保留
API_BASE_URL=http://localhost:3000

# 路径前缀 — 保留
API_PREFIX=/api

# 数据库密码 — 清空
DATABASE_PASSWORD=topsecret # @secret

# JWT 密钥 — 清空
JWT_SECRET=shhh # @secret

# 第三方 token — 用占位符替换
THIRD_PARTY_TOKEN=real-token-123 # @example: your-token-here
```

生成后:

```env
# 公开默认值 — 保留
API_BASE_URL=http://localhost:3000

# 路径前缀 — 保留
API_PREFIX=/api

# 数据库密码 — 清空
DATABASE_PASSWORD=

# JWT 密钥 — 清空
JWT_SECRET=

# 第三方 token — 用占位符替换
THIRD_PARTY_TOKEN=your-token-here
```

## CLI 用法

```bash
node gen-env-example.mjs [--src <file>] [--dest <file>] [--check] [-h|--help]
```

| Flag | 说明 |
|---|---|
| `--src <file>` | 源文件路径,默认 `.env.local` |
| `--dest <file>` | 目标文件路径,默认 `.env.example` |
| `--check` | 只校验不写入;若目标文件与生成内容不同,exit 1 |
| `--help` | 显示帮助 |

## Monorepo 集成

各 app 在 `package.json` 中添加:

```json
{
  "scripts": {
    "env:sync": "node ../../packages/shared/scripts/gen-env-example.mjs",
    "env:check": "node ../../packages/shared/scripts/gen-env-example.mjs --check"
  }
}
```

根 `package.json` 中添加聚合命令:

```json
{
  "scripts": {
    "sync:env": "pnpm -r --filter @ecoctrl/admin --filter @ecoctrl/web run env:sync",
    "sync:env:check": "pnpm -r --filter @ecoctrl/admin --filter @ecoctrl/web run env:check"
  }
}
```

### husky pre-commit

`.husky/pre-commit`:

```sh
pnpm sync:env
git add apps/*/.env.example
```

开发者修改 `.env.local` 后,`git commit` 会自动生成同步的 `.env.example` 并纳入本次 commit。
