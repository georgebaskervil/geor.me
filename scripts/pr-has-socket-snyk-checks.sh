#!/usr/bin/env bash
# True if the PR has at least one check whose name matches Socket or Snyk.
set -euo pipefail

pr=${1:?PR number required}
repo=${2:-${GITHUB_REPOSITORY:?}}
allow_regex='(?i)(socket|snyk)'

count=$(gh pr checks "$pr" --repo "$repo" --json name --jq \
  --arg re "$allow_regex" '[.[] | select(.name | test($re))] | length')

[[ "$count" -gt 0 ]]
