#!/bin/bash
# Example hook script for Claude Code
# This script reads hook event data from stdin (JSON) and appends it to a log file
#
# IMPORTANT: Hooks MUST exit with a status code. Common exit codes:
#   0 = Success (allow operation)
#   2 = Block operation (stderr shown to Claude)
#   Other = Non-blocking error (stderr shown to user)

set -euo pipefail

# Configuration
LOG_DIR="$HOME/.claude-code/hooks"

# Ensure directory exists
mkdir -p "$LOG_DIR"

# Read JSON from stdin (passed by Claude Code)
if [ -t 0 ]; then
    # No stdin - cannot determine session ID
    echo "Error: Hook must be called with event data on stdin" >&2
    exit 1
else
    # Read from stdin
    EVENT_JSON=$(cat)
fi

# Extract session ID from the event data (or use CLAUDE_SESSION_ID or generate fallback)
if command -v jq &> /dev/null; then
    SESSION_ID=$(echo "$EVENT_JSON" | jq -r '.session_id // .sessionId // empty')
fi

# Fallback: use environment variable or generate ID
if [ -z "${SESSION_ID:-}" ]; then
    SESSION_ID="${CLAUDE_SESSION_ID:-$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-16)}"
fi

LOG_PATH="$LOG_DIR/$SESSION_ID.jsonl"
META_PATH="$LOG_DIR/$SESSION_ID.meta"

# Write metadata on first run
if [[ ! -f "$META_PATH" ]]; then
    cat > "$META_PATH" <<EOF
{
  "sessionId": "$SESSION_ID",
  "pid": $PPID,
  "startTime": $(date +%s000),
  "cwd": "$(pwd)",
  "user": "$(whoami)"
}
EOF
fi

# Transform Claude Code event format to claude-commander format
if command -v jq &> /dev/null; then
    EVENT_JSON=$(echo "$EVENT_JSON" | jq -c '{
      id: (.id // (now | tostring)),
      eventType: (.hook_event_name // .eventType),
      timestamp: (.timestamp // (now * 1000 | floor)),
      sessionId: (.session_id // .sessionId // "'$SESSION_ID'"),
      transcriptPath: .transcript_path,
      cwd: .cwd,
      permissionMode: (.permission_mode // .permissionMode),
      toolName: (.tool_name // .toolName),
      toolInput: (.tool_input // .toolInput),
      toolResult: (.tool_response // .toolResult),
      prompt: .prompt,
      duration: .duration,
      reason: .reason,
      notificationType: (.notification_type // .notificationType),
      message: .message,
      hookCommand: (.hook_command // .hookCommand),
      hookOutput: (.hook_output // .hookOutput),
      hookExitCode: (.hook_exit_code // .hookExitCode)
    } | with_entries(select(.value != null))')
fi

# Write event to log file (appends to JSONL format)
echo "$EVENT_JSON" >> "$LOG_PATH"

# Exit successfully (exit code 0 = allow operation)
exit 0
