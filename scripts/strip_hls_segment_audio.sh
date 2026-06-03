#!/bin/bash
# Remux existing HLS MPEG-TS segments to drop audio (video stream copy only).
# Usage: ./scripts/strip_hls_segment_audio.sh [glob_or_dir]
# Default: app/videos/*.m2ts

set -euo pipefail

FFMPEG="${FFMPEG:-ffmpeg}"
if ! command -v "$FFMPEG" >/dev/null 2>&1 && [ -x /opt/homebrew/bin/ffmpeg ]; then
  FFMPEG=/opt/homebrew/bin/ffmpeg
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${1:-$ROOT/app/videos/*.m2ts}"

shopt -s nullglob
files=($TARGET)
shopt -u nullglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No .m2ts files matched: $TARGET"
  exit 1
fi

echo "Stripping audio from ${#files[@]} segment(s) with $FFMPEG"
n=0
for f in "${files[@]}"; do
  tmp="$(mktemp "${f}.XXXXXX")"
  if "$FFMPEG" -y -nostdin -loglevel error -i "$f" -c:v copy -an -f mpegts "$tmp"; then
    mv "$tmp" "$f"
    n=$((n + 1))
  else
    rm -f "$tmp"
    echo "Failed: $f" >&2
    exit 1
  fi
done

echo "Done: $n segment(s) are now video-only."
