# Video Encoding Guide for HLS Streaming

This guide explains how to encode videos for your Rails HLS streaming system.

## Prerequisites

You need **FFmpeg** installed on your system:

```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Windows (with Chocolatey)
choco install ffmpeg
```

## Quick Start

1. **Use the encoding script** (recommended):

   ```bash
   ./scripts/encode_video.sh input_video.mp4 my_project
   ```

2. **Manual encoding** (for custom settings):

   ```bash
   ffmpeg -i input_video.mp4 \
     -c:v libx264 -preset medium -crf 23 \
     -c:a aac -b:a 128k \
     -f hls -hls_time 8 \
     -hls_segment_filename "app/videos/my_project-optimised%d.m2ts" \
     -vf "scale=1280:720:force_original_aspect_ratio=decrease" \
     temp_playlist.m3u8
   ```

## Encoding Settings Explained

### Video Settings

- **Codec**: `libx264` - Best compatibility across browsers
- **Preset**: `slow` - Higher quality compression (slower encoding)
- **CRF**: `18` - Constant Rate Factor (lower = higher quality)
- **Profile**: `high` - Better compression than baseline
- **Resolution**: `1280x720` - Good for web streaming
- **Bitrate**: `5M max` - Higher bitrate for better quality
- **Level**: `4.0` - Supports higher bitrates and resolutions

### Audio Settings

- **Codec**: `aac` - Standard for web
- **Bitrate**: `192k` - Higher quality for web
- **Channels**: `2` (stereo)
- **Sample Rate**: `44100 Hz`

### HLS Settings

- **Segment Duration**: `8 seconds` - Good balance for seeking vs overhead
- **Container**: `mpegts` (.m2ts) - Required for HLS
- **Playlist Type**: `vod` (Video on Demand)

## File Structure

After encoding, you'll have:

```text
app/
├── videos/                          # Video segments (served by Vite)
│   ├── my_project-optimised0.m2ts
│   ├── my_project-optimised1.m2ts
│   └── ...
└── views/videos/                    # ERB templates
    └── my_project.m3u8.erb
```

## Adding New Videos to Your App

### 1. Encode the Video

```bash
./scripts/encode_video.sh my_awesome_video.mp4 awesome_project
```

### 2. Add Controller Method

Edit `app/controllers/videos_controller.rb`:

```ruby
def awesome_project
  respond_to do |format|
    format.m3u8 { render content_type: "application/x-mpegURL" }
  end
end
```

### 3. Add Route

Edit `config/routes.rb`:

```ruby
get "/streaming/awesome_project_video", to: "videos#awesome_project", defaults: { format: :m3u8 }
```

### 4. Use in Carousel

Edit `app/views/homepage/index.html.erb`:

```erb
{
  title: "My Awesome Project",
  demo_url: "/streaming/awesome_project_video",
  description: "Description of your awesome project.",
  type: "video"
}
```

## Optimization Tips

### For Smaller File Sizes

- Increase CRF value: `-crf 28` (lower quality, smaller files)
- Use faster preset: `-preset fast`
- Lower resolution: `-vf "scale=960:540"`

### For Higher Quality

- Decrease CRF value: `-crf 18` (higher quality, larger files)
- Use slower preset: `-preset slow`
- Higher bitrate: `-maxrate 4M -bufsize 8M`

### For Mobile Optimization

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset medium -crf 25 \
  -c:a aac -b:a 96k \
  -vf "scale=854:480" \
  -maxrate 1M -bufsize 2M \
  -f hls -hls_time 6 \
  output.m3u8
```

## Troubleshooting

### Video Won't Play

- Check browser console for HLS errors
- Verify M3U8 endpoint returns correct MIME type
- Ensure video segments are accessible via Vite

### Segments Not Found (404 errors)

- Check that `.m2ts` files are in `app/videos/`
- Verify `vite_asset_path` URLs in browser network tab
- Restart Vite dev server: `bin/dev`

### Poor Quality/Large Files

- Adjust CRF value (23 is default)
- Check input video resolution
- Consider two-pass encoding for better compression

## Advanced: Two-Pass Encoding

For better compression (slower but smaller files):

```bash
# Pass 1
ffmpeg -i input.mp4 -c:v libx264 -preset slow -b:v 1M -pass 1 -f null /dev/null

# Pass 2
ffmpeg -i input.mp4 -c:v libx264 -preset slow -b:v 1M -pass 2 \
  -c:a aac -b:a 128k -f hls -hls_time 8 \
  -hls_segment_filename "segments%d.m2ts" \
  output.m3u8
```

## Example: Complete Workflow

```bash
# 1. Encode video
./scripts/encode_video.sh ~/Downloads/my_demo.mov portfolio_demo

# 2. Add to controller (manual step)
# 3. Add route (manual step)
# 4. Add to carousel (manual step)

# 5. Test
curl http://localhost:5000/streaming/portfolio_demo_video
```

The script handles steps 1, generates templates, and provides instructions for steps 2-4!
