---
"@ecoctrl/admin": patch
"@ecoctrl/web": patch
"@ecoctrl/server": patch
---

reactored dashboardModel and users routes to replace direct filesystem I/O (fs/path) with the StorageAdapter abstraction
