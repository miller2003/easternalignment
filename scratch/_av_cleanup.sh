#!/usr/bin/env bash
set -u
removed=0
for d in kasamba purple-garden; do
  for svg in public/avatars/$d/*.svg; do
    [ -f "$svg" ] || continue
    base="${svg%.svg}"
    if [ -f "$base.jpg" ]; then
      rm -f "$svg"
      removed=$((removed+1))
    fi
  done
done
dl=$(find public/avatars -name "*.__dl" | wc -l)
find public/avatars -name "*.__dl" -delete
echo "removed orphan svgs: $removed"
echo "removed temp __dl: $dl"
echo "=== remaining svgs (fallback only) ==="
find public/avatars -name "*.svg"
echo "=== counts ==="
echo "kasamba: $(ls public/avatars/kasamba/ | wc -l)"
echo "purple-garden: $(ls public/avatars/purple-garden/ | wc -l)"
echo "keen: $(ls public/avatars/keen/ | wc -l)"
