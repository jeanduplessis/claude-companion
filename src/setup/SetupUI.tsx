import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import os from 'os';
import path from 'path';
import { HookConfigGenerator, HookInstallLocation } from './HookConfigGenerator.js';
import { colors, inkColors } from '../theme/colors.js';

type SetupStep = 'welcome' | 'location' | 'method' | 'installing' | 'complete' | 'error';

interface SetupUIProps {
  onComplete?: () => void;
}

export const SetupUI: React.FC<SetupUIProps> = ({ onComplete }) => {
  const { exit } = useApp();
  const [step, setStep] = useState<SetupStep>('welcome');
  const [location, setLocation] = useState<HookInstallLocation | null>(null);
  const [useScript, setUseScript] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configPath, setConfigPath] = useState<string | null>(null);

  // Handle keyboard input for welcome screen
  useInput((input, key) => {
    // Handle 'q' to quit on any screen
    if (input === 'q' || input === 'Q') {
      exit();
      return;
    }

    // Handle SPACE on welcome screen
    if (step === 'welcome' && input === ' ') {
      setStep('location');
    } else if (step === 'complete' && input === ' ') {
      if (onComplete) {
        // Transition to monitoring (we're running from main app)
        onComplete();
      } else {
        // Exit (we're running standalone `claude-commander setup`)
        exit();
      }
    } else if (step === 'error' && input === ' ') {
      exit();
    }

    // Handle Ctrl+C to quit
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  // Location selection
  const handleLocationSelect = (item: { value: HookInstallLocation }) => {
    setLocation(item.value);
    setStep('method');
  };

  // Method selection
  const handleMethodSelect = async (item: { value: boolean }) => {
    setUseScript(item.value);
    setStep('installing');

    try {
      const generator = new HookConfigGenerator();
      const path = await generator.install({
        location: location!,
        useScript: item.value
      });

      setConfigPath(path);
      setStep('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStep('error');
    }
  };

  // Welcome screen
  if (step === 'welcome') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="double" borderColor={inkColors.borderAccent} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Claude Commander - Hook Setup
          </Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text>Welcome to Claude Commander setup!</Text>
          <Text color={inkColors.dim}>This wizard will configure Claude Code hooks to work with Claude Commander.</Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text bold color={inkColors.text}>What will be configured:</Text>
          <Text>  • Hook event handlers for Claude Code</Text>
          <Text>  • Bash script for logging events to JSONL files</Text>
          <Text>  • Real-time event monitoring setup</Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text bold color={inkColors.text}>Events captured:</Text>
          <Text color={inkColors.dim}>  PreToolUse, PostToolUse, UserPromptSubmit, Notification, SessionStart, SessionEnd</Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text>
            Press <Text bold color={inkColors.success}>SPACE</Text> to continue, or{' '}
            <Text bold color={inkColors.error}>q</Text> to quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Location selection
  if (step === 'location') {
    const userPath = path.join(os.homedir(), '.claude', 'settings.json');
    const projectPath = path.join(process.cwd(), '.claude', 'settings.local.json');

    const locationItems = [
      {
        label: colors.warning('User Settings') + ' - Apply to all Claude Code sessions globally',
        value: 'user' as HookInstallLocation
      },
      {
        label: colors.info('Project Settings') + ' - Apply only to this project',
        value: 'project' as HookInstallLocation
      }
    ];

    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="single" borderColor={inkColors.borderAccent} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.text}>Step 1: Choose Installation Location</Text>
        </Box>

        <Box marginBottom={1} paddingX={1}>
          <Text color={inkColors.dim}>Where should the hooks be installed?</Text>
        </Box>

        <Box paddingX={2}>
          <SelectInput items={locationItems} onSelect={handleLocationSelect} />
        </Box>

        <Box marginTop={2} paddingX={1} flexDirection="column">
          <Text color={inkColors.dim}>Configuration paths:</Text>
          <Text color={inkColors.dim}>  • User: <Text color={inkColors.warning}>{userPath}</Text></Text>
          <Text color={inkColors.dim}>  • Project: <Text color={inkColors.info}>{projectPath}</Text></Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text color={inkColors.dim}>Use arrow keys to select, Enter to confirm</Text>
        </Box>
      </Box>
    );
  }

  // Method selection
  if (step === 'method') {
    const configPath = location === 'user'
      ? path.join(os.homedir(), '.claude', 'settings.json')
      : path.join(process.cwd(), '.claude', 'settings.local.json');

    const scriptPath = path.join(os.homedir(), '.config', 'claude-code', 'claude-commander-hook.sh');

    const methodItems = [
      {
        label:
          colors.success('Bash Script') +
          ' - Simple, works out of the box (recommended for most users)',
        value: true
      },
      {
        label:
          colors.info('TypeScript Module') +
          ' - More control, requires TypeScript in your project',
        value: false
      }
    ];

    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="single" borderColor={inkColors.borderAccent} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.text}>Step 2: Choose Hook Method</Text>
        </Box>

        <Box marginBottom={1} paddingX={1}>
          <Text color={inkColors.dim}>How should hooks communicate with Claude Commander?</Text>
        </Box>

        <Box paddingX={2}>
          <SelectInput items={methodItems} onSelect={handleMethodSelect} />
        </Box>

        <Box marginTop={2} paddingX={1} flexDirection="column">
          <Text color={inkColors.dim}>Configuration will be written to:</Text>
          <Text color={inkColors.dim}>  <Text color={inkColors.info}>{configPath}</Text></Text>
          <Box marginTop={1}>
            <Text color={inkColors.dim}>Hook script will be installed at:</Text>
          </Box>
          <Text color={inkColors.dim}>  <Text color={inkColors.success}>{scriptPath}</Text></Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text color={inkColors.dim}>Use arrow keys to select, Enter to confirm</Text>
        </Box>
      </Box>
    );
  }

  // Installing
  if (step === 'installing') {
    const configPath = location === 'user'
      ? path.join(os.homedir(), '.claude', 'settings.json')
      : path.join(process.cwd(), '.claude', 'settings.local.json');

    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="single" borderColor={inkColors.warning} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.warning}>
            Installing...
          </Text>
        </Box>

        <Box paddingX={1} flexDirection="column">
          <Text>
            {colors.warning('●')} Installing hook script...
          </Text>
          <Text>
            {colors.warning('●')} Updating <Text color={inkColors.info}>{configPath}</Text>...
          </Text>
        </Box>
      </Box>
    );
  }

  // Complete
  if (step === 'complete') {
    const scriptPath = path.join(os.homedir(), '.config', 'claude-code', 'claude-commander-hook.sh');

    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="double" borderColor={inkColors.success} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.success}>
            ✓ Setup Complete!
          </Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text bold color={inkColors.text}>Files configured:</Text>
          <Text>  • Config: <Text color={inkColors.info}>{configPath}</Text></Text>
          {useScript && <Text>  • Script: <Text color={inkColors.success}>{scriptPath}</Text></Text>}
        </Box>

        {onComplete ? (
          // Running from main app - will transition to monitoring
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text bold color={inkColors.text}>Next steps:</Text>
            <Text>  1. Start a Claude Code session (in another terminal)</Text>
            <Text>  2. Events will appear here in real-time!</Text>
          </Box>
        ) : (
          // Running standalone setup - will exit
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text bold color={inkColors.text}>Next steps:</Text>
            <Text>  1. Start a Claude Code session</Text>
            <Text>  2. Run: <Text color={inkColors.info}>claude-commander</Text></Text>
            <Text>  3. Watch events appear in real-time!</Text>
          </Box>
        )}

        <Box marginTop={1} paddingX={1} borderStyle="single" borderColor={inkColors.info} padding={1}>
          <Text color={inkColors.dim}>
            💡 Tip: Use keyboard shortcuts in Claude Commander:
            {'\n'}   • 1-6: Toggle event types
            {'\n'}   • f: Toggle filters
            {'\n'}   • c: Clear events
            {'\n'}   • q: Quit
          </Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text>
            Press <Text bold color={inkColors.success}>SPACE</Text> to {onComplete ? 'start monitoring' : 'exit'}
          </Text>
        </Box>
      </Box>
    );
  }

  // Error
  if (step === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="double" borderColor={inkColors.error} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.error}>
            ✗ Setup Failed
          </Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={inkColors.error}>An error occurred during setup:</Text>
          <Text>{error}</Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text color={inkColors.dim}>
            Please check the error message above and try again, or report this issue on GitHub.
          </Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text>
            Press <Text bold color={inkColors.success}>SPACE</Text> or <Text bold color={inkColors.error}>q</Text> to exit
          </Text>
        </Box>
      </Box>
    );
  }

  return null;
};
