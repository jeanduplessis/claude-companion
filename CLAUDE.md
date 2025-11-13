# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Commander is a real-time TUI (Terminal User Interface) monitoring tool for Claude Code hook events. It uses a JSONL log file-based architecture to achieve sub-10ms latency event display without requiring daemon processes.

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
claude-commander

# Run specific session
claude-commander <session-id>

# Run setup wizard
claude-commander setup
```

## Architecture

### Core Communication Flow

The project uses a **log file-based event system** instead of named pipes or sockets:

```
Claude Code Process
      ↓ (hook triggered)
  HookWriter (src/hooks/HookWriter.ts)
      ↓ (writes JSONL)
  ~/.claude-code/hooks/<session-id>.jsonl
      ↓ (fs.watch + tail -f style)
  LogReader (src/log/LogReader.ts)
      ↓ (EventEmitter)
  React TUI Components
```

**Key principle**: Each Claude Code session gets its own isolated log file identified by a unique session ID. The TUI uses `fs.watch()` to detect file changes and only reads new content (tail -f behavior), providing real-time monitoring with minimal overhead.

### Session Management

Session lifecycle is managed through three components:

1. **LogManager** (`src/log/LogManager.ts`): Handles log file paths, metadata files (`.meta`), and stale session cleanup using PID checks
2. **SessionDiscovery** (`src/log/SessionDiscovery.ts`): Discovers active sessions by scanning `~/.claude-code/hooks/` for `.jsonl` files, validates sessions using PIDs from metadata
3. **LogReader** (`src/log/LogReader.ts`): Reads events from log files using EventEmitter pattern, implements tail-f style reading by tracking file size and only reading new bytes

### Hook Writer (Two Modes)

Users can configure hooks in two ways:

1. **Bash Script Mode** (recommended): `~/.config/claude-code/claude-commander-hook.sh` receives hook events as JSON via stdin and appends to log files
2. **TypeScript Module Mode**: Imports `claude-commander/hooks` and uses `HookWriter` class directly in `hooks.ts`

Both modes write to the same JSONL format, ensuring compatibility.

### Event Types System

All events extend `BaseHookEvent` (src/types/events.ts):
- `PreToolUse` / `PostToolUse`: Tool execution lifecycle
- `UserPromptSubmit`: User messages
- `SessionStart` / `SessionEnd`: Session boundaries
- `Notification`, `Stop`, `SubagentStop`, `PreCompact`: System events

Events are strongly typed using discriminated unions for type safety across the stack.

### React Component Architecture

Built with Ink (React for CLIs):

- **App.tsx**: Root component, manages session switching logic, keyboard shortcuts
- **EventList.tsx**: Virtualized event display
- **EventItem.tsx**: Individual event rendering with color-coded types
- **FilterBar.tsx**: Toggle display for event type filters (1-6 keys)
- **StatusBar.tsx**: Shows session info, connection status, keyboard hints
- **SessionSwitchPrompt.tsx**: Modal prompt when new session detected

State management uses React hooks:
- `useEvents` (src/state/useEvents.ts): Event collection, filtering, LogReader integration
- `useFilters` (src/state/useFilters.ts): Filter state for event types

## Important Implementation Details

### File Watching & Performance

LogReader uses `fs.watch()` on the JSONL file and tracks file size to avoid re-reading content. When a change event fires, it:
1. Gets current file size
2. Reads only bytes from `lastSize` to `currentSize`
3. Parses new lines as JSON
4. Emits events to subscribers

This provides ~1ms latency from write to display.

### Metadata Files

Each session has two files:
- `<session-id>.jsonl`: Event data (one JSON object per line)
- `<session-id>.meta`: Session metadata (PID, start time, cwd, user)

Metadata enables session validation (check if PID is alive) and automatic cleanup of stale logs.

### Session Discovery & Switching

On startup, SessionDiscovery:
1. Scans `~/.claude-code/hooks/` for `.jsonl` files
2. Reads corresponding `.meta` files
3. Validates PIDs using `process.kill(pid, 0)`
4. Returns active sessions sorted by start time

App component watches for new sessions while monitoring and prompts user to switch (press `s`) when detected.

### Setup Wizard

`src/setup/` contains interactive setup flow:
- **HookChecker**: Detects existing hook configurations
- **HookConfigGenerator**: Generates `hooks.json` or `hooks.ts` files based on user choices
- Supports both user-wide (`~/.config/claude-code/`) and project-specific (`./.claude/`) installation

## Module Exports

The package exports two entry points (see package.json):
- `.` → `dist/index.js` (CLI)
- `./hooks` → `dist/hooks/index.js` (HookWriter for TypeScript hooks)

Users can import with: `import { getHookWriter } from 'claude-commander/hooks'`

## TypeScript Configuration

- Target: ES2022 (Node.js 18+)
- Module: Node16 (ESM with .js extensions in imports)
- JSX: react (for Ink components)
- Strict mode enabled
- All imports must use `.js` extension even though source is `.ts` (Node16 module resolution)

## Testing Approach

When testing locally:
1. Build with `npm run build`
2. Link globally with `npm link`
3. Start Claude Code session
4. Run `claude-commander` to connect
5. Verify events appear in TUI
6. Check log files: `ls -la ~/.claude-code/hooks/`

For debugging event flow, add temporary logs to HookWriter or LogReader.
