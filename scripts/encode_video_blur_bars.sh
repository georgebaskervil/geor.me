#!/bin/bash

# Advanced Video Encoding Script for HLS Streaming with Blurred Bar Background
# Usage: ./encode_video_blur_bars.sh input_video.mp4 output_name
# Example: ./encode_video_blur_bars.sh my_video.mp4 my_project

set -e

if [ $# -ne 2 ]; then
  echo "Usage: $0 <input_video> <output_name>"
  echo "Example: $0 input.mp4 my_project"
  exit 1
fi

INPUT_VIDEO="$1"
OUTPUT_NAME="$2"
SEGMENTS_DIR="app/videos"
VIEWS_DIR="app/views/videos"

# Check if input file exists
if [ ! -f "$INPUT_VIDEO" ]; then
  echo "Error: Input video '$INPUT_VIDEO' not found!"
  exit 1
fi

# Create directories if they don't exist
mkdir -p "$SEGMENTS_DIR"
mkdir -p "$VIEWS_DIR"

echo "🎬 Encoding video with blurred background: $INPUT_VIDEO -> $OUTPUT_NAME"
echo "📁 Output segments: $SEGMENTS_DIR"
echo "📄 Output playlist: $VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"

# Advanced FFmpeg encoding with blurred background for letterboxing
# This creates a blurred, scaled version of the video as background for the bars
ffmpeg -i "$INPUT_VIDEO" \
  -c:v libx264 \
  -preset slow \
  -crf 18 \
  -c:a aac \
  -b:a 192k \
  -ac 2 \
  -ar 44100 \
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
  -map 0:a \
  temp_playlist.m3u8

# Generate ERB template from the FFmpeg output
echo "📝 Generating ERB template..."

cat > "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb" << 'EOF'
<%# filepath: app/views/videos/OUTPUT_NAME.m3u8.erb %>
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

# Update the filepath comment in the template
sed -i '' "s/OUTPUT_NAME/${OUTPUT_NAME}/g" "$VIEWS_DIR/${OUTPUT_NAME}.m3u8.erb"

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
echo ""
echo "🔧 Next steps:"
echo "1. Add a controller method in app/controllers/videos_controller.rb:"
echo "   def ${OUTPUT_NAME}"
echo "     respond_to do |format|"
echo "       format.m3u8 { render content_type: 'application/x-mpegURL' }"
echo "     end"
echo "   end"
echo ""
echo "2. Add a route in config/routes.rb:"
echo "   get \"/streaming/${OUTPUT_NAME}_video\", to: \"videos#${OUTPUT_NAME}\", defaults: { format: :m3u8 }"
echo ""
echo "3. Use in your carousel:"
echo "   demo_url: \"/streaming/${OUTPUT_NAME}_video\""
