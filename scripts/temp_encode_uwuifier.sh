#!/bin/bash

# Temporary script to encode uwuifier video (no audio)
set -e

INPUT_VIDEO="uwifier_sped_up.mp4"
OUTPUT_NAME="uwuifier"
SEGMENTS_DIR="app/videos"
VIEWS_DIR="app/views/videos"

# Create directories if they don't exist
mkdir -p "$SEGMENTS_DIR"
mkdir -p "$VIEWS_DIR"

echo "🎬 Encoding video with blurred background: $INPUT_VIDEO -> $OUTPUT_NAME"
echo "📁 Output segments: $SEGMENTS_DIR"
echo "📄 Output playlist: $VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"

# FFmpeg encoding for video-only file with blurred background
ffmpeg -i "$INPUT_VIDEO" \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -f hls \
  -hls_time 8 \
  -hls_list_size 0 \
  -hls_segment_type mpegts \
  -hls_segment_filename "$SEGMENTS_DIR/${OUTPUT_NAME}-optimised%d.m2ts" \
  -hls_playlist_type vod \
  -movflags +faststart \
  -profile:v high \
  -level 4.0 \
  -maxrate 5M \
  -bufsize 10M \
  -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,boxblur=luma_radius=min(h\,w)/20:luma_power=1:chroma_radius=min(cw\,ch)/20:chroma_power=1[bg];[0:v]scale=1280:720:force_original_aspect_ratio=decrease[ov];[bg][ov]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2,format=yuv420p[v]" \
  -map "[v]" \
  temp_playlist.m3u8

# Generate ERB template from the FFmpeg output
echo "📝 Generating ERB template..."

cat > "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb" << 'EOF'
<%# filepath: app/views/videos/uwuifier.m3u8.erb %>
#EXTM3U
#EXT-X-VERSION:3
EOF

# Extract target duration and add it to the template
TARGET_DURATION=$(grep "EXT-X-TARGETDURATION" temp_playlist.m3u8 | cut -d: -f2)
echo "#EXT-X-TARGETDURATION:$TARGET_DURATION" >> "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"
echo "#EXT-X-MEDIA-SEQUENCE:0" >> "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"

# Process each segment line and convert to ERB format
grep -E "^#EXTINF|^${OUTPUT_NAME}" temp_playlist.m3u8 | while IFS= read -r line; do
  if [[ $line == \#EXTINF* ]]; then
    echo "$line" >> "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"
  else
    # Convert filename to vite_asset_path format
    segment_name=$(basename "$line")
    echo "<%= vite_asset_path(\"~/videos/$segment_name\") %>" >> "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"
  fi
done

# Add end list marker
echo "#EXT-X-ENDLIST" >> "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"

# Clean up temporary files
rm -f temp_playlist.m3u8

# Count generated segments
SEGMENT_COUNT=$(ls -1 "$SEGMENTS_DIR/${OUTPUT_NAME}-optimised"*.m2ts 2> /dev/null | wc -l | tr -d ' ')

echo "✅ Encoding complete with blurred background!"
echo "📊 Generated $SEGMENT_COUNT segments"
echo "📄 Template: $VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"
echo ""
echo "🎨 This version uses a blurred, scaled version of the video itself as the background"
echo "   for any letterboxing areas instead of solid black bars."
