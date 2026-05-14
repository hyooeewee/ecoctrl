---
"@ecoctrl/admin": patch
"@ecoctrl/web": patch
"@ecoctrl/server": patch
---

- Upgraded base image: Node 22 → 24 Alpine
- Embedded DB migrations into container startup; removed standalone migrate service and Caddy runtime
- Switched healthcheck to curl, optimized volume paths
- Added db:squash script and migrateDatabase function
- New DB snapshot (version 7) and updated Drizzle config
- Fixed release workflow tag handling and artifact packaging with changeset outputs
- Dynamic pnpm version in Dockerfiles, shared build cache, TypeScript formatter config
