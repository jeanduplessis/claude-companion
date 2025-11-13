#!/bin/bash
# Claude Companion Wrapper Hook Script
#
# This script acts as a comprehensive wrapper for Claude Code hooks, capturing:
# 1. Hook INPUT from Claude Code (stdin JSON)
# 2. Hook OUTPUT from your custom hook logic (stdout/stderr/exit code)
# 3. Complete hook execution metadata
#
# Setup Instructions:
# 1. Copy this script to a location like ~/.config/claude-code/
# 2. Make it executable: chmod +x claude-companion-wrapper.sh
# 3. Configure Claude Code hooks to call this wrapper
# 4. Optionally set CUSTOM_HOOK_SCRIPT to delegate to your own hook logic
#
# Configuration via environment variables or inline:
#   CUSTOM_HOOK_SCRIPT - Path to your custom hook script (optional)
#   LOG_DIR - Directory for logs (default: ~/.claude-code/hooks)

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Where to store hook logs
LOG_DIR="${LOG_DIR:-$HOME/.claude-code/hooks}"

# Optional: Path to your custom hook script that should run after logging
# This allows you to:
# 1. Log all events to claude-companion
# 2. Still run your custom hook logic
# 3. Capture the custom hook's response
#
# Example: CUSTOM_HOOK_SCRIPT="$HOME/.config/claude-code/my-custom-hook.sh"
CUSTOM_HOOK_SCRIPT="${CUSTOM_HOOK_SCRIPT:-}"

# ============================================================================
# Utility Functions
# ============================================================================

log_debug() {
    if [[ "${DEBUG:-}" == "1" ]]; then
        echo "[DEBUG] $*" >&2
    fi
}

# ============================================================================
# Read Hook Input from Claude Code
# ============================================================================

# Ensure directory exists
mkdir -p "$LOG_DIR"

# Read JSON from stdin (passed by Claude Code)
if [ -t 0 ]; then
    # No stdin - cannot process hook
    echo "Error: Hook must be called with event data on stdin" >&2
    exit 1
fi

# Read and preserve the full input
EVENT_JSON=$(cat)
log_debug "Received event JSON: $EVENT_JSON"

# ============================================================================
# Extract Session Information
# ============================================================================

# Extract session ID from the event data
if command -v jq &> /dev/null; then
    SESSION_ID=$(echo "$EVENT_JSON" | jq -r '.session_id // .sessionId // empty')
    HOOK_EVENT_NAME=$(echo "$EVENT_JSON" | jq -r '.hook_event_name // .eventType // empty')
else
    # Fallback without jq (less reliable)
    SESSION_ID=$(echo "$EVENT_JSON" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -z "$SESSION_ID" ]; then
        SESSION_ID=$(echo "$EVENT_JSON" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4 || echo "")
    fi
    HOOK_EVENT_NAME=$(echo "$EVENT_JSON" | grep -o '"hook_event_name":"[^"]*"' | cut -d'"' -f4 || echo "")
    if [ -z "$HOOK_EVENT_NAME" ]; then
        HOOK_EVENT_NAME=$(echo "$EVENT_JSON" | grep -o '"eventType":"[^"]*"' | cut -d'"' -f4 || echo "")
    fi
fi

# Fallback: use environment variable or generate ID
if [ -z "${SESSION_ID:-}" ]; then
    SESSION_ID="${CLAUDE_SESSION_ID:-$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-16)}"
fi

LOG_PATH="$LOG_DIR/$SESSION_ID.jsonl"
META_PATH="$LOG_DIR/$SESSION_ID.meta"

log_debug "Session ID: $SESSION_ID"
log_debug "Hook Event: $HOOK_EVENT_NAME"
log_debug "Log Path: $LOG_PATH"

# ============================================================================
# Write Session Metadata (first run only)
# ============================================================================

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
    log_debug "Created metadata file: $META_PATH"
fi

# ============================================================================
# Execute Custom Hook (if configured)
# ============================================================================

HOOK_OUTPUT=""
HOOK_STDERR=""
HOOK_EXIT_CODE=0
HOOK_RESPONSE_JSON=""

