---
"@ecoctrl/admin": patch
"@ecoctrl/web": patch
"@ecoctrl/server": patch
---

**Workflow Engine**

- Add plugin node system with `.ecn` zip package format (manifest + backend.js + schema.json + icon.svg)
- Run plugin code in `isolated-vm` sandbox with curated API (http, iot, log, variables)
- Add built-in workflow nodes as `.ecn` packages: start, end, condition, switch, loop, parallel, delay, http-request, database, email, point-read, point-write,
  variable
- Add `POST /api/nodes/install`, `DELETE /api/nodes/:id/:version`, `POST /api/nodes/reload` endpoints
- Refactor workflow editor with node library, test panel, config panel, persistence, undo, keyboard shortcuts, and context menus
- Add `@ecoctrl/ui/context-menu` and `@ecoctrl/ui/kbd` components

**Pet Remote Storage**

- Add `GET /api/pets` (public), `POST /api/pets`, `DELETE /api/pets/:id`, `POST /api/pets/reload` (admin) endpoints
- Use dedicated `ecoctrl-pets` S3 bucket via `getPetStorage()`
- Remove `virtual:pets` build-time module; load pets dynamically from API at runtime
- Retain `usagi` as built-in pet
