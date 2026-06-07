# /// script
# requires-python = ">=3.12"
# dependencies = ["openai", "Pillow"]
# ///
"""
Unified image generation script for hatch-pet.

Reads API config from .claude/settings.json (or .claude/settings.local.json),
reads a prompt file, attaches reference images (optional), calls the configured API,
and saves the generated image.

Usage with reference images:
    uv run generate_image.py \
        --project-root /absolute/path/to/project \
        --prompt-file prompts/base-pet.md \
        --reference refs/ref.png \
        --reference refs/base.png \
        --output decoded/base.png

Usage with text-only prompt (no references):
    uv run generate_image.py \
        --project-root /absolute/path/to/project \
        --prompt-file prompts/base-pet.md \
        --output decoded/base.png
"""

import argparse
import base64
import json
import re
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image


def load_settings(project_root: Path) -> dict:
    """Load API config from settings.json or settings.local.json."""
    for name in ("settings.local.json", "settings.json"):
        path = project_root / ".claude" / name
        if path.exists():
            return json.loads(path.read_text())
    raise FileNotFoundError("No .claude/settings.json or settings.local.json found")


def encode_image(path: Path) -> str:
    """Encode an image file to base64 data URL."""
    data = path.read_bytes()
    b64 = base64.b64encode(data).decode("utf-8")
    ext = path.suffix.lower()
    mime = (
        "image/png"
        if ext == ".png"
        else "image/jpeg"
        if ext in (".jpg", ".jpeg")
        else "image/webp"
    )
    return f"data:{mime};base64,{b64}"


def extract_image_from_response(response) -> Image.Image:
    """Extract image from OpenAI-style chat completion response."""
    msg = response.choices[0].message

    # OpenRouter / seedream-4.5 returns images in msg.images
    if hasattr(msg, "images") and msg.images:
        for img in msg.images:
            image_url = img.get("image_url", {}).get("url", "")
            if image_url.startswith("data:"):
                b64_data = image_url.split(",", 1)[1]
                return Image.open(BytesIO(base64.b64decode(b64_data)))
            elif image_url.startswith("http"):
                import requests

                r = requests.get(image_url, timeout=60)
                return Image.open(BytesIO(r.content))

    # Fallback: try to extract from content string
    content = msg.content or ""

    # 1. Markdown image with data URL
    md_match = re.search(
        r"!\[.*?\]\((data:image/\w+;base64,[A-Za-z0-9+/=]+)\)", content
    )
    if md_match:
        b64_data = md_match.group(1).split(",", 1)[1]
        return Image.open(BytesIO(base64.b64decode(b64_data)))

    # 2. Raw data URL
    raw_match = re.search(r"data:image/\w+;base64,([A-Za-z0-9+/=]+)", content)
    if raw_match:
        return Image.open(BytesIO(base64.b64decode(raw_match.group(1))))

    # 3. Markdown image with HTTP URL
    url_match = re.search(r"!\[.*?\]\((https?://[^\s)]+)\)", content)
    if url_match:
        import requests

        r = requests.get(url_match.group(1), timeout=60)
        return Image.open(BytesIO(r.content))

    # 4. Raw HTTP URL
    raw_url_match = re.search(r"https?://[^\s\"\'\)\]]+", content)
    if raw_url_match:
        import requests

        r = requests.get(raw_url_match.group(0), timeout=60)
        return Image.open(BytesIO(r.content))

    print(
        f"Could not extract image from response. Content preview: {content[:1000]}",
        file=sys.stderr,
    )
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Generate image via configured API")
    parser.add_argument("--prompt-file", required=True, help="Path to prompt markdown file")
    parser.add_argument(
        "--reference", action="append", default=[], help="Reference image path (optional, can repeat)"
    )
    parser.add_argument("--output", required=True, help="Output image path")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    args = parser.parse_args()

    project_root = Path(args.project_root).resolve()
    settings = load_settings(project_root)
    env = settings.get("env", {})

    api_key = env.get("IMAGEGEN_API_KEY")
    base_url = env.get("IMAGEGEN_BASE_URL", "").rstrip("/")
    model = env.get("IMAGEGEN_MODEL", "")

    if not api_key or not base_url or not model:
        print(
            "Missing IMAGEGEN_API_KEY, IMAGEGEN_BASE_URL, or IMAGEGEN_MODEL in settings",
            file=sys.stderr,
        )
        sys.exit(1)

    # Build message content: reference images first, then prompt text
    content = []
    for ref_path in (Path(p) for p in args.reference):
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": encode_image(ref_path)},
            }
        )
    content.append({"type": "text", "text": Path(args.prompt_file).read_text()})

    from openai import OpenAI

    client = OpenAI(base_url=base_url, api_key=api_key)

    print(f"Calling {base_url}/chat/completions with model={model}", file=sys.stderr)
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        extra_body={"modalities": ["image"]},
    )
    print(f"Response received", file=sys.stderr)

    img = extract_image_from_response(response)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path)
    print(f"Saved image to {output_path} ({img.size})")


if __name__ == "__main__":
    main()
