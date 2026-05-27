#!/usr/bin/env python3
# /// script
# requires-python = ">=3.12"
# dependencies = ["pyyaml", "questionary"]
# ///
"""
Docker Compose Generator

Generates Docker Compose configs for dev/build/prod environments from a base
template (docker/compose.base.yaml) and an env file (docker/.env.local).

Usage:
    uv run scripts/generate-compose.py              # Interactive wizard
    uv run scripts/generate-compose.py --all        # Generate all environments
    uv run scripts/generate-compose.py --env dev    # Generate dev only
    uv run scripts/generate-compose.py --env prod --server-port 3001

Output:
    docker/compose.yaml
    docker/compose.dev.yaml
    docker/compose.build.yaml
"""

import argparse
import copy
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Error: PyYAML is required. Install with: uv add --script scripts/generate-compose.py pyyaml")
    sys.exit(1)


def _str_representer(dumper, data):
    """Force double quotes for all string values to match project style."""
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style='"')


yaml.add_representer(str, _str_representer)

try:
    import questionary
except ImportError:
    print("Error: questionary is required. Install with: uv add --script scripts/generate-compose.py questionary")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent.resolve()
REPO_ROOT = SCRIPT_DIR.parent
DOCKER_DIR = REPO_ROOT / "docker"
BASE_YAML_PATH = DOCKER_DIR / "compose.base.yaml"

ENV_MAP = {
    "prod": "compose.yaml",
    "dev": "compose.dev.yaml",
    "build": "compose.build.yaml",
}

# Defaults are read from docker/.env.example — do not hardcode here.

ENV_OVERRIDES = {
    "prod": {
        "server": {"image": "ghcr.io/hyooeewee/ecoctrl/server:latest"},
        "web": {"image": "ghcr.io/hyooeewee/ecoctrl/web:latest"},
        "admin": {"image": "ghcr.io/hyooeewee/ecoctrl/admin:latest"},
    },
    "dev": {
        "server": {
            "image": "node:24-alpine",
            "working_dir": "/app",
            "command": 'sh -c "corepack enable && pnpm --filter @ecoctrl/server dev"',
            "volumes": [
                "..:/app",
                "/app/node_modules",
                "/app/packages/server/node_modules",
            ],
        },
        "web": {
            "image": "node:24-alpine",
            "working_dir": "/app",
            "command": 'sh -c "corepack enable && pnpm --filter @ecoctrl/web dev"',
            "ports": ["8080:8080"],
            "volumes": [
                "..:/app",
                "/app/node_modules",
                "/app/apps/web/node_modules",
            ],
        },
        "admin": {
            "image": "node:24-alpine",
            "working_dir": "/app",
            "command": 'sh -c "corepack enable && pnpm --filter @ecoctrl/admin dev"',
            "ports": ["5173:5173"],
            "volumes": [
                "..:/app",
                "/app/node_modules",
                "/app/apps/admin/node_modules",
            ],
        },
    },
    "build": {
        "server": {
            "build": {
                "context": "..",
                "dockerfile": "packages/server/Dockerfile",
            },
        },
        "web": {
            "build": {
                "context": "..",
                "dockerfile": "apps/web/Dockerfile",
            },
        },
        "admin": {
            "build": {
                "context": "..",
                "dockerfile": "apps/admin/Dockerfile",
            },
        },
    },
}


def load_env_file(path: Path) -> dict[str, str]:
    """Parse .env file into dict, stripping inline comments."""
    result = {}
    if not path.exists():
        return result
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            raw = line.rstrip("\n")
            if not raw.strip() or raw.strip().startswith("#"):
                continue
            if "=" not in raw:
                continue
            key, value = raw.split("=", 1)
            key = key.strip()
            value = value.strip()
            # Strip inline comments (simple heuristic: " #")
            if " #" in value:
                value = value.split(" #")[0].strip()
            # Strip matching surrounding quotes (dotenv-style):
            # KEY="value" or KEY='value' -> value
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
                value = value[1:-1]
            result[key] = value
    return result


