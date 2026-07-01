---
title: 性能调优
description: PostgreSQL 连接池、Docker 资源限制、SSE 队列积压处理
---

# 性能调优

本文介绍如何针对不同规模的部署场景，优化 EcoCtrl 各服务的性能表现。

---

## PostgreSQL 连接池

EcoCtrl 服务端使用 `pg-pool` 管理数据库连接。合理配置连接池可以避免数据库连接耗尽或过度空闲。

### 配置参数

```bash
# docker/.env.local
DB_POOL_MIN=2
DB_POOL_MAX=10
```

| 参数          | 默认值 | 说明                   | 推荐值        |
| ------------- | ------ | ---------------------- | ------------- |
| `DB_POOL_MIN` | 2      | 连接池最小保持的连接数 | CPU 核数 \* 2 |
| `DB_POOL_MAX` | 10     | 连接池最大连接数       | CPU 核数 \* 4 |

### 规模参考

| 部署规模 | CPU | DB_POOL_MIN | DB_POOL_MAX | PostgreSQL max_connections |
| -------- | --- | ----------- | ----------- | -------------------------- |
| 小型     | 2   | 2           | 10          | 50                         |
| 中型     | 4   | 4           | 20          | 100                        |
| 大型     | 8   | 8           | 40          | 200                        |

> 连接池的总连接数不应超过 PostgreSQL `max_connections` 的 1/3，为管理系统预留连接余量。

### 监控连接数

```bash
# 查看当前活跃连接数
docker compose exec postgres psql -U ecoctrl -c "
SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = 'ecoctrl';
"

# 查看连接等待状态
docker compose exec postgres psql -U ecoctrl -c "
SELECT wait_event_type, wait_event, count(*)
FROM pg_stat_activity
WHERE state = 'active'
GROUP BY wait_event_type, wait_event;
"
```

### 慢查询分析

```bash
docker compose exec postgres psql -U ecoctrl -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

> 如果 `pg_stat_statements` 无数据，需要先启用扩展：`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`

---

## Docker 资源限制

Docker Compose 部署时，可以通过 `deploy.resources` 设置各容器的资源上限，防止某个服务耗尽主机资源。

### 推荐配置

```yaml
# 在 compose.yaml 中配置（以 server 为例）
services:
  server:
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 256M
```

### 各服务参考值

| 服务     | CPU 上限 | 内存上限 | CPU 预留 | 内存预留 | 说明                     |
| -------- | -------- | -------- | -------- | -------- | ------------------------ |
| server   | 2        | 1 GB     | 0.5      | 256 MB   | API 服务，主要消耗 CPU   |
| web      | 1        | 256 MB   | 0.25     | 128 MB   | Caddy 静态文件服务       |
| admin    | 1        | 256 MB   | 0.25     | 128 MB   | Caddy 静态文件服务       |
| postgres | 2        | 1 GB     | 0.5      | 512 MB   | 数据库，内存影响查询性能 |
| minio    | 1        | 512 MB   | 0.25     | 256 MB   | 对象存储                 |

### PostgreSQL 内存参数

为 PostgreSQL 容器设置 `shared_buffers` 参数，建议值为可用内存的 25%：

```yaml
services:
  postgres:
    command: >
      -c shared_buffers=256MB
      -c work_mem=16MB
      -c effective_cache_size=768MB
      -c random_page_cost=1.1
```

| 参数                   | 建议值       | 说明                          |
| ---------------------- | ------------ | ----------------------------- |
| `shared_buffers`       | 总内存的 25% | 共享缓冲区大小                |
| `work_mem`             | 16-64 MB     | 单次查询排序/哈希操作内存上限 |
| `effective_cache_size` | 总内存的 75% | 操作系统缓存估算值            |
| `random_page_cost`     | 1.1 (SSD)    | 随机 I/O 成本，SSD 设为 1.1   |

---

## SSE 队列背压处理

SSE (Server-Sent Events) 用于向前端推送实时数据。

### 背压机制

EcoCtrl 在 SSE 连接层面实现了以下背压策略：

1. **写缓冲区**：每个 SSE 连接维护有限长度的写缓冲区
2. **丢弃策略**：缓冲区满时丢弃最旧的消息，保证最新数据优先到达
3. **连接健康检查**：30 秒心跳间隔，检测到客户端断连时及时回收资源

### 监控背压

```bash
# 查看 SSE 连接丢弃事件
docker compose logs server | grep "SSE buffer full"

# 检查活跃 SSE 连接数
docker compose logs server | grep "SSE connected" | tail -5
```

### 优化建议

| 场景                             | 建议                                          |
| -------------------------------- | --------------------------------------------- |
| 大量客户端并发连接 (>100)        | 增加服务器实例数，或使用消息队列作为 SSE 中继 |
| 消息推送频率过高 (< 100ms 间隔)  | 在前端合并短时间内的事件（debounce）          |
| 部分客户端消费速度慢（网络不佳） | 缩短缓冲区超时时间，加速清理慢客户端          |
| 推送目标数过多 (> 1000 客户端)   | 切换到 WebSocket + Redis Pub/Sub 架构         |

---

## 其他优化建议

### 3D 模型优化

建议使用项目自带的模型优化脚本压缩 glTF 文件：

```bash
pnpm tsx scripts/optimize-model.ts --input model.glb --output model-optimized.glb
```

该脚本会执行 Draco 压缩、纹理合并和顶点优化。

### 能耗查询优化

`energy_readings` 表会随时间快速增长。确保以下索引存在：

```sql
CREATE INDEX IF NOT EXISTS idx_energy_readings_area_recorded
  ON energy_readings (area_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_faults_status_level_triggered
  ON faults (status, level, triggered_at DESC);
```

### Node.js 内存限制

如果 API 服务出现内存压力，可通过 `NODE_OPTIONS` 限制堆内存：

```bash
# 在 Dockerfile 或 compose.yaml 中设置
NODE_OPTIONS="--max-old-space-size=512"
```
