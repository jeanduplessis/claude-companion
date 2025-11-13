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
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `${scriptPath} SessionStart`,
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
                  command: `${scriptPath} PreToolUse`,
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
                  command: `${scriptPath} PostToolUse`,
                  description: 'Log post-tool-use events'
                }
              ]
            }
          ],
          UserPromptSubmit: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `${scriptPath} UserPromptSubmit`,
                  description: 'Log user prompt submissions'
                }
              ]
            }
          ],
          Notification: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `${scriptPath} Notification`,
                  description: 'Log notifications'
                }
              ]
            }
          ],
          SessionEnd: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: `${scriptPath} SessionEnd`,
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

import { getHookWriter } from 'claude-commander/hooks';

const writer = getHookWriter();

export const hooks = {
  async onPreToolUse(context: any) {
    writer.writeEvent({
      eventType: 'PreToolUse',
      toolName: context.toolName,
      toolInput: context.parameters,
      cwd: process.cwd(),
      permissionMode: context.permissionMode
    });
  },

  async onPostToolUse(context: any, result: any) {
    writer.writeEvent({
      eventType: 'PostToolUse',
      toolName: context.toolName,
      toolInput: context.parameters,
      toolResult: result,
      duration: context.duration,
      cwd: process.cwd()
    });
  },

  async onUserPromptSubmit(prompt: string) {
    writer.writeEvent({
      eventType: 'UserPromptSubmit',
      prompt: prompt,
      cwd: process.cwd()
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

  async onSessionStart() {
    writer.writeEvent({
      eventType: 'SessionStart',
      cwd: process.cwd()
    });
  },

  async onSessionEnd() {
    writer.writeEvent({
      eventType: 'SessionEnd',
      cwd: process.cwd()
    });
    writer.close();
  }
};
`;
  }

  /**
   * Generate the hook script that writes to log files
   */
  private generateHookScript(): string {
    return `#!/bin/bash
# Claude Commander Hook Script
# This script reads hook event data from stdin and appends it to a log file
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
if [ -z "\${SESSION_ID:-}" ]; then
    SESSION_ID="\${CLAUDE_SESSION_ID:-$(uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | cut -c1-16)}"
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
`;
  }

  /**
   * Get the path where the hook script will be installed
   */
  private getHookScriptPath(): string {
    return path.join(os.homedir(), '.config', 'claude-code', 'claude-commander-hook.sh');
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
