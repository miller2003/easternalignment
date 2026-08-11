#!/usr/bin/env bash
# Avatar fetch driver. Network via curl (sandbox-safe); parsing via python (no network).
# Must be run from project root (cwd = easternalignment).
# Usage: _av_fetch.sh <platform> [start] [count]
set -u
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
PY="C:/Users/samja/.workbuddy/binaries/python/versions/3.13.12/python.exe"
PF="${1:-all}"
START="${2:-0}"
COUNT="${3:-999999}"
ok=0; fail=0; idx=-1
while IFS=$'\t' read -r platform fn off base; do
  platform=${platform%$'\r'}; fn=${fn%$'\r'}; off=${off%$'\r'}; base=${base%$'\r'}
  [ "$platform" = "$PF" ] || continue
  idx=$((idx+1))
  if [ "$idx" -lt "$START" ]; then continue; fi
  if [ "$idx" -ge "$((START+COUNT))" ]; then continue; fi
  htmlfile="scratch/_av_page.html"
  offn=$(printf '%s' "$off" | sed 's/[?].*//')
  if ! curl -sSL -A "$UA" "$offn" -o "$htmlfile"; then
    echo "FETCHERR $fn"; fail=$((fail+1)); continue
  fi
  sz=$(wc -c < "$htmlfile")
  if [ "$sz" -lt 1000 ]; then echo "FETCHFAIL($sz) $fn"; fail=$((fail+1)); continue; fi
  IMG=$("$PY" scratch/_avtools.py decode "$htmlfile" "$platform")
  if [ -z "$IMG" ]; then echo "NOIMG $fn"; fail=$((fail+1)); continue; fi
  dest="public/avatars/$platform/$base.__dl"
  code=$(curl -sSL -A "$UA" "$IMG" -o "$dest" -w "%{http_code}")
  dsz=$(wc -c < "$dest" 2>/dev/null || echo 0)
  if [ "$code" != "200" ] || [ "$dsz" -lt 500 ]; then echo "DLFAIL($code,$dsz) $fn"; fail=$((fail+1)); continue; fi
  out=$("$PY" scratch/_avtools.py writefm "src/content/readers/$platform/$fn" "public/avatars/$platform" "$base")
  echo "$out $fn"
  ok=$((ok+1))
done < scratch/_av_manifest.tsv
echo "=== $PF [$START+$COUNT] done: OK=$ok FAIL=$fail ==="
