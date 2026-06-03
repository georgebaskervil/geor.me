#!/usr/bin/env bash
# Wait for PR checks before Dependabot auto-merge.
# Only Socket and Snyk gate merge; all other checks are ignored.
set -euo pipefail

pr=${1:?PR number required}
repo=${2:-${GITHUB_REPOSITORY:?}}
timeout_minutes=${3:-30}
poll_seconds=${POLL_SECONDS:-20}
allow_regex='(?i)(socket|snyk)'
stall_polls=${STALL_POLLS:-15}
max_polls=${MAX_POLLS:-120}

deadline=$(( $(date +%s) + timeout_minutes * 60 ))
last_signature=""
unchanged_polls=0
poll=0

while [[ $(date +%s) -lt $deadline && poll -lt $max_polls ]]; do
  poll=$((poll + 1))

  if ! checks_json=$(gh pr checks "$pr" --repo "$repo" --json name,state 2>&1); then
    echo "gh pr checks failed: $checks_json"
    sleep "$poll_seconds"
    continue
  fi

  mapfile -t summary < <(
    echo "$checks_json" | jq -r --arg re "$allow_regex" \
      '.[] | select(.name | test($re)) | "\(.name)\t\(.state)"'
  )

  if [[ ${#summary[@]} -eq 0 || -z "${summary[0]:-}" ]]; then
    echo "No Socket/Snyk checks on PR #$pr; nothing to wait on"
    exit 0
  fi

  signature=$(printf '%s\n' "${summary[@]}" | LC_ALL=C sort | cksum | awk '{print $1}')

  pending=0
  failed=0
  for line in "${summary[@]}"; do
    state=${line##*$'\t'}
    name=${line%%$'\t'*}
    case $state in
      SUCCESS | SKIPPED | NEUTRAL) ;;
      FAILURE | ERROR | CANCELLED | TIMED_OUT | ACTION_REQUIRED)
        failed=1
        echo "✗ $name: $state"
        ;;
      *)
        pending=1
        echo "… $name: $state"
        ;;
    esac
  done

  if [[ $pending -eq 0 ]]; then
    if [[ $failed -eq 1 ]]; then
      echo "PR #$pr has failing Socket/Snyk checks:"
      gh pr checks "$pr" --repo "$repo"
      exit 1
    fi
    echo "PR #$pr Socket/Snyk checks ready"
    exit 0
  fi

  if [[ "$signature" == "$last_signature" ]]; then
    unchanged_polls=$((unchanged_polls + 1))
    if [[ $unchanged_polls -ge $stall_polls ]]; then
      echo "PR #$pr Socket/Snyk checks unchanged for $((stall_polls * poll_seconds))s with work still pending; stopping wait"
      gh pr checks "$pr" --repo "$repo" || true
      exit 1
    fi
  else
    unchanged_polls=0
    last_signature=$signature
  fi

  sleep "$poll_seconds"
done

echo "Stopped waiting for PR #$pr (timeout ${timeout_minutes}m or ${max_polls} polls)"
gh pr checks "$pr" --repo "$repo" || true
exit 1
