# Claude Companion Setup Guide

This guide explains how to configure Claude Code hooks to work with Claude Companion and capture **ALL hook events and their complete data**.

## What Data Is Captured?

Claude Companion automatically captures **everything**:

1. **Hook Input** - What Claude Code sends to your hooks:
   - Event types (ToolUse, UserPromptSubmit, Stop, SubagentStop, PreCompact, SessionStart, SessionEnd, Notification)
   - Tool names and parameters
   - User prompts
   - Session metadata (session ID, cwd, permission mode)
   - Event-specific data (notification types, stop reasons, compact triggers, session sources, etc.)

2. **Hook Output** - What your hooks return to Claude Code:
   - Exit codes (0 = success, 2 = block, other = error)
   - Stdout/stderr output
   - Structured JSON responses (permission decisions, block decisions, system messages)

There's **one setup mode** that captures everything comprehensively.

## Quick Setup (Recommended)

Run the interactive setup wizard:

```bash
claude-companion setup
```

The wizard will guide you through:

### Step 1: Choose Installation Location

**User Settings (Recommended for most users)**
- Applies hooks to all Claude Code sessions globally
- Location: `~/.config/claude-code/`
- Best for: Developers who want monitoring across all projects

**Project Settings**
- Applies hooks only to the current project
- Location: `./.claude/`
- Best for: Team projects or specific project monitoring

### Step 2: Choose Hook Method

**Bash Script (Recommended)**
- Simple shell script that writes to log files
- Works out of the box, no additional dependencies
- Best for: Most users, especially those without TypeScript projects

**TypeScript Module**
- Programmatic hook integration
- More control and flexibility
- Best for: TypeScript projects, advanced users

## What Gets Configured

The setup wizard creates the following:

### For Bash Script Method:

1. **Hook Script** (`~/.config/claude-code/claude-companion-hook.sh`)
   - Executable bash script that receives hook events
   - Creates/manages log files in `~/.claude-code/hooks/`
   - Writes event metadata to `.meta` files

2. **Hook Configuration** (`hooks.json`)
   - JSON configuration for Claude Code
   - Defines which events trigger the hook script
   - Configured for all event types

### For TypeScript Method:

1. **Hook Module** (`hooks.ts`)
   - TypeScript file that imports `claude-companion/hooks`
   - Uses the `HookWriter` class to write events to log files
   - Requires `claude-companion` as a dependency in your project

## Integrating Your Own Custom Hooks

If you already have custom hook logic, Claude Companion can wrap it and capture all data:

### Option 1: Environment Variable

```bash
# Set in your shell profile (~/.bashrc, ~/.zshrc, etc.)
export CUSTOM_HOOK_SCRIPT="$HOME/.config/claude-code/my-custom-hook.sh"

# Then restart Claude Code
claude-code chat
```

### Option 2: Edit the Generated Script

```bash
# Edit the generated hook script
nano ~/.config/claude-code/claude-companion-hook.sh

# Find this line near the top:
CUSTOM_HOOK_SCRIPT="${CUSTOM_HOOK_SCRIPT:-}"

# Change it to:
CUSTOM_HOOK_SCRIPT="$HOME/.config/claude-code/my-custom-hook.sh"
```

### How It Works

When you set a custom hook script, Claude Companion will:

1. Receive hook input from Claude Code
2. Log the input data
3. Pass the input to your custom hook script
4. Capture your hook's output (stdout, stderr, exit code)
5. Parse any structured JSON responses
6. Log all hook output data
7. Forward the output back to Claude Code

This means you get **complete observability** without modifying your existing hook logic!

### What's Captured

The setup wizard automatically captures **everything**:

**Hook Input:**
- All 8 event types (ToolUse, UserPromptSubmit, Stop, SubagentStop, PreCompact, SessionStart, SessionEnd, Notification)
- All event-specific fields
- All session metadata

