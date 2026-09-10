#!/usr/bin/env python3
"""Write an images.json into every project image folder.

The site finds numbered files (1.webp, 2.jpg, ...) on its own, so this script is
only needed when you want to keep original filenames or add captions.

    python3 tools/build-image-manifests.py            # all projects
    python3 tools/build-image-manifests.py rubi magi  # only these

Captions: edit the generated images.json and replace a plain "file.jpg" entry
with {"src": "file.jpg", "alt": "What the picture shows"}. Re-running keeps any
alt text you already wrote.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "assets" / "images" / "projects"
EXTS = {".webp", ".jpg", ".jpeg", ".png", ".gif", ".avif"}


def natural_key(name: str):
    """Sort so 2.webp comes before 10.webp."""
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", name)]


def build(folder: Path) -> int:
    existing = {}
    manifest = folder / "images.json"
    if manifest.exists():
        try:
            for entry in json.loads(manifest.read_text()):
                if isinstance(entry, dict) and entry.get("alt"):
                    existing[entry["src"]] = entry["alt"]
        except (ValueError, OSError):
            pass

    files = sorted((f.name for f in folder.iterdir() if f.suffix.lower() in EXTS), key=natural_key)
    if not files:
        if manifest.exists():
            manifest.unlink()
            print(f"{folder.name}: no images, removed images.json")
        return 0

    entries = [{"src": f, "alt": existing[f]} if f in existing else f for f in files]
    manifest.write_text(json.dumps(entries, indent=2) + "\n")
    print(f"{folder.name}: {len(files)} image(s)")
    return len(files)


def main() -> int:
    if not ROOT.is_dir():
        print(f"No project image folder at {ROOT}", file=sys.stderr)
        return 1
    wanted = set(sys.argv[1:])
    folders = sorted(f for f in ROOT.iterdir() if f.is_dir() and (not wanted or f.name in wanted))
    if not folders:
        print("No matching project folders.", file=sys.stderr)
        return 1
    for folder in folders:
        build(folder)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
