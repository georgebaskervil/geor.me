"""Fast Gecko-profile loader.

Strategy:
  1. If a fresh pickle cache exists (newer than the JSON), load that — instant.
  2. Else parse the JSON with ujson (≈3-5x faster than stdlib for big files)
     and write a pickle cache next to it.
"""
from __future__ import annotations

import os
import pickle
import sys
import time
from pathlib import Path


def load_profile(path: str | Path) -> dict:
    p = Path(path)
    cache = p.with_suffix(p.suffix + ".pkl")
    try:
        if cache.exists() and cache.stat().st_mtime >= p.stat().st_mtime:
            t0 = time.perf_counter()
            with cache.open("rb") as f:
                data = pickle.load(f)
            print(f"[loader] pickle cache hit ({cache.name}) in {time.perf_counter()-t0:.2f}s",
                  file=sys.stderr)
            return data
    except Exception as e:
        print(f"[loader] cache read failed: {e}", file=sys.stderr)

    try:
        import ujson as _json  # type: ignore
        impl = "ujson"
    except ImportError:
        import json as _json
        impl = "stdlib json"

    t0 = time.perf_counter()
    with p.open("rb") as f:
        data = _json.loads(f.read())
    print(f"[loader] parsed {p.name} with {impl} in {time.perf_counter()-t0:.2f}s",
          file=sys.stderr)

    try:
        t0 = time.perf_counter()
        with cache.open("wb") as f:
            pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
        print(f"[loader] wrote pickle cache in {time.perf_counter()-t0:.2f}s",
              file=sys.stderr)
    except Exception as e:
        print(f"[loader] cache write failed: {e}", file=sys.stderr)
    return data
