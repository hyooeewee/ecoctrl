variable "TAG" {
    default = "latest"
}

variable "REGISTRY" {
    default = "ghcr.io/hyooeewee/ecoctrl"
}

# ────────────────────────────────
# Shared builder base image
# ────────────────────────────────
target "builder" {
    dockerfile = "docker/Dockerfile.builder"
    tags = ["${REGISTRY}/builder:cache"]
    cache-from = ["type=registry,ref=${REGISTRY}/builder:cache-buildx"]
    cache-to = ["type=registry,ref=${REGISTRY}/builder:cache-buildx,mode=max"]
}

# ────────────────────────────────
# App images — use `contexts` to
# reference the local builder
# target instead of pulling from
# GHCR on every build.
# ────────────────────────────────
target "web" {
    dockerfile = "apps/web/Dockerfile"
    tags = ["${REGISTRY}/web:${TAG}", "${REGISTRY}/web:latest"]
    cache-from = ["type=registry,ref=${REGISTRY}/web:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/web:cache,mode=max"]
    contexts = {
        builder-base = "target:builder"
    }
    args = {
        BUILDER_IMAGE = "builder-base"
    }
}

target "admin" {
    dockerfile = "apps/admin/Dockerfile"
    tags = ["${REGISTRY}/admin:${TAG}", "${REGISTRY}/admin:latest"]
    cache-from = ["type=registry,ref=${REGISTRY}/admin:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/admin:cache,mode=max"]
    contexts = {
        builder-base = "target:builder"
    }
    args = {
        BUILDER_IMAGE = "builder-base"
    }
}

target "server" {
    dockerfile = "packages/server/Dockerfile"
    tags = ["${REGISTRY}/server:${TAG}", "${REGISTRY}/server:latest"]
    cache-from = ["type=registry,ref=${REGISTRY}/server:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/server:cache,mode=max"]
    contexts = {
        builder-base = "target:builder"
    }
    args = {
        BUILDER_IMAGE = "builder-base"
    }
}

group "default" {
    targets = ["builder", "web", "admin", "server"]
}
