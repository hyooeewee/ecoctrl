# syntax=docker/dockerfile:1
#
# Shared builder base image with all monorepo dependencies installed.
# Eliminates repeated pnpm install across web/admin/server builds.
#
# Build:
#   docker build -f docker/Dockerfile.builder -t ecoctrl-builder .

FROM node:24-alpine AS builder

WORKDIR /app

ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

RUN corepack enable

# Copy workspace manifests for dependency resolution
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN PNPM_VERSION=$(node -p "require('./package.json').packageManager.replace('pnpm@','')") && \
    corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy all package.json files for workspace:* resolution
COPY apps/web/package.json apps/web/
COPY apps/admin/package.json apps/admin/
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/

RUN pnpm install --frozen-lockfile
