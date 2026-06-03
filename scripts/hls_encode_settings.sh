# Shared HLS encode defaults — source from encode/reencode scripts.
# Visibly crunchy “potato” tier for meme-tier distraction/carousel clips.

HLS_SCALE_W="${HLS_SCALE_W:-426}"
HLS_SCALE_H="${HLS_SCALE_H:-240}"
HLS_CRF="${HLS_CRF:-34}"
HLS_PRESET="${HLS_PRESET:-ultrafast}"
HLS_MAXRATE="${HLS_MAXRATE:-350k}"
HLS_BUFSIZE="${HLS_BUFSIZE:-700k}"
HLS_PROFILE="${HLS_PROFILE:-baseline}"
HLS_LEVEL="${HLS_LEVEL:-3.0}"
HLS_GOP="${HLS_GOP:-48}"

# Downscale filter (neighbor = chunkier pixels when blown up in the UI)
HLS_VF_SCALE="scale=${HLS_SCALE_W}:${HLS_SCALE_H}:force_original_aspect_ratio=decrease:flags=neighbor"
