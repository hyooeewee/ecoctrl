---
title: 数据库备份与恢复
description: pg_dump 方案、定时备份配置、恢复步骤
---

# 数据库备份与恢复

EcoCtrl 所有重要数据（用户、设备、能耗记录、配置、工作流定义等）存储在 PostgreSQL 数据库中。备份方案基于 PostgreSQL 原生工具 `pg_dump`，可选择自动化定时备份。

<!-- 备份设置面板位于系统配置页面 -->

## 备份策略概览

```text
备份类型: 逻辑备份 (pg_dump)
存储位置: 容器挂载卷或外部 S3
调度方式: 手动 / 定时 (pg-boss cron)
保留策略: 按天数配置保留周期
```

## 手动备份

### 使用 docker compose exec

```bash
# 备份到宿主机当前目录
docker compose exec -T postgres pg_dump -U ecoctrl ecoctrl > ecoctrl-backup-$(date +%Y%m%d_%H%M%S).sql

# 压缩备份
docker compose exec -T postgres pg_dump -U ecoctrl ecoctrl | gzip > ecoctrl-backup-$(date +%Y%m%d_%H%M%S).sql.gz
```

### 使用 pg_dump（远程连接）

如果使用托管 PostgreSQL：

```bash
pg_dump -h <host> -U <user> -d ecoctrl -F c -f ecoctrl-backup.dump
```

`-F c` 使用自定义格式，支持 `pg_restore` 的并行恢复和选择性恢复。

## 定时自动备份

### 配置方式

在 Admin 后台的 **系统配置** 页面中：

1. 启用 **自动备份** (`autoBackup = true`)
2. 设置 **备份保留天数** (`backupRetentionDays`，默认 30 天)

`autoBackup` 启用后，服务端通过 pg-boss 调度一条定时任务执行备份。

### 备份调度实现

备份调度信息存储在 `backup_schedules` 表中：

```typescript
interface BackupSchedule {
  id: string;
  nextBackup: string; // ISO 8601 时间戳
  createdAt: string;
  updatedAt: string;
}
```

平台中的 `backup_schedules` 仅记录下一次执行时间。**实际备份执行需要依赖托管 PostgreSQL 的计划任务或外部 cron 脚本。**

> 当前版本中的自动备份是调度框架（记录下一次时间），备份执行逻辑仍需配合以下方案之一：
>
> - 宿主机 cron 调用 `docker compose exec postgres pg_dump`
> - 托管 PostgreSQL 的内置备份功能（RDS、Cloud SQL、Supabase 等）
> - 外部备份工具（pgBackRest、pg_probackup 等）

### 基于宿主机 cron 的备份示例

```bash
# /etc/cron.d/ecoctrl-backup
0 3 * * * root docker compose -f /opt/ecoctrl/docker/compose.yaml exec -T postgres pg_dump -U ecoctrl ecoctrl | gzip > /backups/ecoctrl-$(date +\%Y\%m\%d).sql.gz && find /backups -name "ecoctrl-*.sql.gz" -mtime +30 -delete
```

此 cron 实现：

- 每天凌晨 3:00 执行完整备份
- 保留最近 30 天的备份文件（自动清理 30 天前的文件）

## 备份保留策略

| 维度       | 建议                 | 说明                                |
| ---------- | -------------------- | ----------------------------------- |
| 本地保留   | 30 天                | 使用 `find -mtime +30 -delete` 清理 |
| 异地备份   | 每周一次送至对象存储 | 防止本地故障导致数据完全丢失        |
| 备份前验证 | `pg_restore --list`  | 确认备份文件可读                    |
| 恢复演练   | 每季度一次           | 在测试环境验证恢复流程              |

## 恢复步骤

### 恢复完整备份

```bash
# 1. 停止 API 服务（避免恢复期间写入数据）
docker compose stop server

# 2. 删除旧数据库（谨慎操作！）
docker compose exec postgres psql -U ecoctrl -c "DROP DATABASE IF EXISTS ecoctrl;"
docker compose exec postgres psql -U ecoctrl -c "CREATE DATABASE ecoctrl;"

# 3. 恢复数据
cat ecoctrl-backup-20250101_030000.sql | docker compose exec -T postgres psql -U ecoctrl -d ecoctrl

# 4. 启动 API 服务
docker compose start server
```

### 恢复压缩备份

```bash
gunzip -c ecoctrl-backup-20250101_030000.sql.gz | docker compose exec -T postgres psql -U ecoctrl -d ecoctrl
```

### 使用 pg_restore（自定义格式）

```bash
docker compose exec -T postgres pg_restore -U ecoctrl -d ecoctrl -v < ecoctrl-backup.dump
```

## 数据完整性验证

恢复后建议执行以下检查：

```bash
# 检查用户表
docker compose exec postgres psql -U ecoctrl -c "SELECT count(*) FROM users;"

# 检查平台配置
docker compose exec postgres psql -U ecoctrl -c "SELECT count(*) FROM platform_configs;"

# 检查备份调度记录
docker compose exec postgres psql -U ecoctrl -c "SELECT * FROM backup_schedules;"
```

## 最佳实践

1. **定期验证备份**：不要等到需要恢复时才发现备份文件损坏
2. **异地存储**：至少保留一份备份在 MinIO、AWS S3 或 NAS 上
3. **备份前检查磁盘空间**：大数据库备份可能消耗大量磁盘空间
4. **事务性一致性**：使用 `pg_dump` 默认的事务快照模式，保证备份数据一致性
5. **文档化恢复流程**：确保团队成员知道如何执行恢复

> **安全提醒**：备份文件包含所有数据库内容（包括密码哈希和用户邮箱）。将备份文件保存到安全位置，限制访问权限。
