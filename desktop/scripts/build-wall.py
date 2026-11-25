"""Builds the welcome-wall covers from real pipeline output.

    python3 desktop/scripts/build-wall.py <pipeline-data-dir> <ffmpeg>

Each cover is the poster of a vertical clip the Clipfarm pipeline rendered
from an openly licensed film. The film, author, licence and source page are
recorded per cover in public/wall/manifest.json; the welcome screen shows a
cover only when that record is complete (see src/desktop/onboarding/Wall.tsx).
"""

from __future__ import annotations

import json
import sqlite3
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public" / "wall"

FILMS = {
    "tears-of-steel": {
        "title": "Tears of Steel",
        "author": "Blender Foundation",
        "url": "https://commons.wikimedia.org/wiki/File:Tears_of_Steel_1080p.webm",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    },
    "sintel": {
        "title": "Sintel",
        "author": "Blender Foundation (Durian Open Movie project)",
        "url": "https://commons.wikimedia.org/wiki/File:Sintel_movie_4K.webm",
        "license": "CC BY 3.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/3.0/",
    },
    "sprite-fright": {
        "title": "Sprite Fright",
        "author": "Blender Studio",
        "url": "https://commons.wikimedia.org/wiki/File:Sprite_Fright_-_Blender_Open_Movie-full_movie.webm",
        "license": "CC BY 4.0",
        "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
    },
}


def main(data_dir: str, ffmpeg: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    rows = sqlite3.connect(Path(data_dir) / "pipeline.sqlite3").execute("SELECT id, url FROM jobs WHERE status='done'").fetchall()
    covers = []
    for job_id, url in rows:
        film = Path(url).stem
        if film not in FILMS:
            continue
        for clip_dir in sorted((Path(data_dir) / "jobs" / job_id / "clips").iterdir()):
            poster = clip_dir / "poster.jpg"
            meta = json.loads((clip_dir / "clip.json").read_text("utf-8")) if (clip_dir / "clip.json").exists() else {}
            if not poster.exists():
                continue
            name = f"{film}-{clip_dir.name}.jpg"
            subprocess.run([ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(poster), "-vf", "scale=360:640:flags=lanczos", "-q:v", "4", str(OUT / name)], check=True)
            covers.append({
                "id": f"{film}-{clip_dir.name}",
                "image": f"/wall/{name}",
                "title": meta.get("title") or FILMS[film]["title"],
                "source": FILMS[film],
                "permission": {"type": "open-licence"},
            })
    manifest = {
        "version": 1,
        "note": "Welcome-wall covers. Add a streamer's cover only with written permission: permission = {type: 'written', grantedBy, date, reference}. Open-licence covers need source.license and source.licenseUrl.",
        "covers": covers,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", "utf-8")
    print(f"{len(covers)} covers from {len({c['source']['title'] for c in covers})} films")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "ffmpeg")
