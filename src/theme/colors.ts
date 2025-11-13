import chalk from 'chalk';

/**
 * Catppuccin Mocha color palette
 * https://github.com/catppuccin/catppuccin
 */
export const catppuccin = {
  // Primary colors
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',

  // Text colors
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',

  // Surface colors
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b',
} as const;

/**
 * Chalk color functions using Catppuccin palette
 */
export const colors = {
  // Primary text
  text: chalk.hex(catppuccin.text),
  subtext: chalk.hex(catppuccin.subtext1),
  dim: chalk.hex(catppuccin.overlay0),

  // Event type colors
  preTool: chalk.hex(catppuccin.sapphire),
  postTool: chalk.hex(catppuccin.green),
  userPrompt: chalk.hex(catppuccin.yellow),
  notification: chalk.hex(catppuccin.mauve),
  sessionStart: chalk.hex(catppuccin.blue),
  sessionEnd: chalk.hex(catppuccin.red),

  // Status colors
  success: chalk.hex(catppuccin.green),
  warning: chalk.hex(catppuccin.yellow),
  error: chalk.hex(catppuccin.red),
  info: chalk.hex(catppuccin.blue),

  // UI elements
  border: chalk.hex(catppuccin.surface2),
  borderAccent: chalk.hex(catppuccin.lavender),

  // Interactive elements
  active: chalk.bgHex(catppuccin.mauve).hex(catppuccin.base),
  inactive: chalk.hex(catppuccin.overlay0),
  hover: chalk.hex(catppuccin.lavender),

  // Semantic colors
  link: chalk.hex(catppuccin.sapphire),
  highlight: chalk.hex(catppuccin.peach),
} as const;

/**
 * Color names for Ink components (hex values)
 */
export const inkColors = {
  border: catppuccin.surface2,
  borderAccent: catppuccin.lavender,
  text: catppuccin.text,
  dim: catppuccin.overlay0,
  success: catppuccin.green,
  warning: catppuccin.yellow,
  error: catppuccin.red,
  info: catppuccin.blue,
} as const;
