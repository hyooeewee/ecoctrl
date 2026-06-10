# @ecoctrl/server

## 0.7.1

### Patch Changes

- 3357a27: Consolidate RC release into Release workflow. Enhance BabylonJS model viewer and dashboard navigation. Add workflow editor, SMTP verification, and config testing.

## 0.7.0

### Minor Changes

- 22b4900: Enhance SSE workflow node with event ID support and schema defaults
- 22b4900: Add multi-file support and S3 streaming for dashboard models
- 22b4900: Add BabylonJS-based 3D model viewer and editor with label system

### Patch Changes

- 22b4900: Add auto-detection of header rows in XLSX and CSV parsers
- 22b4900: Simplify web navigation and remove unused dashboard routes

## 0.6.0

### Minor Changes

- [`6d19b45`](https://github.com/hyooeewee/ecoctrl/commit/6d19b454ad439f00868bde1de8f3185f7f17064f) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add full email functionality with SMTP configuration to the workflow engine

- [`6d19b45`](https://github.com/hyooeewee/ecoctrl/commit/6d19b454ad439f00868bde1de8f3185f7f17064f) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add cron-trigger and sse-send built-in nodes with error handling, retry mechanism, and logging improvements

- [`6d19b45`](https://github.com/hyooeewee/ecoctrl/commit/6d19b454ad439f00868bde1de8f3185f7f17064f) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add dashboard layout with 3D building view, floor navigation, and model loading optimizations

- [`6d19b45`](https://github.com/hyooeewee/ecoctrl/commit/6d19b454ad439f00868bde1de8f3185f7f17064f) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Enhance workflow editor with expression support, variable import, export/import, and log viewer improvements

### Patch Changes

- [`6d19b45`](https://github.com/hyooeewee/ecoctrl/commit/6d19b454ad439f00868bde1de8f3185f7f17064f) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Fix Docker healthcheck commands, normalize compose quotes, and update dependencies

## 0.5.0

### Minor Changes

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Refactor workflow editor with unified node shell, variable editor, and extracted canvas hooks.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add ECN manager skill toolchain for custom workflow node development.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Standardize built-in nodes with SVG icons and kebab-case naming fixes.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Rebuild models/objects/points management UI with data table panels and create/edit dialogs.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Squash database migrations into single init file.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add SSE real-time push system across admin, web, and server.

### Patch Changes

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Update Docker build scripts and compose files.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Extend UI library with checkbox, hover-card, pagination, and sonner.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Patch API clients and server routes for new features.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Adjust release and compose helper scripts.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Remove husky pre-commit and update pre-push hook.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add color mode hook and update dark mode utilities.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Refresh dependencies via pnpm-lock.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add CI/CD workflows for canary and stable releases.

- [`c77f0b7`](https://github.com/hyooeewee/ecoctrl/commit/c77f0b7989523f333679e78aae6146e09134d6da) Thanks [@hyooeewee](https://github.com/hyooeewee)! - Add test coverage for SSE, workflow, and storage modules.

## 0.4.10

### Patch Changes

- [`31f28ef`](https://github.com/hyooeewee/ecoctrl/commit/31f28ef931abf1cff8b741e46e6014e22bf57169) Thanks [@hyooeewee](https://github.com/hyooeewee)! - reactored dashboardModel and users routes to replace direct filesystem I/O (fs/path) with the StorageAdapter abstraction

- [`135f18b`](https://github.com/hyooeewee/ecoctrl/commit/135f18b0f171593fe459b216654d0fb3ee5ef9fa) Thanks [@hyooeewee](https://github.com/hyooeewee)! - refactored the server's build/Docker setup and the init script's asset resolution for built-in nodes and pets

- [`f37c77c`](https://github.com/hyooeewee/ecoctrl/commit/f37c77c98049e2528c6d47d58c72061e6e93ab99) Thanks [@hyooeewee](https://github.com/hyooeewee)! - - Add `StorageAdapter` abstraction supporting S3 API (MinIO, R2, OSS, AWS S3)

  - Integrate MinIO as self-hosted object storage backend
  - Refactor `/api/files` and `/api/models` routes to use presigned URL redirects
  - Replace `unzipper` with `jszip` for in-memory 3D model ZIP extraction
  - Remove `uploads/` local directory dependency
  - Add MinIO service to Docker Compose with auto bucket initialization

- [`06e3532`](https://github.com/hyooeewee/ecoctrl/commit/06e353268e3404d18e212bbb092afb1e9d60b80c) Thanks [@hyooeewee](https://github.com/hyooeewee)! - **Workflow Engine**

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

## 0.4.9

### Patch Changes

- [`2484cc8`](https://github.com/hyooeewee/ecoctrl/commit/2484cc80bb8b902d261d016234d5bea4c40752ae) Thanks [@hyooeewee](https://github.com/hyooeewee)! - add pets system

## 0.4.8

### Patch Changes

- [`92cbdfe`](https://github.com/hyooeewee/ecoctrl/commit/92cbdfef00950031cf0ff9a301d3a611e795dbcd) Thanks [@hyooeewee](https://github.com/hyooeewee)! - - add upload step to Cloudflare R2 for release assets
  - add offline deploy bundle packaging and upload to Cloudflare R2
  - add offline deployment instructions and Cloudflare R2 mirror links to documentation

## 0.4.7

### Patch Changes

- [`b041061`](https://github.com/hyooeewee/ecoctrl/commit/b041061a15e1dd01f0b177975352705a0b396b16) Thanks [@hyooeewee](https://github.com/hyooeewee)! - - Docker compose volumes switched to local bind mounts; added migrate-images.sh for offline deployment
  - Rewrote gen-env-example in TypeScript with @clack/prompts; auto-emits .env.example during build
  - Removed legacy Drizzle migrations (0000-0004); fixed ecoctrl-worker script path in PM2 config
  - Added @changesets/changelog-github; release notes now extracted from CHANGELOG instead of auto-generated

## 0.4.6

### Patch Changes

- b34656d: - Upgraded base image: Node 22 → 24 Alpine
  - Embedded DB migrations into container startup; removed standalone migrate service and Caddy runtime
  - Switched healthcheck to curl, optimized volume paths
  - Added db:squash script and migrateDatabase function
  - New DB snapshot (version 7) and updated Drizzle config
  - Fixed release workflow tag handling and artifact packaging with changeset outputs
  - Dynamic pnpm version in Dockerfiles, shared build cache, TypeScript formatter config

## 0.4.5

### Patch Changes

- 4682e71: fix release workflow

## 0.4.4

### Patch Changes

- 3f9e894: fix tag generate script

## 0.4.3

### Patch Changes

- 99ff9d2: fix ci/cd workflows

## 0.4.2

### Patch Changes

- 985d510: fix deploy action

## 0.4.1

### Patch Changes

- 81b0aa4: fix release workflow tag logic and tidy templates

## 0.4.0

### Minor Changes

- 2f6346a: - Add workflow management with visual editor and CRUD operations
  - Add dashboard model configuration with hotspot and label management
  - Add carbon factor and tree management to energy module
  - Add batch import for business objects
  - Add Zustand store for active tab state and preference syncing
  - Add test email functionality to system configuration
  - Add SMTP password visibility toggle
  - Update navigation structure and sidebar layout
  - Improve responsive layout across multiple pages
  - Fix autofill styles and login error handling
  - Add dynamic model loading with fallback URL support
  - Update building view component
  - Add workflow engine with triggers, validation, and execution
  - Add pg-boss job queue and worker processing
  - Add dashboard model API (replaces 3D config)
  - Add carbon factor nodes and business object batch operations
  - Add platform configuration for OAuth login control
  - Add initAdmin for default admin user creation
  - Standardize error response handling with centralized schemas
  - Update TypeScript target to ES2023
  - Add Docker Compose health checks and migration service
  - Add CI/CD workflows for build, deploy, and release
  - Add GitHub Actions for automated image cleanup
  - Streamline Caddyfile configuration
  - Update Dockerfile for production-only dependencies and ESM support

## 0.3.0

### Minor Changes

- 8e9c718: add workflows

## 0.2.1

### Patch Changes

- 42d3a53: fix the packaging logic

## 0.2.0

### Minor Changes

- 76b4d49: ### Admin

  - Add business object CRUD with point value management
  - Enhance model management with device type and point configuration
  - Add file upload and replacement for 3D models
  - Implement Monaco editor for JSON editing
  - Add success feedback and registration flow controls

  ### Web

  - Implement authentication flow with login/logout
  - Replace CSS blueprint with Lottie loading animation
  - Add logout confirmation dialog
  - Refactor widget layout to individual position properties

  ### Server

  - Add rate limiting with @fastify/rate-limit
  - Enhance BusinessObject and PointItem schemas
  - Add status field to BusinessObject
  - Update seed data for platform metrics and user settings
  - Refactor dashboard and seed utilities

## 0.1.2

### Patch Changes

- 603f2d2: migrate to local-web-server and fix the bug

## 0.1.1

### Patch Changes

- e2183a8: Fix production path resolve error
- 51490e8: fix vite plus proxy error
- 60bc129: Add deploy script

## 0.1.0

### Minor Changes

- cac4d1f: Improved API discoverability via Swagger UI
- cac4d1f: Laid the foundation by migrating shared
- cac4d1f: Built out the user-centric layer

### Patch Changes

- cac4d1f: Streamlined the release pipeline

## 0.0.3

### Patch Changes

- e7f3711: Implementing weather API integration and Docker configuration

## 0.0.2

### Patch Changes

- bd08896: test release workflow

## 0.0.1

### Patch Changes

- 3af2b8e: alpha test release
