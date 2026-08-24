#!/usr/bin/env bash
# One-time conversion of the SponsorsSection scroll-scrub frame sequence:
# 240 lossless RGBA PNGs (272MB) -> 120 opaque JPEGs.
# Takes every other source frame (odd-numbered) and renumbers 1..120 sequentially.
# Re-run into a fresh output dir (bump the _vN suffix) rather than overwriting in
# place, since the directory name is what busts the immutable Cache-Control header.

set -euo pipefail

SRC_DIR="public/assets/images/Heclura_Desk_Frames"
DST_DIR="public/assets/images/Heclura_Desk_Frames_v2"

mkdir -p "$DST_DIR"

n=1
for i in $(seq 1 2 239); do
  src=$(printf "%s/frame_%03d.png" "$SRC_DIR" "$i")
  dst=$(printf "%s/frame_%03d.jpg" "$DST_DIR" "$n")
  ffmpeg -y -loglevel error -i "$src" -vf "format=yuvj420p" -q:v 4 "$dst"
  n=$((n + 1))
done

echo "Converted $((n - 1)) frames into $DST_DIR"
du -sh "$DST_DIR"