def load_base_yaml(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def substitute_vars(data, env_vars: dict[str, str]):
    """Recursively replace ${VAR} placeholders in dict/list/str."""
    if isinstance(data, dict):
        return {k: substitute_vars(v, env_vars) for k, v in data.items()}
    if isinstance(data, list):
        return [substitute_vars(v, env_vars) for v in data]
    if isinstance(data, str):
        def replacer(match):
            var = match.group(1)
            return env_vars.get(var, match.group(0))
        return re.sub(r'\$\{([A-Za-z_][A-Za-z0-9_]*)\}', replacer, data)
    return data


def _port_validator(text: str) -> bool | str:
    """Validate that text is a valid port number (1-65535)."""
    if not text.isdigit():
        return "Please enter a valid number"
    port = int(text)
    if not (1 <= port <= 65535):
        return "Port must be between 1 and 65535"
    return True


def _qtext(message: str, default: str = "", validate=None) -> str:
    """Prompt for text input; exit on cancellation."""
    result = questionary.text(message, default=default, validate=validate).ask()
    if result is None:
        print("\nCancelled.")
        sys.exit(0)
    return result


def _qpassword(message: str, default: str = "") -> str:
    """Prompt for password input; exit on cancellation."""
    result = questionary.password(message, default=default).ask()
    if result is None:
        print("\nCancelled.")
        sys.exit(0)
    return result


def _qconfirm(message: str, default: bool = True) -> bool:
    """Prompt for yes/no; exit on cancellation."""
    result = questionary.confirm(message, default=default).ask()
    if result is None:
        print("\nCancelled.")
        sys.exit(0)
    return result


def interactive_wizard(env_vars: dict[str, str]) -> tuple[list[str], dict[str, str]]:
    """Interactive wizard to collect generation parameters using questionary."""
    print("=" * 50)
    print("  Docker Compose Generator")
    print("=" * 50)
    print("  (space = toggle, enter = confirm, ctrl+c = cancel)")

    # Environments
    envs = questionary.checkbox(
        "Select environments to generate:",
        choices=[
            questionary.Choice("prod  (production)", value="prod", checked=True),
            questionary.Choice("dev   (development)", value="dev", checked=True),
            questionary.Choice("build (build)", value="build", checked=True),
        ],
    ).ask()
    if envs is None:
        print("\nCancelled.")
        sys.exit(0)
    if not envs:
        envs = ["prod"]

    # PostgreSQL
    print()
    pg_user = _qtext("PostgreSQL username", default=env_vars.get("POSTGRES_USER", ""))
    pg_password = _qpassword("PostgreSQL password", default=env_vars.get("POSTGRES_PASSWORD", ""))
    pg_db = _qtext("PostgreSQL database name", default=env_vars.get("POSTGRES_DB", ""))
    pg_port = _qtext("PostgreSQL port", default=env_vars.get("POSTGRES_PORT", "5432"), validate=_port_validator)

    # MinIO
    print()
    mn_enabled = _qconfirm("Enable MinIO?", default=True)
    mn_access_key = env_vars.get("MINIO_ACCESS_KEY", "")
    mn_secret_key = env_vars.get("MINIO_SECRET_KEY", "")
    mn_api_port = env_vars.get("MINIO_API_PORT", "9000")
    mn_console_port = env_vars.get("MINIO_CONSOLE_PORT", "9001")
    if mn_enabled:
        mn_access_key = _qtext("MinIO Access Key", default=mn_access_key)
        mn_secret_key = _qpassword("MinIO Secret Key", default=mn_secret_key)
        mn_api_port = _qtext("MinIO API port", default=mn_api_port, validate=_port_validator)
        mn_console_port = _qtext("MinIO Console port", default=mn_console_port, validate=_port_validator)

    # Server / Web / Admin
    print()
    srv_port = _qtext(
        "Server port",
        default=env_vars.get("SERVER_PORT", env_vars.get("PORT", "3000")),
        validate=_port_validator,
    )
    srv_host = _qtext("Server Host", default=env_vars.get("SERVER_HOST", "0.0.0.0"))
    web_port = _qtext("Web port", default=env_vars.get("WEB_PORT", "8081"), validate=_port_validator)
    admin_port = _qtext("Admin port", default=env_vars.get("ADMIN_PORT", "4173"), validate=_port_validator)

    # Init admin
    print()
    ia_username = _qtext("Initial admin username", default=env_vars.get("INIT_ADMIN_USERNAME", ""))
    ia_password = _qpassword("Initial admin password", default=env_vars.get("INIT_ADMIN_PASSWORD", ""))
    ia_email = _qtext("Initial admin email", default=env_vars.get("INIT_ADMIN_EMAIL", ""))

    updated = {
        **env_vars,
        "POSTGRES_USER": pg_user,
        "POSTGRES_PASSWORD": pg_password,
        "POSTGRES_DB": pg_db,
        "POSTGRES_PORT": pg_port,
        "MINIO_ACCESS_KEY": mn_access_key,
        "MINIO_SECRET_KEY": mn_secret_key,
        "MINIO_API_PORT": mn_api_port,
        "MINIO_CONSOLE_PORT": mn_console_port,
        "SERVER_PORT": srv_port,
        "SERVER_HOST": srv_host,
        "WEB_PORT": web_port,
        "ADMIN_PORT": admin_port,
        "INIT_ADMIN_USERNAME": ia_username,
        "INIT_ADMIN_PASSWORD": ia_password,
        "INIT_ADMIN_EMAIL": ia_email,
        "_minio_enabled": str(mn_enabled),
    }

    return envs, updated


def apply_env_overrides(compose: dict, env_name: str, env_vars: dict[str, str]) -> dict:
    """Apply environment-specific overrides to compose dict and substitute variables."""
    services = compose.get("services", {})
    overrides = ENV_OVERRIDES.get(env_name, {})

    # Apply image/build/command/volumes/working_dir overrides
    for svc_name, svc_overrides in overrides.items():
        if svc_name in services:
            for key, value in svc_overrides.items():
                services[svc_name][key] = value

    # MinIO disabled? Remove service and related references
    minio_enabled = env_vars.get("_minio_enabled", "True") == "True"
    if not minio_enabled and "minio" in services:
        del services["minio"]
        server = services.get("server", {})
        depends_on = server.get("depends_on", {})
        depends_on.pop("minio", None)
        if not depends_on:
            server.pop("depends_on", None)
        env = server.get("environment", {})
        for key in list(env.keys()):
            if key.startswith("S3_") or key == "STORAGE_PROVIDER":
                del env[key]

    # Dev-specific: add PNPM_HOME, add pnpm-store volume, rename project
    if env_name == "dev":
        server = services.get("server", {})
        env = server.get("environment", {})
        env["PNPM_HOME"] = "/root/.pnpm-store"
        server["environment"] = env

        for svc_name in ["server", "web", "admin"]:
            svc = services.get(svc_name, {})
            vols = list(svc.get("volumes", []))
            if "pnpm-store:/root/.pnpm-store" not in vols:
                vols.append("pnpm-store:/root/.pnpm-store")
            svc["volumes"] = vols

        # Ensure dotenv.config({ path: ".env.local" }) can find the file
        # since tsx runs inside packages/server where .env.local does not exist.
        server_vols = list(server.get("volumes", []))
        if "../docker/.env.local:/app/packages/server/.env.local:ro" not in server_vols:
            server_vols.append("../docker/.env.local:/app/packages/server/.env.local:ro")
        server["volumes"] = server_vols

        compose["volumes"] = {"pnpm-store": {}}
        compose["name"] = "ecoctrl-dev"

    # Compute effective variables and substitute
    effective_vars = dict(env_vars)
    if env_name == "dev":
        effective_vars["SERVER_PORT"] = "3001"
        effective_vars["WEB_PORT"] = "8080"
        effective_vars["ADMIN_PORT"] = "5173"
        effective_vars["NODE_ENV"] = "development"

    compose = substitute_vars(compose, effective_vars)
    return compose


class IndentedDumper(yaml.SafeDumper):
    """Custom YAML dumper that indents list items for readability."""

    def increase_indent(self, flow=False, indentless=False):
        return super().increase_indent(flow, False)


def write_compose(env_name: str, compose: dict) -> Path:
    """Write compose dict to YAML file."""
    filename = ENV_MAP[env_name]
    filepath = DOCKER_DIR / filename
    DOCKER_DIR.mkdir(parents=True, exist_ok=True)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write("# Auto-generated by scripts/generate-compose.py\n")
        f.write("# Do NOT edit manually.\n\n")
        yaml.dump(
            compose,
            f,
            Dumper=IndentedDumper,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
        )

    return filepath


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Docker Compose files for EcoCtrl",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run scripts/generate-compose.py              # Interactive wizard
  uv run scripts/generate-compose.py --all        # Generate all environments
  uv run scripts/generate-compose.py --env dev    # Generate dev only
  uv run scripts/generate-compose.py --env prod --server-port 3001
        """,
    )
    parser.add_argument(
        "--env",
        choices=["prod", "dev", "build"],
        help="Target environment to generate (default: interactive)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Generate all environments at once",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DOCKER_DIR / ".env.local",
        help=f"Env file to read defaults from (default: {DOCKER_DIR / '.env.local'})",
    )
    parser.add_argument(
        "--server-port",
        type=int,
        help="Override server port",
    )
    parser.add_argument(
        "--postgres-port",
        type=int,
        help="Override PostgreSQL port",
    )
    parser.add_argument(
        "--no-minio",
        action="store_true",
        help="Disable MinIO service",
    )
    parser.add_argument(
        "--admin-username",
        help="Override initial admin username",
    )
    parser.add_argument(
        "--admin-password",
        help="Override initial admin password",
    )

    return parser.parse_args()


def apply_cli_overrides(env_vars: dict[str, str], args: argparse.Namespace) -> dict[str, str]:
    """Apply command-line overrides to env_vars."""
    if args.server_port:
        env_vars["SERVER_PORT"] = str(args.server_port)
    if args.postgres_port:
        env_vars["POSTGRES_PORT"] = str(args.postgres_port)
    if args.no_minio:
        env_vars["_minio_enabled"] = "False"
    if args.admin_username:
        env_vars["INIT_ADMIN_USERNAME"] = args.admin_username
    if args.admin_password:
        env_vars["INIT_ADMIN_PASSWORD"] = args.admin_password
    return env_vars


def main() -> int:
    args = parse_args()

    # Load defaults from .env.example (tracked in git)
    example_path = DOCKER_DIR / ".env.example"
    example_vars = load_env_file(example_path)

    # Load user overrides from .env.local
    env_path = args.env_file
    env_vars = load_env_file(env_path)

    if not env_vars and not env_path.exists():
        print(f"Error: {env_path} not found.")
        print("  Run: cp docker/.env.example docker/.env.local")
        print("  Then fill in the values.")
        sys.exit(1)

    # Merge: .env.local overrides .env.example; empty values in .env.local
    # fall back to .env.example defaults
    merged = dict(example_vars)
    for key, val in env_vars.items():
        if val:
            merged[key] = val
    env_vars = merged

    # Fallback PORT -> SERVER_PORT
    if "SERVER_PORT" not in env_vars and "PORT" in env_vars:
        env_vars["SERVER_PORT"] = env_vars["PORT"]

    # Build DATABASE_URL if missing
    if "DATABASE_URL" not in env_vars or not env_vars["DATABASE_URL"]:
        env_vars["DATABASE_URL"] = (
            f"postgresql://{env_vars['POSTGRES_USER']}:{env_vars['POSTGRES_PASSWORD']}"
            f"@postgres:5432/{env_vars['POSTGRES_DB']}"
        )

    # Determine environments and apply CLI overrides
    if args.all:
        envs_to_generate = ["prod", "dev", "build"]
    elif args.env:
        envs_to_generate = [args.env]
    else:
        envs_to_generate, env_vars = interactive_wizard(env_vars)
        env_vars = apply_cli_overrides(env_vars, args)

    env_vars = apply_cli_overrides(env_vars, args)

    # Load base template
    if not BASE_YAML_PATH.exists():
        print(f"Error: Base template not found: {BASE_YAML_PATH}")
        sys.exit(1)

    base = load_base_yaml(BASE_YAML_PATH)

    print(f"\n{'=' * 50}")
    generated = []
    for env_name in envs_to_generate:
        compose = copy.deepcopy(base)
        compose = apply_env_overrides(compose, env_name, env_vars)
        filepath = write_compose(env_name, compose)
        generated.append(filepath)
        print(f"  Generated: {filepath.relative_to(REPO_ROOT)}")
    print(f"{'=' * 50}")
    print(f"  Done! Generated {len(generated)} file(s).")

    return 0


if __name__ == "__main__":
    sys.exit(main())
