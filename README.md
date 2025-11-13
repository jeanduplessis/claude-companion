# Claude Companion

A real-time TUI (Terminal User Interface) companion app for monitoring Claude Code hook events.

## Features

- **Real-time Event Monitoring**: See Claude Code hook events as they happen with sub-10ms latency
- **Interactive Filtering**: Toggle event types on/off with keyboard shortcuts
- **Session Discovery**: Automatically finds and connects to active Claude Code sessions
- **Automatic Session Switching**: Detects new sessions and prompts you to switch (e.g., after `/clear`)
- **Beautiful TUI**: Clean, colorful interface built with Ink (React for CLIs)
- **Lightweight**: Uses JSONL log files for efficient, real-time communication
- **TypeScript**: Full type safety and modern development experience

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Unix-based OS (macOS, Linux) - Windows support coming soon
- Active Claude Code installation

### Install Globally

```bash
npm install -g claude-companion
```

### Install from Source

```bash
git clone https://github.com/yourusername/claude-companion.git
cd claude-companion
npm install
npm run build
npm link
```

## Quick Start

### Super Simple: Just Run It!

```bash
claude-companion
```

**That's it!** On first run, Claude Companion will:
1. Check if hooks are configured
2. If not, offer to run the setup wizard
3. Guide you through automatic configuration
4. Start monitoring immediately

### Alternative: Manual Setup

You can also run setup explicitly:

```bash
claude-companion setup
```

This will:
- Guide you through choosing installation location (user-wide or project-specific)
- Configure hook handlers automatically
- Set up named pipe communication
- Create all necessary files

### After Setup

1. Start Claude Code:
   ```bash
   claude-code chat
   ```

2. In another terminal, launch Claude Companion (if not already running):
   ```bash
   claude-companion
   ```

3. Watch events appear in real-time!

---

## Capturing Complete Hook Data

Claude Companion captures **ALL hook events and ALL their data**, including both:
1. **Hook Input** - Data Claude Code sends to hooks (event details, tool parameters, etc.)
2. **Hook Output** - Responses from hooks (decisions, exit codes, structured JSON responses)

### Understanding Hook Data Flow

```
Claude Code
    ↓ (hook input via stdin)
Claude Companion Hook Script
    ↓ (optionally delegates to your custom hooks)
Your Custom Hook Logic (optional)
    ↓ (hook output via stdout/stderr/exit code)
Claude Companion (logs everything)
    ↓ (forwards output back)
Claude Code (processes hook response)
```

The hook script sits in the middle and captures **both directions** of this flow while optionally delegating to your custom hook logic.

### Hook Output Data

The hook script automatically captures structured JSON responses that hooks can return:

#### ToolUse Hook Responses
```json
{
  "permissionDecision": "allow" | "deny" | "ask",
  "permissionDecisionReason": "Why this decision was made",
  "updatedInput": { "modified": "parameters" },
  "additionalContext": "Context for Claude to consider",
  "continue": false,
  "stopReason": "Why execution stopped",
  "systemMessage": "Message shown to user"
}
```

#### UserPromptSubmit Hook Responses
```json
{
  "decision": "block",
  "reason": "Why the prompt was blocked",
  "additionalContext": "Additional context for Claude"
}
```

#### Stop/SubagentStop Hook Responses
```json
{
  "decision": "block",
  "reason": "Why Claude should continue (blocks stopping)"
}
```

All hook responses can include common fields:
- `continue`: false to stop Claude entirely
- `stopReason`: Message shown when stopped
- `suppressOutput`: Hide stdout from transcript
- `systemMessage`: Warning/info for user

### Integrating Your Own Custom Hooks

If you already have custom hook logic, you can integrate it seamlessly:

```bash
# Set environment variable to your custom hook script
export CUSTOM_HOOK_SCRIPT="$HOME/.config/claude-code/my-custom-hook.sh"

# Or edit the generated hook script and set:
CUSTOM_HOOK_SCRIPT="$HOME/.config/claude-code/my-custom-hook.sh"
```

Claude Companion will:
1. Capture the hook input from Claude Code
2. Pass it to your custom hook
3. Capture your hook's output (stdout, stderr, exit code)
4. Parse any structured JSON responses
5. Forward everything back to Claude Code
6. Log all of it for monitoring in the TUI

### Viewing Hook Output in the TUI

Claude Companion displays hook execution metadata in the event list:

- ✓/✗ indicators show hook exit codes (success/failure)
- `[✓ allow]`, `[✗ deny]`, `[? ask]` show permission decisions
- `[blocked]` shows when hooks block operations
- `[stopped]` shows when hooks stop Claude execution
- `[msg]` indicates system messages are present

Use the detailed view (coming soon) to see full hook output and structured responses.

### Complete Event Data Reference

Claude Companion captures these fields for each event type:

**All Events:**
- `id`, `eventType`, `timestamp`, `sessionId`
- `transcriptPath`, `cwd`, `permissionMode`
- `hookCommand`, `hookOutput`, `hookExitCode`, `hookResponse`

**ToolUse:**
- `toolName`, `toolInput`, `toolResult`, `duration`

**UserPromptSubmit:**
- `prompt`

**Stop / SubagentStop:**
- `reason`, `stopHookActive`

**Notification:**
- `notificationType`, `message`

**PreCompact:**
- `trigger` (`manual` | `auto`), `customInstructions`

**SessionStart:**
- `source` (`startup` | `resume` | `clear` | `compact`)

**SessionEnd:**
- `reason` (`clear` | `logout` | `prompt_input_exit` | `other`)

---

## Manual Setup (Advanced)

