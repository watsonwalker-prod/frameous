#!/bin/bash
set -euo pipefail
export PATH="/tmp/node-v20.19.2-darwin-arm64/bin:$PATH"
cd "/Users/shea/her-os/30 Portfolio/FRAMEOUS"
# --- HERO_LOCK guard (set HERO_UNLOCK=1 to bypass) ---
if [ "${HERO_UNLOCK:-0}" != "1" ]; then
  L=_fraimous_asset_backups/HERO_LOCK
  [ "$(md5 -q library/mocks/frm_098_hero_v2.mp4)" = "$(awk 'NR==1{print $1}' $L/MANIFEST.md5)" ] || { echo "HERO_LOCK: hero mp4 md5 mismatch, aborting"; exit 1; }
  [ "$(md5 -q library/web/mocks/frm_098_hero_poster_v2.jpg)" = "$(awk 'NR==2{print $1}' $L/MANIFEST.md5)" ] || { echo "HERO_LOCK: hero poster md5 mismatch, aborting"; exit 1; }
  sed -n '/<style id="hero-video">/,/<\/style>/p;/<section class="hero hero--bleed"/,/<\/section>/p' index.html | diff -q - $L/hero_block.html >/dev/null || { echo "HERO_LOCK: index.html hero block differs from lock, aborting"; exit 1; }
  echo "HERO_LOCK: ok"
fi
npx vercel@59.1.4 --prod --yes --scope -s-projects
