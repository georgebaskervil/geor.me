#!/bin/bash
# Generate app/views/videos/*.m3u8.erb from an ffmpeg HLS temp playlist.
# Usage: hls_playlist_to_erb.sh <segment_base> <erb_basename> <temp_playlist.m3u8>

set -euo pipefail

SEGMENT_BASE="$1"
ERB_BASENAME="$2"
TEMP_PLAYLIST="$3"
VIEWS_DIR="${VIEWS_DIR:-app/views/videos}"

cat > "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb" << EOF
<%# filepath: app/views/videos/${ERB_BASENAME}.m3u8.erb %>
#EXTM3U
#EXT-X-VERSION:3
EOF

TARGET_DURATION=$(grep "EXT-X-TARGETDURATION" "$TEMP_PLAYLIST" | cut -d: -f2)
echo "#EXT-X-TARGETDURATION:$TARGET_DURATION" >> "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb"
echo "#EXT-X-MEDIA-SEQUENCE:0" >> "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb"

grep -E "^#EXTINF|^${SEGMENT_BASE}" "$TEMP_PLAYLIST" | while IFS= read -r line; do
  if [[ $line == \#EXTINF* ]]; then
    echo "$line" >> "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb"
  else
    segment_name=$(basename "$line")
    echo "<%= vite_asset_path(\"~/videos/$segment_name\") %>" >> "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb"
  fi
done

echo "#EXT-X-ENDLIST" >> "$VIEWS_DIR/${ERB_BASENAME}.m3u8.erb"
