<!-- Last updated: 2025-11-13 | Commit: 232786c | Scope: . -->

# CLAUDE.md

Claude Code guidance for this repository.

## Project

Real-time TUI monitoring for Claude Code hook events. JSONL log file architecture, sub-10ms latency, no daemon processes.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Development mode with hot reload
npm run dev

# Type check without compilation
npm run type-check

# Test the CLI locally (after build)
npm link
claude-companion

# Run specific session
claude-companion <session-id>

# Run setup wizard
claude-companion setup
```

## Architecture

### Communication Flow

Log file-based event system:

```
Claude Code Process
      ↓ (hook triggered)
  HookWriter (src/hooks/HookWriter.ts)
      ↓ (writes JSONL)
  ~/.claude-code/hooks/<session-id>.jsonl
      ↓ (fs.watch + tail -f)
  LogReader (src/log/LogReader.ts)
      ↓ (EventEmitter)
  React TUI Components
```

Each session has isolated log file by session ID. `fs.watch()` detects changes, reads only new content.

### Session Management

- **LogManager** (`src/log/LogManager.ts`): Log paths, `.meta` files, stale cleanup via PID checks
- **SessionDiscovery** (`src/log/SessionDiscovery.ts`): Scans `~/.claude-code/hooks/` for `.jsonl`, validates via PID
- **LogReader** (`src/log/LogReader.ts`): EventEmitter, tail-f via file size tracking

### Hook Writer Modes

1. **Bash Script** (recommended): `~/.config/claude-code/claude-companion-hook.sh` receives JSON via stdin
2. **TypeScript Module**: Import `claude-companion/hooks`, use `HookWriter` in `hooks.ts`

Both write same JSONL format.

### Event Types

All extend `BaseHookEvent` (src/types/events.ts):
- `ToolUse`: Tool execution (unified from PreToolUse/PostToolUse)
- `UserPromptSubmit`: User messages
- `SessionStart`/`SessionEnd`: Session boundaries
- `Notification`, `Stop`, `SubagentStop`, `PreCompact`: System events

Discriminated unions for type safety.

#### Hook Response Capture

Captures both input and output:

**Input**: Event metadata (type, timestamp, sessionId, cwd, permissionMode), event payloads, session context (cli/vscode)

**Output** (`hookResponse` field):
- `exitCode`: 0=success, 2=block, other=error
- `stdout`/`stderr`: Console output
- `permissionDecision`: ToolUse ("allow"/"deny"/"ask")
- `updatedInput`: Tool parameter modifications

HookWriter auto-captures responses. EventItem shows status (✓/✗) and alterations.

### React Components

Ink (React for CLIs):

- **App.tsx**: Root, session switching, keyboard shortcuts
- **EventList.tsx**: Virtualized display
- **EventItem.tsx**: Event rendering, color-coded
- **FilterBar.tsx**: Type filters (1-6 keys)
- **StatusBar.tsx**: Session info, status, hints
- **SessionSwitchPrompt.tsx**: New session modal

State hooks:
- `useEvents`: Event collection, filtering, LogReader
- `useFilters`: Filter state

#### Event Display

EventItem visualization:

**Status**: `✓` (green, exitCode 0), `✗` (red, non-zero)

**Permission Decisions**: `[✓ allow]` (dim), `[✗ deny]` (dim), `[? ask]` (dim)

**Alterations**: `[ALTERED: key1, key2]` (yellow)

**Tool Formatting**:
- Edit/Write/Read: Shows `file_path`
- Bash: Shows `command`
- Grep: Shows `pattern`
- WebFetch: Shows `url`
- Single-param tools: Shows value
- Multi-param tools: Shows priority parameter (file_path, command, pattern, url, path)

## Implementation Details

### File Watching

LogReader with `fs.watch()`:
1. Get current file size
2. Read bytes from `lastSize` to `currentSize`
3. Parse JSON lines
4. Emit events

~1ms latency.

### Metadata Files

- `<session-id>.jsonl`: Event data (JSONL)
- `<session-id>.meta`: PID, start time, cwd, user

Enables PID validation and stale cleanup.

### Session Discovery

1. Scan `~/.claude-code/hooks/` for `.jsonl`
2. Read `.meta` files
3. Validate PIDs via `process.kill(pid, 0)`
4. Return sessions sorted by start time

App watches for new sessions, prompts switch (`s`).

### Setup Wizard

`src/setup/`:
- **HookChecker**: Detects existing configs
- **HookConfigGenerator**: Generates `hooks.json`/`hooks.ts`
- Supports user-wide (`~/.config/claude-code/`) and project (`./.claude/`)

**Modes**:
1. **Bash Script** (recommended): `hooks.json` + bash script, lower overhead
2. **TypeScript Module**: `hooks.ts` imports `claude-companion/hooks`, type safety

**Behavior**:
- Auto-offers setup on first run without hooks
- Detects conflicts, offers backup
- Captures ALL event types
- Installs example: `examples/claude-companion-hook.sh`

## Module Exports

- `.` → `dist/index.js` (CLI)
- `./hooks` → `dist/hooks/index.js` (HookWriter)

Import: `import { getHookWriter } from 'claude-companion/hooks'`

## TypeScript Config

- Target: ES2022 (Node 18+)
- Module: Node16 (ESM with .js imports)
- JSX: react (Ink)
- Strict mode
- Imports require `.js` extension (Node16 resolution)

## Development

### Adding Event Types

1. **Update** `src/types/events.ts`: Add interface extending `BaseHookEvent`, include in union
2. **Update** `src/components/EventItem.tsx`: Add rendering logic, color coding
3. **Update** `src/setup/HookConfigGenerator.ts`: Add to generated configs
4. **Test**: Trigger event, verify TUI display, check JSONL format

### Common Issues

**Events not appearing**:
- Check `~/.config/claude-code/hooks.json` exists
- Verify logs in `~/.claude-code/hooks/` match session ID

**TypeScript import errors**:
- Use `.js` extension: `import { Foo } from './bar.js'`
- Required by Node16/ESM resolution

**Hook responses missing**:
- Ensure script echoes response JSON to stdout
- Check `hookResponse` field in JSONL

### Performance

- **Log Growth**: Unbounded, acceptable <1000 events
- **File Watch**: Multiple events per write, mitigated by size tracking, <1ms latency
- **Filtering**: In React, not at read, negligible <10,000 events

## Testing

1. `npm run build`
2. `npm link`
3. Start Claude Code session
4. Run `claude-companion`
5. Verify TUI events
6. Check logs: `ls -la ~/.claude-code/hooks/`

Debug: Add logs to HookWriter/LogReader.
