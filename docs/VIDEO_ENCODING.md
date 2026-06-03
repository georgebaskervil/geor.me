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
     -an \
     -f hls -hls_time 8 \
     -hls_segment_filename "app/videos/my_project-optimised%d.m2ts" \
     -vf "scale=1280:720:force_original_aspect_ratio=decrease" \
     temp_playlist.m3u8
   ```

## Encoding Settings Explained

### Video Settings (default: potato tier)

Defaults live in `scripts/hls_encode_settings.sh` (sourced by all encode scripts):

- **Resolution**: `426×240` — chunky when blown up in distraction windows / carousel
- **CRF**: `34`, **preset**: `ultrafast`, **maxrate**: `350k`
- **Scale flags**: `neighbor` for blockier downscale
- Override per run: `HLS_CRF=30 HLS_SCALE_W=640 ./scripts/encode_video_blur_bars.sh …`

Re-crush existing segments without source MP4s:

```bash
chmod +x scripts/reencode_hls_potato.sh scripts/hls_playlist_to_erb.sh
./scripts/reencode_hls_potato.sh
# or: ./scripts/reencode_hls_potato.sh soapcarving gta
```

### Audio

Segments are **video-only** (`-an`). Players use `muted` on `<video>` for autoplay. To remux existing `.m2ts` files:

```bash
chmod +x scripts/strip_hls_segment_audio.sh
./scripts/strip_hls_segment_audio.sh
```

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
  -an \
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
  -an -f hls -hls_time 8 \
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
