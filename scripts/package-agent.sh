#!/bin/bash
# Usage: ./scripts/package-agent.sh <agent-id>
# Example: ./scripts/package-agent.sh thread-writer
# Output: dist/agent-<agent-id>.tar.gz

set -euo pipefail

AGENT_ID="${1:?Usage: $0 <agent-id>}"
AGENT_DIR="agents/${AGENT_ID}"
DIST_DIR="dist"

if [ ! -d "$AGENT_DIR" ]; then
  echo "Error: Agent directory '$AGENT_DIR' not found"
  exit 1
fi

if [ ! -f "$AGENT_DIR/SKILL.md" ]; then
  echo "Error: SKILL.md not found in '$AGENT_DIR'"
  exit 1
fi

mkdir -p "$DIST_DIR"

tar -czf "${DIST_DIR}/agent-${AGENT_ID}.tar.gz" -C "$AGENT_DIR" .

echo "Packaged: ${DIST_DIR}/agent-${AGENT_ID}.tar.gz"
