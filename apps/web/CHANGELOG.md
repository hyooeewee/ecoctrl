# @ecoctrl/web

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
