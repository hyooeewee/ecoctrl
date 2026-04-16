# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///

"""Scan for unused locale keys in zh-CN.ts / en-US.ts.

Usage:
    uv run scripts/check-locale-dead-code.py
    uv run scripts/check-locale-dead-code.py --locale app/locales/en-US.ts
"""

import argparse
import glob
import os
import re
import sys


def extract_locale_keys(content: str) -> list[str]:
    """Parse a locale file and return dotted key paths."""
    # Find object body between 'export const xxx = {' and the last '};' before type export
    start = content.index("export const") + len("export const")
    # Slice from first '{' after export const
    brace_idx = content.index("{", start)
    body = content[brace_idx:]

    lines = body.split("\n")
    paths: list[str] = []
    stack: list[tuple[str, int]] = []

    for line in lines:
        stripped = line.lstrip()
        if not stripped or stripped.startswith("//"):
            continue
        indent = len(line) - len(stripped)
        m = re.match(r'([a-zA-Z_]\w*)\s*:', stripped)
        if not m:
            continue

        key = m.group(1)
        while stack and stack[-1][1] >= indent:
            stack.pop()

        path = ".".join([p[0] for p in stack]) + "." + key if stack else key
        paths.append(path)

        rest = stripped[m.end() :].split("//")[0].strip()
        if rest == "{":
            stack.append((key, indent))

    return paths


def scan_source_code(base_dir: str) -> str:
    """Read all TS/TSX files into a single string."""
    patterns = [
        os.path.join(base_dir, "app", "**", "*.ts"),
        os.path.join(base_dir, "app", "**", "*.tsx"),
    ]
    files: list[str] = []
    for p in patterns:
        files.extend(glob.glob(p, recursive=True))

    # Exclude node_modules and locale files themselves
    files = [
        f
        for f in files
        if "/node_modules/" not in f and "/locales/" not in f
    ]

    code_parts: list[str] = []
    for f in files:
        try:
            with open(f, encoding="utf-8") as fh:
                code_parts.append(fh.read())
        except OSError:
            pass

    return "\n".join(code_parts)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Detect unused locale keys in the codebase."
    )
    parser.add_argument(
        "--locale",
        default="app/locales/zh-CN.ts",
        help="Path to the locale source file (default: app/locales/zh-CN.ts)",
    )
    parser.add_argument(
        "--dir",
        default=".",
        help="Project root directory (default: current directory)",
    )
    args = parser.parse_args()

    locale_path = os.path.join(args.dir, args.locale)
    if not os.path.isfile(locale_path):
        print(f"Locale file not found: {locale_path}", file=sys.stderr)
        return 1

    with open(locale_path, encoding="utf-8") as fh:
        locale_content = fh.read()

    keys = extract_locale_keys(locale_content)
    code = scan_source_code(args.dir)

    used: set[str] = set()
    unused: list[str] = []

    for key in sorted(set(keys)):
        # Match both t.key.path and locale.key.path patterns
        patterns = [
            rf'\bt\.{re.escape(key)}\b',
            rf'\blocale\.{re.escape(key)}\b',
        ]
        if any(re.search(p, code) for p in patterns):
            used.add(key)
        else:
            unused.append(key)

    print(f"Total locale keys: {len(set(keys))}")
    print(f"Used: {len(used)}")
    print(f"Unused (potential dead code): {len(unused)}")
    print()
    if unused:
        for k in unused:
            print(f"  - {k}")
    else:
        print("  None found!")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
