---
"@ecoctrl/admin": patch
"@ecoctrl/web": patch
"@ecoctrl/server": patch
---

- Docker compose volumes switched to local bind mounts; added migrate-images.sh for offline deployment
- Rewrote gen-env-example in TypeScript with @clack/prompts; auto-emits .env.example during build
- Removed legacy Drizzle migrations (0000-0004); fixed ecoctrl-worker script path in PM2 config
- Added @changesets/changelog-github; release notes now extracted from CHANGELOG instead of auto-generated
