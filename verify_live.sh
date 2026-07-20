#!/bin/bash
# Batch 11 Part A workflow fix: "pushed" is not "live". This script is the required
# final step of every deploy — it fails loudly until the LIVE site serves the local
# sw.js version, and surfaces a failed GitHub Pages build instead of letting it rot
# (the batch-10 v37 build failed on a GitHub 503 and nobody noticed until the owner
# saw stale UI). Run: ./verify_live.sh [timeout_seconds]
set -u
LOCAL=$(grep -o 'hashmark-v[0-9]*' sw.js | head -1)
TIMEOUT=${1:-600}
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  LIVE=$(curl -s -m 10 https://hash-mark.com/sw.js | grep -o 'hashmark-v[0-9]*' | head -1)
  if [ "$LIVE" = "$LOCAL" ]; then
    echo "LIVE OK: hash-mark.com serves $LIVE"
    exit 0
  fi
  sleep 15
  ELAPSED=$((ELAPSED+15))
done
echo "DEPLOY NOT LIVE after ${TIMEOUT}s: local=$LOCAL live=$LIVE"
echo "Last Pages builds:"
gh run list --limit 3 2>/dev/null || true
gh api repos/:owner/:repo/pages/builds/latest --jq '{status,error:.error.message}' 2>/dev/null || true
echo "If the build failed on GitHub-side flake: gh api -X POST repos/:owner/:repo/pages/builds"
exit 1