**Hook Output (if custom hook is configured):**
- Exit codes (0 = success, 2 = block, other = error)
- Raw stdout and stderr
- Structured JSON responses:
  - Permission decisions (`allow`, `deny`, `ask`)
  - Block decisions and reasons
  - `continue` flags (stops Claude execution)
  - System messages
  - Additional context
  - Updated tool inputs

**Visual Indicators in TUI:**
- ✓/✗ for hook success/failure
- `[✓ allow]`, `[✗ deny]`, `[? ask]` for permission decisions
- `[blocked]`, `[stopped]`, `[msg]` for other responses

## Manual Configuration

If you prefer to configure manually, see [README.md](./README.md#manual-setup-advanced) for detailed instructions.

## Verification

After running setup, verify the configuration:

### Check Files Were Created

```bash
# For user settings with bash script
ls -la ~/.config/claude-code/claude-companion-hook.sh
ls -la ~/.config/claude-code/hooks.json

# For user settings with TypeScript
ls -la ~/.config/claude-code/hooks.ts

# For project settings
ls -la ./.claude/hooks.json
# or
ls -la ./.claude/hooks.ts
```

### Test the Setup

1. Start Claude Code:
   ```bash
   claude-code chat
   ```

2. In another terminal, start Claude Companion:
   ```bash
   claude-companion
   ```

3. Type a message in Claude Code and press Enter

4. You should see events appearing in Claude Companion!

## Troubleshooting

### "No active Claude Code sessions found"

- Make sure Claude Code is running
- Check that hooks are configured (see verification steps above)
- Look for log files: `ls ~/.claude-code/hooks/*.jsonl`

### "Setup Failed"

- Check file permissions in `~/.config/claude-code/`
- Ensure you have write access to the target directory
- Try running setup again

### Events Not Appearing

1. **Check log file was created:**
   ```bash
   ls -la ~/.claude-code/hooks/
   ```
   You should see `.jsonl` and `.meta` files

2. **Check hook script is executable:**
   ```bash
   ls -l ~/.config/claude-code/claude-companion-hook.sh
   ```
   Should show `-rwxr-xr-x` (executable)

3. **Test hook script manually:**
   ```bash
   echo '{"eventType":"Test"}' | ~/.config/claude-code/claude-companion-hook.sh
   ```

4. **Check Claude Code hook configuration:**
   ```bash
   cat ~/.config/claude-code/hooks.json
   ```

### "Module not found: claude-companion/hooks"

This happens when using TypeScript hooks without having `claude-companion` installed in your project:

```bash
npm install claude-companion
# or
npm link claude-companion
```

## Uninstalling

To remove Claude Companion hooks:

```bash
# Remove user settings
rm ~/.config/claude-code/hooks.json
rm ~/.config/claude-code/hooks.ts
rm ~/.config/claude-code/claude-companion-hook.sh

# Remove project settings
rm ./.claude/hooks.json
rm ./.claude/hooks.ts

# Clean up log files
rm -rf ~/.claude-code/hooks/*.jsonl
rm -rf ~/.claude-code/hooks/*.meta
```

## Advanced Configuration

### Custom Event Filtering

Edit the generated `hooks.json` to only monitor specific events:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Write",  // Only Read and Write tools
        "hooks": [/* ... */]
      }
    ]
  }
}
```

### Multiple Sessions

Claude Companion automatically creates separate log files for each session using unique session IDs. Each session gets:
- Its own log file: `~/.claude-code/hooks/<session-id>.jsonl`
- Its own metadata file: `~/.claude-code/hooks/<session-id>.meta`

You can connect to specific sessions:
```bash
claude-companion <session-id>
```

## Next Steps

Once setup is complete:

1. **Start monitoring:** Run `claude-companion`
2. **Learn keyboard shortcuts:** Press keys 1-6 to toggle event types, `f` for filters, `c` to clear
3. **Explore features:** Try filtering events, watching multiple tools, etc.

For more information, see the [main README](./README.md).
