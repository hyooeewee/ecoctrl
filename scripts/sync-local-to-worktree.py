# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

"""Sync local-only files (ignored by git) from the main worktree into git
worktrees via symlinks.

Usage:
    uv run scripts/sync-local-to-worktree.py --help
    uv run scripts/sync-local-to-worktree.py <worktree-name-or-path> [--force]
    uv run scripts/sync-local-to-worktree.py --all [--force]

Examples:
    # Sync to a single managed worktree by name
    uv run scripts/sync-local-to-worktree.py unit-01

    # Sync to a worktree at an explicit path
    uv run scripts/sync-local-to-worktree.py /path/to/worktree

    # Sync to every managed worktree under .claude/worktrees/
    uv run scripts/sync-local-to-worktree.py --all

    # Replace existing non-symlink files with symlinks
    uv run scripts/sync-local-to-worktree.py unit-01 --force

The following items are synced:
    - *.local* files anywhere in the repo (e.g. .env.local, CLAUDE.local.md)
    - .claude/* contents at every level, except .claude/worktrees
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


IGNORED_DIRS = {".git", "node_modules"}


def get_main_worktree() -> Path:
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=True,
    )
    return Path(result.stdout.strip())


def resolve_target(main: Path, name: str) -> Path:
    candidates = [Path(name).resolve(), main / ".claude" / "worktrees" / name]
    for path in candidates:
        if path.is_dir():
            return path

    print(f"Worktree not found: {name}")
    print(f"  looked in {candidates[1]}")
    print(f"  looked at {candidates[0]}")
    sys.exit(1)


def list_managed_worktrees(main: Path) -> list[Path]:
    """Return all directories under .claude/worktrees/."""
    worktrees_dir = main / ".claude" / "worktrees"
    if not worktrees_dir.is_dir():
        return []
    return [entry for entry in worktrees_dir.iterdir() if entry.is_dir()]


def walk_local_files(root: Path) -> list[tuple[Path, str, bool]]:
    """Return (src, rel_path, is_dir) for *.local* files under root."""
    results: list[tuple[Path, str, bool]] = []

    def walk(directory: Path, rel_prefix: str) -> None:
        for entry in directory.iterdir():
            rel = f"{rel_prefix}/{entry.name}" if rel_prefix else entry.name
            if entry.is_dir():
                if entry.name in IGNORED_DIRS | {".claude"}:
                    continue
                walk(entry, rel)
            elif entry.is_file() and ".local" in entry.name:
                results.append((entry, rel, False))

    walk(root, "")
    return results


def find_claude_items(root: Path) -> list[tuple[Path, str, bool]]:
    """Return (src, rel_path, is_dir) for children of every .claude dir,
    excluding .claude/worktrees.
    """
    results: list[tuple[Path, str, bool]] = []

    def scan(directory: Path, rel_prefix: str) -> None:
        for entry in directory.iterdir():
            if not entry.is_dir():
                continue
            if entry.name in IGNORED_DIRS:
                continue

            rel = f"{rel_prefix}/{entry.name}" if rel_prefix else entry.name
            if entry.name == ".claude":
                for child in entry.iterdir():
                    if child.name in {"worktrees", ".DS_Store"}:
                        continue
                    child_rel = f"{rel}/{child.name}"
                    results.append((child, child_rel, child.is_dir()))
                continue

            scan(entry, rel)

    scan(root, "")
    return results


def link_entry(src: Path, dst: Path, is_dir: bool, force: bool) -> None:
    rel = dst.relative_to(Path.cwd())

    if dst.is_symlink():
        try:
            if dst.readlink() == src:
                print(f"  already linked {rel}")
                return
        except OSError:
            pass
        dst.unlink()
    elif dst.exists():
        if not force:
            print(f"  skip (existing non-symlink): {rel}")
            return
        if is_dir:
            import shutil

            shutil.rmtree(dst)
        else:
            dst.unlink()

    dst.parent.mkdir(parents=True, exist_ok=True)
    os.symlink(src, dst, target_is_directory=is_dir)
    print(f"  linked {rel}")


def sync_to_target(main_root: Path, target_root: Path, force: bool) -> None:
    print(f"Syncing local config from {main_root} -> {target_root}")

    for src, rel, is_dir in walk_local_files(main_root):
        link_entry(src, target_root / rel, is_dir, force)

    for src, rel, is_dir in find_claude_items(main_root):
        link_entry(src, target_root / rel, is_dir, force)

    print("Done.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync local config to one or all git worktrees",
        usage="%(prog)s [worktree-name-or-path] [--all] [--force]",
    )
    parser.add_argument(
        "name",
        nargs="?",
        help="worktree name (managed under .claude/worktrees/) or explicit path",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="sync_all",
        help="sync to every managed worktree under .claude/worktrees/",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="replace existing non-symlink files with symlinks",
    )
    args = parser.parse_args()

    if not args.name and not args.sync_all:
        parser.error("specify a worktree name/path or use --all")
    if args.name and args.sync_all:
        parser.error("cannot specify both a worktree name/path and --all")

    main_root = get_main_worktree()

    if args.sync_all:
        targets = list_managed_worktrees(main_root)
        if not targets:
            print("No managed worktrees found under .claude/worktrees/")
            sys.exit(0)
        for target in targets:
            sync_to_target(main_root, target, args.force)
            print()
    else:
        target_root = resolve_target(main_root, args.name)
        sync_to_target(main_root, target_root, args.force)


if __name__ == "__main__":
    main()