If you prefer to configure hooks manually, you have two options:

### Option A: Using the Hook Writer Utility

Import the hook writer in your Claude Code hooks configuration (`.claude/hooks.ts` or `~/.config/claude-code/hooks.ts`):

```typescript
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

  async onUserPromptSubmit(prompt: string) {
    writer.writeEvent({
      eventType: 'UserPromptSubmit',
      prompt: prompt,
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
```

### Option B: Using a Bash Script

The setup wizard can also configure bash script-based hooks, which work without requiring TypeScript in your project. See the generated configuration in `~/.config/claude-code/hooks.json` for details.

## Usage

### Command Line Options

```bash
claude-companion [command] [options] [session-id]

Commands:
  setup               Run interactive setup wizard to configure hooks
  (none)              Start monitoring (default)

Options:
  -h, --help          Show help message
  -v, --version       Show version
  [session-id]        Connect to specific session (default: latest)

Examples:
  claude-companion setup              # Configure Claude Code hooks
  claude-companion                    # Connect to latest session
  claude-companion abc123xyz          # Connect to specific session
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `q` | Quit the application |
| `s` | Switch to new session (when prompted) |
| `i` | Ignore new session (when prompted) |
| `f` | Toggle filter bar visibility |
| `c` | Clear all events |
| `r` | Reset filters (show all event types) |
| `1` | Toggle ToolUse events |
| `2` | Toggle UserPromptSubmit events |
| `3` | Toggle Notification events |
| `4` | Toggle SessionStart events |
| `5` | Toggle SessionEnd events |

### Automatic Session Switching

When you're monitoring a Claude Code session and start a new session (e.g., by typing `/clear` in Claude Code), Claude Companion will automatically detect the new session and prompt you to switch:

- A notification banner will appear showing the current and new session IDs
- Press `s` to switch to the new session (events will be cleared and new session monitoring begins)
- Press `i` to ignore and continue monitoring the current session

This ensures you never miss events from a new session after restarting Claude Code.

### Event Types

Claude Companion displays all Claude Code hook events:

- **ToolUse** - Tool execution (unified from before/after hooks)
- **UserPromptSubmit** - When you submit a prompt to Claude
- **Notification** - System notifications from Claude Code
- **SessionStart** - When a Claude Code session begins
- **SessionEnd** - When a Claude Code session ends
- **Stop** - When execution is stopped
- **SubagentStop** - When a subagent stops
- **PreCompact** - Before session compaction

## Architecture

Claude Companion uses **JSONL log files** for efficient, real-time communication:

```
Claude Code Process
       │
       │ Hook System
       ▼
   Hook Writer ────► Log File (JSONL) ────► Claude Companion TUI
                     ~/.claude-code/hooks/      (Event Display)
                     <session-id>.jsonl
```

### Key Design Principles

1. **Zero Daemon**: No background processes to manage
2. **Low Latency**: Sub-10ms from hook trigger to display
3. **Session Isolation**: Each Claude Code session gets its own log file
4. **Automatic Discovery**: TUI finds active sessions automatically
5. **Graceful Degradation**: Works even if TUI isn't running

## Development

### Project Structure

```
claude-companion/
├── src/
│   ├── index.tsx              # CLI entry point
│   ├── types/                 # TypeScript type definitions
│   ├── log/                   # Log file management
│   │   ├── LogManager.ts
│   │   ├── LogReader.ts
│   │   └── SessionDiscovery.ts
│   ├── state/                 # React state hooks
│   │   ├── useEvents.ts
│   │   └── useFilters.ts
│   ├── components/            # UI components
│   │   ├── App.tsx
│   │   ├── EventList.tsx
│   │   ├── EventItem.tsx
│   │   ├── FilterBar.tsx
│   │   └── StatusBar.tsx
│   └── utils/                 # Utilities
│       └── formatters.ts
├── examples/                  # Example configurations
└── dist/                      # Compiled output
```

### Build and Run

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Build
npm run build

# Type check
npm run type-check
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Troubleshooting

### "No active Claude Code sessions found"

- Make sure Claude Code is running
- Verify hooks are configured correctly
- Check that log files are created in `~/.claude-code/hooks/`

```bash
ls -la ~/.claude-code/hooks/
```

### Events not appearing

- Confirm hooks are executing (add `console.log` to hook functions)
- Check log file permissions: `ls -l ~/.claude-code/hooks/*.jsonl`
- Verify log files exist: `file ~/.claude-code/hooks/*.jsonl`

### Stale log files

Clean up old log files:

```bash
rm ~/.claude-code/hooks/*.jsonl
rm ~/.claude-code/hooks/*.meta
```

### Permission denied

Ensure log files have correct permissions:

```bash
chmod 600 ~/.claude-code/hooks/*.jsonl
```

## Limitations

- **Cross-platform**: Works on Unix/Linux/macOS and Windows
- **Multiple readers**: Multiple TUI instances can read from the same log file
- **Ephemeral logs**: Log files are cleaned up when sessions end
- **Per-session monitoring**: Cannot monitor multiple sessions simultaneously

## Roadmap

- [ ] Optional event persistence (configurable log retention)
- [ ] Multi-session monitoring (tabbed interface)
- [ ] Event search and export
- [ ] Performance statistics and graphs
- [ ] Remote session monitoring (SSH tunneling)
- [ ] Configuration file for custom filters

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Acknowledgments

Built with:
- [Ink](https://github.com/vadimdemedes/ink) - React for CLIs
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [chalk](https://github.com/chalk/chalk) - Terminal colors
- [date-fns](https://date-fns.org/) - Date formatting
