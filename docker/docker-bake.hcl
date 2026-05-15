variable "TAG" {
    default = "latest"
}

variable "REGISTRY" {
    default = "ghcr.io/hyooeewee/ecoctrl"
}

target "web" {
    dockerfile = "apps/web/Dockerfile"
    tags = ["${REGISTRY}/web:${TAG}", "${REGISTRY}/web:latest"]
    # platforms = ["linux/amd64", "linux/arm64"]
    cache-from = ["type=registry,ref=${REGISTRY}/web:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/web:cache,mode=max"]
}

target "admin" {
    dockerfile = "apps/admin/Dockerfile"
    tags = ["${REGISTRY}/admin:${TAG}", "${REGISTRY}/admin:latest"]
    # platforms = ["linux/amd64", "linux/arm64"]
    cache-from = ["type=registry,ref=${REGISTRY}/admin:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/admin:cache,mode=max"]
}

target "server" {
    dockerfile = "packages/server/Dockerfile"
    tags = ["${REGISTRY}/server:${TAG}", "${REGISTRY}/server:latest"]
    # platforms = ["linux/amd64", "linux/arm64"]
    cache-from = ["type=registry,ref=${REGISTRY}/server:cache"]
    cache-to = ["type=registry,ref=${REGISTRY}/server:cache,mode=max"]
}

group "default" {
    targets = ["web", "admin", "server"]
}
