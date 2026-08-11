#!/usr/bin/env bash
# Retry driver for failed readers. Tries each candidate image URL with delays.
# Usage: _av_retry.sh <manifest_tsv>
set -u
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
PY="C:/Users/samja/.workbuddy/binaries/python/versions/3.13.12/python.exe"
MAN="${1:-scratch/_retry.tsv}"
ok=0; fail=0
while IFS=$'\t' read -r platform fn off base; do
  platform=${platform%$'\r'}; fn=${fn%$'\r'}; off=${off%$'\r'}; base=${base%$'\r'}
  htmlfile="scratch/_av_page.html"
  offn=$(printf '%s' "$off" | sed 's/[?].*//')
  sleep 2
  if ! curl -sSL -A "$UA" "$offn" -o "$htmlfile"; then
    echo "FETCHERR $fn"; fail=$((fail+1)); continue
  fi
  sz=$(wc -c < "$htmlfile")
  if [ "$sz" -lt 1000 ]; then echo "FETCHFAIL($sz) $fn"; fail=$((fail+1)); continue; fi
  got=0
  while IFS= read -r IMG; do
    IMG=${IMG%$'\r'}
    [ -z "$IMG" ] && continue
    dest="public/avatars/$platform/$base.__dl"
    code=$(curl -sSL -A "$UA" "$IMG" -o "$dest" -w "%{http_code}")
    dsz=$(wc -c < "$dest" 2>/dev/null || echo 0)
    if [ "$code" = "200" ] && [ "$dsz" -ge 500 ]; then
      out=$("$PY" scratch/_avtools.py writefm "src/content/readers/$platform/$fn" "public/avatars/$platform" "$base")
      echo "$out $fn"
      ok=$((ok+1)); got=1; break
    fi
  done < <("$PY" scratch/_avtools.py decode "$htmlfile" "$platform")
  if [ "$got" -eq 0 ]; then echo "NOIMG/DLFAIL $fn"; fail=$((fail+1)); fi
done < "$MAN"
echo "=== retry done: OK=$ok FAIL=$fail ==="
