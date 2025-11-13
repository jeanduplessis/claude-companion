# Claude Commander Setup Guide

This guide explains how to configure Claude Code hooks to work with Claude Commander.

## Quick Setup (Recommended)

Run the interactive setup wizard:

```bash
claude-commander setup
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

1. **Hook Script** (`~/.config/claude-code/claude-commander-hook.sh`)
   - Executable bash script that receives hook events
   - Creates/manages log files in `~/.claude-code/hooks/`
   - Writes event metadata to `.meta` files

2. **Hook Configuration** (`hooks.json`)
   - JSON configuration for Claude Code
   - Defines which events trigger the hook script
   - Configured for all event types

### For TypeScript Method:

1. **Hook Module** (`hooks.ts`)
   - TypeScript file that imports `claude-commander/hooks`
   - Uses the `HookWriter` class to write events to log files
   - Requires `claude-commander` as a dependency in your project

## Manual Configuration

If you prefer to configure manually, see [README.md](./README.md#manual-setup-advanced) for detailed instructions.

## Verification

After running setup, verify the configuration:

### Check Files Were Created

```bash
# For user settings with bash script
ls -la ~/.config/claude-code/claude-commander-hook.sh
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

2. In another terminal, start Claude Commander:
   ```bash
   claude-commander
   ```

3. Type a message in Claude Code and press Enter

4. You should see events appearing in Claude Commander!

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
   ls -l ~/.config/claude-code/claude-commander-hook.sh
   ```
   Should show `-rwxr-xr-x` (executable)

3. **Test hook script manually:**
   ```bash
   echo '{"eventType":"Test"}' | ~/.config/claude-code/claude-commander-hook.sh
   ```

4. **Check Claude Code hook configuration:**
   ```bash
   cat ~/.config/claude-code/hooks.json
   ```

### "Module not found: claude-commander/hooks"

This happens when using TypeScript hooks without having `claude-commander` installed in your project:

```bash
npm install claude-commander
# or
npm link claude-commander
```

## Uninstalling

To remove Claude Commander hooks:

```bash
# Remove user settings
rm ~/.config/claude-code/hooks.json
rm ~/.config/claude-code/hooks.ts
rm ~/.config/claude-code/claude-commander-hook.sh

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

Claude Commander automatically creates separate log files for each session using unique session IDs. Each session gets:
- Its own log file: `~/.claude-code/hooks/<session-id>.jsonl`
- Its own metadata file: `~/.claude-code/hooks/<session-id>.meta`

You can connect to specific sessions:
```bash
claude-commander <session-id>
```

## Next Steps

Once setup is complete:

1. **Start monitoring:** Run `claude-commander`
2. **Learn keyboard shortcuts:** Press keys 1-6 to toggle event types, `f` for filters, `c` to clear
3. **Explore features:** Try filtering events, watching multiple tools, etc.

For more information, see the [main README](./README.md).
