export type ViewType = 'dashboard' | 'hooks' | 'context' | 'git' | 'todos';

export interface ViewTab {
  id: ViewType;
  label: string;
  shortcut: string; // keyboard shortcut to access
}

export const VIEW_TABS: ViewTab[] = [
  { id: 'dashboard', label: 'Dashboard', shortcut: 'd' },
  { id: 'hooks', label: 'Hooks', shortcut: 'h' },
  { id: 'context', label: 'Context Window', shortcut: 'w' },
  { id: 'git', label: 'Git', shortcut: 'g' },
  { id: 'todos', label: 'Todos', shortcut: 't' }
];
