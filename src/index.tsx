#!/usr/bin/env node
import React, { useState } from 'react';
import { render } from 'ink';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { App } from './components/App.js';
import { SetupUI } from './setup/SetupUI.js';
import { SetupPrompt } from './components/SetupPrompt.js';
import { HookChecker } from './setup/HookChecker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
let command: string | undefined;
let sessionId: string | undefined;
let skipCheck = false;

// Simple argument parsing
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '-h' || arg === '--help') {
    console.log(`
Claude Commander - Hook Event Monitor for Claude Code

Usage:
  claude-commander [command] [options] [session-id]

Commands:
  setup               Run interactive setup wizard to configure hooks
  (none)              Start monitoring (default)

Options:
  -h, --help          Show this help message
  -v, --version       Show version
  --skip-check        Skip hook configuration check on startup
  [session-id]        Connect to specific session (default: latest)

Examples:
  claude-commander setup              # Configure Claude Code hooks
  claude-commander                    # Connect to latest session
  claude-commander abc123xyz          # Connect to specific session
  claude-commander --skip-check       # Start without checking hooks

Keyboard Shortcuts (in monitor mode):
  q                   Quit
  f                   Toggle filter bar
  c                   Clear events
  r                   Reset filters
  1-6                 Toggle specific event types
    `);
    process.exit(0);
  } else if (arg === '-v' || arg === '--version') {
    const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
    console.log(pkg.version);
    process.exit(0);
  } else if (arg === 'setup') {
    command = 'setup';
  } else if (arg === '--skip-check') {
    skipCheck = true;
  } else if (!arg.startsWith('-')) {
    sessionId = arg;
  }
}

// Main app wrapper component that handles setup flow
const MainApp: React.FC<{ sessionId?: string; skipCheck: boolean }> = ({ sessionId, skipCheck }) => {
  const [view, setView] = useState<'check' | 'setup' | 'monitor'>(() => {
    if (skipCheck) {
      return 'monitor';
    }

    // Check if hooks are configured
    const checker = new HookChecker();
    return checker.isConfigured() ? 'monitor' : 'check';
  });

  if (view === 'check') {
    return (
      <SetupPrompt
        onRunSetup={() => setView('setup')}
        onContinueAnyway={() => setView('monitor')}
      />
    );
  }

  if (view === 'setup') {
    return <SetupUI onComplete={() => setView('monitor')} />;
  }

  return <App sessionId={sessionId} />;
};

// Handle commands
if (command === 'setup') {
  render(<SetupUI />);
} else {
  // Default: start monitoring (with optional pre-flight check)
  render(<MainApp sessionId={sessionId} skipCheck={skipCheck} />);
}
