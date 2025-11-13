export type ViewType = 'dashboard' | 'events' | 'context' | 'git' | 'todos' | 'otel';

export interface ViewTab {
  id: ViewType;
  label: string;
  shortcut: string; // keyboard shortcut to access
}

export const VIEW_TABS: ViewTab[] = [
  { id: 'dashboard', label: 'Dashboard', shortcut: 'd' },
  { id: 'events', label: 'Events', shortcut: 'e' },
  { id: 'otel', label: 'OTel Metrics', shortcut: 'o' },
  { id: 'context', label: 'Context Window', shortcut: 'w' },
  { id: 'git', label: 'Git', shortcut: 'g' },
  { id: 'todos', label: 'Todos', shortcut: 't' }
];
