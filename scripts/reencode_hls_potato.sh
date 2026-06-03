#!/bin/bash
# Re-crush existing HLS segments to potato quality (no source MP4 required).
# Usage: ./scripts/reencode_hls_potato.sh [segment_base ...]
# With no args, re-encodes all *-optimised segment sets in app/videos/.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/hls_encode_settings.sh
source "$ROOT/scripts/hls_encode_settings.sh"

SEGMENTS_DIR="app/videos"
VIEWS_DIR="app/views/videos"
FFMPEG="${FFMPEG:-ffmpeg}"
if ! command -v "$FFMPEG" >/dev/null 2>&1 && [[ -x /opt/homebrew/bin/ffmpeg ]]; then
  FFMPEG=/opt/homebrew/bin/ffmpeg
fi

erb_basename_for() {
  local base="$1"
  if [[ -f "$VIEWS_DIR/${base}_optimised.m3u8.erb" ]]; then
    echo "${base}_optimised"
  elif [[ -f "$VIEWS_DIR/${base}.m3u8.erb" ]]; then
    echo "$base"
  else
    echo "${base}_optimised"
  fi
}

reencode_one() {
  local base="$1"
  local erb_name
  erb_name="$(erb_basename_for "$base")"
  local pattern="${SEGMENTS_DIR}/${base}-optimised"
  shopt -s nullglob
  local segments=(${pattern}*.m2ts)
  shopt -u nullglob

  if [[ ${#segments[@]} -eq 0 ]]; then
    echo "Skip $base: no ${base}-optimised*.m2ts segments"
    return 0
  fi

  echo "🥔 Potato re-encode: $base (${#segments[@]} segments) → ${HLS_SCALE_W}x${HLS_SCALE_H} crf=${HLS_CRF}"

  local concat_list
  concat_list="$(mktemp)"
  local tmpdir
  tmpdir="$(mktemp -d)"
  local temp_playlist="$tmpdir/playlist.m3u8"

  for seg in "${segments[@]}"; do
    printf "file '%s'\n" "$ROOT/$seg" >> "$concat_list"
  done

  "$FFMPEG" -y -nostdin -f concat -safe 0 -i "$concat_list" -an \
    -vf "${HLS_VF_SCALE},pad=${HLS_SCALE_W}:${HLS_SCALE_H}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p" \
    -c:v libx264 \
    -preset "$HLS_PRESET" \
    -crf "$HLS_CRF" \
    -profile:v "$HLS_PROFILE" \
    -level "$HLS_LEVEL" \
    -maxrate "$HLS_MAXRATE" \
    -bufsize "$HLS_BUFSIZE" \
    -g "$HLS_GOP" \
    -keyint_min "$HLS_GOP" \
    -sc_threshold 0 \
    -f hls \
    -hls_time 8 \
    -hls_list_size 0 \
    -hls_segment_type mpegts \
    -hls_segment_filename "$tmpdir/${base}-optimised%d.m2ts" \
    -hls_playlist_type vod \
    "$temp_playlist"

  rm -f "${pattern}"*.m2ts
  mv "$tmpdir"/${base}-optimised*.m2ts "$SEGMENTS_DIR/"

  bash "$ROOT/scripts/hls_playlist_to_erb.sh" "$base" "$erb_name" "$temp_playlist"

  rm -f "$concat_list"
  rm -rf "$tmpdir"

  local count
  count=$(ls -1 "${pattern}"*.m2ts 2>/dev/null | wc -l | tr -d ' ')
  echo "   Done: $count segments, playlist $VIEWS_DIR/${erb_name}.m3u8.erb"
}

if [[ $# -gt 0 ]]; then
  bases=("$@")
else
  bases=()
  for f in "$SEGMENTS_DIR"/*-optimised0.m2ts; do
    [[ -e "$f" ]] || continue
    bases+=("$(basename "$f" | sed 's/-optimised0\.m2ts$//')")
  done
fi

for base in "${bases[@]}"; do
  reencode_one "$base"
done

echo "✅ Potato re-encode complete."