if [[ -n "$CUSTOM_HOOK_SCRIPT" ]] && [[ -f "$CUSTOM_HOOK_SCRIPT" ]]; then
    log_debug "Executing custom hook: $CUSTOM_HOOK_SCRIPT"

    # Create temporary files for capturing output
    STDOUT_FILE=$(mktemp)
    STDERR_FILE=$(mktemp)

    # Execute custom hook, passing the event JSON via stdin
    set +e
    echo "$EVENT_JSON" | "$CUSTOM_HOOK_SCRIPT" >"$STDOUT_FILE" 2>"$STDERR_FILE"
    HOOK_EXIT_CODE=$?
    set -e

    # Read captured output
    HOOK_OUTPUT=$(cat "$STDOUT_FILE")
    HOOK_STDERR=$(cat "$STDERR_FILE")

    # Clean up temp files
    rm -f "$STDOUT_FILE" "$STDERR_FILE"

    log_debug "Custom hook exit code: $HOOK_EXIT_CODE"
    log_debug "Custom hook stdout: $HOOK_OUTPUT"
    log_debug "Custom hook stderr: $HOOK_STDERR"

    # Try to parse hook output as JSON (if it's structured output)
    if command -v jq &> /dev/null && [[ -n "$HOOK_OUTPUT" ]]; then
        if echo "$HOOK_OUTPUT" | jq empty 2>/dev/null; then
            HOOK_RESPONSE_JSON="$HOOK_OUTPUT"
            log_debug "Parsed hook response as JSON"
        fi
    fi
fi

# ============================================================================
# Transform and Enrich Event Data
# ============================================================================

if command -v jq &> /dev/null; then
    # Skip PreToolUse events to avoid duplicates (PostToolUse has all the data)
    if [[ "$HOOK_EVENT_NAME" == "PreToolUse" ]]; then
        log_debug "Skipping PreToolUse event to avoid duplicate"
        exit 0
    fi

    # Transform Claude Code event format to claude-companion format
    # and add hook execution metadata
    ENRICHED_EVENT=$(echo "$EVENT_JSON" | jq -c \
        --arg hook_cmd "$CUSTOM_HOOK_SCRIPT" \
        --arg hook_out "$HOOK_OUTPUT" \
        --argjson hook_exit "$HOOK_EXIT_CODE" \
        --argjson hook_resp "${HOOK_RESPONSE_JSON:-null}" \
        '{
            id: (.id // (now | tostring)),
            eventType: (
                (.hook_event_name // .eventType) |
                if . == "PostToolUse" then "ToolUse" else . end
            ),
            timestamp: (.timestamp // (now * 1000 | floor)),
            sessionId: (.session_id // .sessionId // "'$SESSION_ID'"),
            transcriptPath: .transcript_path,
            cwd: .cwd,
            permissionMode: (.permission_mode // .permissionMode),

            # Tool-specific fields (PreToolUse, PostToolUse)
            toolName: (.tool_name // .toolName),
            toolInput: (.tool_input // .toolInput),
            toolResult: (.tool_response // .toolResult),

            # Prompt field (UserPromptSubmit)
            prompt: .prompt,

            # Stop fields
            reason: .reason,
            stopHookActive: (.stop_hook_active // .stopHookActive),

            # Notification fields
            notificationType: (.notification_type // .notificationType),
            message: .message,

            # PreCompact fields
            trigger: .trigger,
            customInstructions: (.custom_instructions // .customInstructions),

            # SessionStart fields
            source: .source,

            # Hook execution metadata
            hookCommand: (if $hook_cmd != "" then $hook_cmd else null end),
            hookOutput: (if $hook_out != "" then $hook_out else null end),
            hookExitCode: $hook_exit,
            hookResponse: $hook_resp
        } | with_entries(select(.value != null))')
else
    # Without jq, use the original event with basic enrichment
    ENRICHED_EVENT="$EVENT_JSON"
fi

# ============================================================================
# Write Event to Log File
# ============================================================================

echo "$ENRICHED_EVENT" >> "$LOG_PATH"
log_debug "Wrote enriched event to log file"

# ============================================================================
# Forward Hook Response to Claude Code
# ============================================================================

# If custom hook produced output, forward it to Claude Code
if [[ -n "$HOOK_OUTPUT" ]]; then
    echo "$HOOK_OUTPUT"
fi

# If custom hook wrote to stderr, forward it
if [[ -n "$HOOK_STDERR" ]]; then
    echo "$HOOK_STDERR" >&2
fi

# Exit with the same code as the custom hook (or 0 if no custom hook)
exit $HOOK_EXIT_CODE
