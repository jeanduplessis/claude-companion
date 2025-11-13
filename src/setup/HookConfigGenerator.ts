import fs from 'fs';
import path from 'path';
import os from 'os';

export type HookInstallLocation = 'user' | 'project';

export interface HookConfigOptions {
  location: HookInstallLocation;
  useScript: boolean; // If true, use bash script; if false, use hook-writer.ts
}

export class HookConfigGenerator {
  private readonly userConfigDir: string;
  private readonly projectConfigDir: string;

  constructor() {
    // Claude Code reads hooks from ~/.claude/settings.json for user settings
    this.userConfigDir = path.join(os.homedir(), '.claude');
    this.projectConfigDir = path.join(process.cwd(), '.claude');
  }

  /**
   * Generate bash script-based hook configuration
   */
  private generateScriptBasedConfig(): string {
    const scriptPath = this.getHookScriptPath();

    return JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log session start event'
                }
              ]
            }
          ],
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log pre-tool-use events'
                }
              ]
            }
          ],
          PostToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log post-tool-use events'
                }
              ]
            }
          ],
          UserPromptSubmit: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log user prompt submissions'
                }
              ]
            }
          ],
          Notification: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log notifications'
                }
              ]
            }
          ],
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log stop events'
                }
              ]
            }
          ],
          SubagentStop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log subagent stop events'
                }
              ]
            }
          ],
          PreCompact: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log pre-compact events'
                }
              ]
            }
          ],
          SessionEnd: [
            {
              hooks: [
                {
                  type: 'command',
                  command: scriptPath,
                  description: 'Log session end event'
                }
              ]
            }
          ]
        }
      },
      null,
      2
    );
  }

  /**
   * Generate TypeScript hook configuration template
   */
  private generateTypeScriptConfig(): string {
    return `// Claude Code hooks configuration
// This file is executed by Claude Code to handle hook events

import { getHookWriter } from 'claude-companion/hooks';

const writer = getHookWriter();

export const hooks = {
  async onPreToolUse(context: any) {
    writer.writeEvent({
      eventType: 'ToolUse',
      toolName: context.toolName,
      toolInput: context.parameters,
      cwd: process.cwd(),
      permissionMode: context.permissionMode
    });
  },

  async onPostToolUse(context: any, result: any) {
    writer.writeEvent({
      eventType: 'ToolUse',
      toolName: context.toolName,
      toolInput: context.parameters,
      toolResult: result,
      duration: context.duration,
      cwd: process.cwd()
    });
  },

  async onUserPromptSubmit(prompt: string, context: any) {
    writer.writeEvent({
      eventType: 'UserPromptSubmit',
      prompt: prompt,
      cwd: process.cwd(),
      permissionMode: context?.permissionMode
    });
  },

  async onNotification(type: string, message: string) {
    writer.writeEvent({
      eventType: 'Notification',
      notificationType: type,
      message: message,
      cwd: process.cwd()
    });
  },

  async onStop(reason: string, context: any) {
    writer.writeEvent({
      eventType: 'Stop',
      reason: reason,
      stopHookActive: context?.stopHookActive,
      cwd: process.cwd(),
      permissionMode: context?.permissionMode
    });
  },

  async onSubagentStop(reason: string, context: any) {
    writer.writeEvent({
      eventType: 'SubagentStop',
      reason: reason,
      stopHookActive: context?.stopHookActive,
      cwd: process.cwd(),
      permissionMode: context?.permissionMode
    });
  },

  async onPreCompact(trigger: 'manual' | 'auto', customInstructions: string, context: any) {
    writer.writeEvent({
      eventType: 'PreCompact',
      trigger: trigger,
      customInstructions: customInstructions,
      cwd: process.cwd(),
      permissionMode: context?.permissionMode
    });
  },

  async onSessionStart(source: 'startup' | 'resume' | 'clear' | 'compact', context: any) {
    writer.writeEvent({
      eventType: 'SessionStart',
      source: source,
      cwd: process.cwd(),
      permissionMode: context?.permissionMode
    });
  },

  async onSessionEnd(reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other') {
    writer.writeEvent({
      eventType: 'SessionEnd',
      reason: reason,
      cwd: process.cwd()
    });
    writer.close();
  }
};
`;
  }

  /**
   * Generate the comprehensive hook script that captures all hook data
   */
  private generateHookScript(): string {
    return `#!/bin/bash
# Claude Companion Hook Script
#
# Captures ALL hook data from Claude Code:
# 1. Hook INPUT (event data, tool parameters, etc.)
# 2. Hook OUTPUT (exit codes, stdout, stderr, JSON responses)
# 3. Complete hook execution metadata
#
# Configuration via environment variables:
#   CUSTOM_HOOK_SCRIPT - Path to your custom hook script (optional)
#   LOG_DIR - Directory for logs (default: ~/.claude-code/hooks)
#   DEBUG - Set to "1" to enable debug logging

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Where to store hook logs
LOG_DIR="\${LOG_DIR:-$HOME/.claude-code/hooks}"

# Optional: Path to your custom hook script
CUSTOM_HOOK_SCRIPT="\${CUSTOM_HOOK_SCRIPT:-}"

# ============================================================================
# Utility Functions
# ============================================================================

log_debug() {
    if [[ "\${DEBUG:-}" == "1" ]]; then
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
if [ -z "\${SESSION_ID:-}" ]; then
    SESSION_ID="\${CLAUDE_SESSION_ID:-$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-16)}"
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
    ENRICHED_EVENT=$(echo "$EVENT_JSON" | jq -c \\
        --arg hook_cmd "$CUSTOM_HOOK_SCRIPT" \\
        --arg hook_out "$HOOK_OUTPUT" \\
        --argjson hook_exit "$HOOK_EXIT_CODE" \\
        --argjson hook_resp "\${HOOK_RESPONSE_JSON:-null}" \\
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
            duration: .duration,

            # UserPromptSubmit
            prompt: .prompt,

            # Stop/SubagentStop
            reason: .reason,
            stopHookActive: (.stop_hook_active // .stopHookActive),

            # Notification
            notificationType: (.notification_type // .notificationType),
            message: .message,

            # PreCompact
            trigger: .trigger,
            customInstructions: (.custom_instructions // .customInstructions),

            # SessionStart
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
`;
  }

  /**
   * Get the path where the hook script will be installed
   */
  private getHookScriptPath(): string {
    return path.join(os.homedir(), '.config', 'claude-code', 'claude-companion-hook.sh');
  }

  /**
   * Install hook script to the config directory
   */
  async installHookScript(): Promise<string> {
    const scriptPath = this.getHookScriptPath();
    const scriptContent = this.generateHookScript();

    // Ensure directory exists
    fs.mkdirSync(path.dirname(scriptPath), { recursive: true });

    // Write script
    fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

    return scriptPath;
  }

  /**
   * Install hook configuration
   */
  async install(options: HookConfigOptions): Promise<string> {
    const configDir = options.location === 'user' ? this.userConfigDir : this.projectConfigDir;

    // Ensure directory exists
    fs.mkdirSync(configDir, { recursive: true });

    let configPath: string;

    if (options.useScript) {
      // Install bash script
      await this.installHookScript();

      // Merge hooks into settings.json (or settings.local.json for project)
      const filename = options.location === 'user' ? 'settings.json' : 'settings.local.json';
      configPath = path.join(configDir, filename);

      // Read existing settings or create new
      let settings: any = {};
      if (fs.existsSync(configPath)) {
        try {
          const existingContent = fs.readFileSync(configPath, 'utf8');
          settings = JSON.parse(existingContent);

          // Backup existing file
          const backupPath = `${configPath}.backup.${Date.now()}`;
          fs.copyFileSync(configPath, backupPath);
          console.log(`\nBackup created: ${backupPath}`);
        } catch (error) {
          console.warn(`Warning: Could not parse existing ${filename}, creating new file`);
        }
      }

      // Parse the hooks config and merge it
      const hooksConfig = JSON.parse(this.generateScriptBasedConfig());
      settings.hooks = hooksConfig.hooks;

      // Write merged configuration
      fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
    } else {
      // Create TypeScript configuration
      configPath = path.join(configDir, 'hooks.ts');
      const configContent = this.generateTypeScriptConfig();

      // Check if file exists
      if (fs.existsSync(configPath)) {
        // Backup existing file
        const backupPath = `${configPath}.backup.${Date.now()}`;
        fs.copyFileSync(configPath, backupPath);
        console.log(`\nBackup created: ${backupPath}`);
      }

      // Write configuration
      fs.writeFileSync(configPath, configContent);
    }

    return configPath;
  }

  /**
   * Verify hook configuration
   */
  async verify(location: HookInstallLocation): Promise<boolean> {
    const configDir = location === 'user' ? this.userConfigDir : this.projectConfigDir;

    // Check for settings.json/settings.local.json with hooks, or hooks.ts
    const filename = location === 'user' ? 'settings.json' : 'settings.local.json';
    const settingsPath = path.join(configDir, filename);
    const tsPath = path.join(configDir, 'hooks.ts');

    // Check for TypeScript hooks
    if (fs.existsSync(tsPath)) {
      return true;
    }

    // Check for hooks in settings file
    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(content);

        // Check if hooks are configured
        if (settings.hooks && Object.keys(settings.hooks).length > 0) {
          // Verify script exists and is executable
          const scriptPath = this.getHookScriptPath();
          if (!fs.existsSync(scriptPath)) {
            return false;
          }

          // Check if executable
          try {
            fs.accessSync(scriptPath, fs.constants.X_OK);
          } catch {
            return false;
          }

          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * Get configuration file path
   */
  getConfigPath(location: HookInstallLocation, useScript: boolean): string {
    const configDir = location === 'user' ? this.userConfigDir : this.projectConfigDir;
    if (useScript) {
      // Hooks are stored in settings.json (user) or settings.local.json (project)
      const filename = location === 'user' ? 'settings.json' : 'settings.local.json';
      return path.join(configDir, filename);
    } else {
      // TypeScript hooks are in hooks.ts
      return path.join(configDir, 'hooks.ts');
    }
  }

  /**
   * Uninstall hook configuration
   */
  async uninstall(location: HookInstallLocation): Promise<void> {
    const configDir = location === 'user' ? this.userConfigDir : this.projectConfigDir;

    // Remove TypeScript hooks if present
    const tsPath = path.join(configDir, 'hooks.ts');
    if (fs.existsSync(tsPath)) {
      fs.unlinkSync(tsPath);
    }

    // Remove hooks from settings file
    const filename = location === 'user' ? 'settings.json' : 'settings.local.json';
    const settingsPath = path.join(configDir, filename);

    if (fs.existsSync(settingsPath)) {
      try {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(content);

        if (settings.hooks) {
          // Backup before modifying
          const backupPath = `${settingsPath}.backup.${Date.now()}`;
          fs.copyFileSync(settingsPath, backupPath);
          console.log(`\nBackup created: ${backupPath}`);

          // Remove hooks key
          delete settings.hooks;

          // Write back
          fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        }
      } catch (error) {
        console.warn(`Warning: Could not modify ${filename}:`, error);
      }
    }

    // Remove script if user config
    if (location === 'user') {
      const scriptPath = this.getHookScriptPath();
      if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
      }
    }
  }
}
