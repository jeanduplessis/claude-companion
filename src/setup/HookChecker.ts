import fs from 'fs';
import path from 'path';
import os from 'os';

export interface HookCheckResult {
  isConfigured: boolean;
  hasUserHooks: boolean;
  hasProjectHooks: boolean;
  userConfigPath?: string;
  projectConfigPath?: string;
  details: string;
}

export class HookChecker {
  private readonly userConfigDir: string;
  private readonly projectConfigDir: string;

  constructor() {
    // Claude Code reads hooks from ~/.claude/settings.json for user settings
    this.userConfigDir = path.join(os.homedir(), '.claude');
    this.projectConfigDir = path.join(process.cwd(), '.claude');
  }

  /**
   * Check if Claude Code hooks are configured
   */
  check(): HookCheckResult {
    const userSettings = path.join(this.userConfigDir, 'settings.json');
    const userHooksTs = path.join(this.userConfigDir, 'hooks.ts');
    const projectSettings = path.join(this.projectConfigDir, 'settings.local.json');
    const projectHooksTs = path.join(this.projectConfigDir, 'hooks.ts');

    // Check for hooks in user settings.json
    const hasUserSettingsHooks = this.hasHooksInSettings(userSettings);
    const hasUserTs = fs.existsSync(userHooksTs);

    // Check for hooks in project settings.local.json
    const hasProjectSettingsHooks = this.hasHooksInSettings(projectSettings);
    const hasProjectTs = fs.existsSync(projectHooksTs);

    const hasUserHooks = hasUserSettingsHooks || hasUserTs;
    const hasProjectHooks = hasProjectSettingsHooks || hasProjectTs;
    const isConfigured = hasUserHooks || hasProjectHooks;

    let details = '';
    let userConfigPath: string | undefined;
    let projectConfigPath: string | undefined;

    if (hasUserHooks) {
      userConfigPath = hasUserSettingsHooks ? userSettings : userHooksTs;
      details += `Found user hooks: ${userConfigPath}\n`;

      // Check if it's a claude-commander configuration
      if (this.isClaudeCommanderConfig(userConfigPath)) {
        details += '✓ User hooks configured for Claude Commander\n';
      } else {
        details += '⚠ User hooks exist but may not be configured for Claude Commander\n';
      }
    }

    if (hasProjectHooks) {
      projectConfigPath = hasProjectSettingsHooks ? projectSettings : projectHooksTs;
      details += `Found project hooks: ${projectConfigPath}\n`;

      // Check if it's a claude-commander configuration
      if (this.isClaudeCommanderConfig(projectConfigPath)) {
        details += '✓ Project hooks configured for Claude Commander\n';
      } else {
        details += '⚠ Project hooks exist but may not be configured for Claude Commander\n';
      }
    }

    if (!isConfigured) {
      details = 'No Claude Code hooks found.';
    }

    return {
      isConfigured,
      hasUserHooks,
      hasProjectHooks,
      userConfigPath,
      projectConfigPath,
      details: details.trim()
    };
  }

  /**
   * Check if settings file has hooks configured
   */
  private hasHooksInSettings(settingsPath: string): boolean {
    if (!fs.existsSync(settingsPath)) {
      return false;
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf8');
      const settings = JSON.parse(content);
      return settings.hooks && Object.keys(settings.hooks).length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if a config file is configured for Claude Commander
   */
  private isClaudeCommanderConfig(configPath: string): boolean {
    try {
      const content = fs.readFileSync(configPath, 'utf8');

      // Check for our markers
      if (configPath.endsWith('.json')) {
        // Check if JSON config mentions our hook script
        return content.includes('claude-commander-hook.sh') ||
               content.includes('claude-commander');
      } else if (configPath.endsWith('.ts')) {
        // Check if TS config imports our hook writer
        return content.includes('claude-commander/hooks') ||
               content.includes('getHookWriter');
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Quick check - just returns boolean
   */
  isConfigured(): boolean {
    return this.check().isConfigured;
  }

  /**
   * Get a user-friendly message about hook status
   */
  getStatusMessage(): string {
    const result = this.check();

    if (!result.isConfigured) {
      return 'Claude Code hooks are not configured for Claude Commander.';
    }

    const locations: string[] = [];
    if (result.hasUserHooks) locations.push('user settings');
    if (result.hasProjectHooks) locations.push('project settings');

    return `Hooks configured in ${locations.join(' and ')}.`;
  }
}
