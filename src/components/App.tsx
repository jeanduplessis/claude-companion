import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useApp, useInput, useStdout, Key } from 'ink';
import { LogManager } from '../log/LogManager.js';
import { SessionDiscovery } from '../log/SessionDiscovery.js';
import { Session } from '../types/events.js';
import { useEvents } from '../state/useEvents.js';
import { useFilters } from '../state/useFilters.js';
import { useOtelMetrics } from '../state/useOtelMetrics.js';
import { ViewType } from '../types/navigation.js';
import { StatusBar } from './StatusBar.js';
import { NavBar } from './NavBar.js';
import { SessionSwitchPrompt } from './SessionSwitchPrompt.js';
import { HelpScreen } from './HelpScreen.js';
import { DashboardView } from './views/DashboardView.js';
import { EventsView } from './views/EventsView.js';
import { ContextWindowView } from './views/ContextWindowView.js';
import { GitView } from './views/GitView.js';
import { TodosView } from './views/TodosView.js';
import { OtelDashboard } from './OtelDashboard.js';
import { getDefaultCollectorPaths } from '../otel/CollectorConfigGenerator.js';
import { colors, inkColors } from '../theme/colors.js';

interface AppProps {
  sessionId?: string;
}

export const App: React.FC<AppProps> = ({ sessionId: providedSessionId }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [session, setSession] = useState<Session | null>(null);
  const [pendingNewSession, setPendingNewSession] = useState<Session | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0); // 0 = newest event
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [showHelp, setShowHelp] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Track if any modal/prompt is open

  const logManager = useMemo(() => new LogManager(), []);
  const sessionDiscovery = useMemo(() => new SessionDiscovery(logManager), [logManager]);

  // Clear terminal on mount
  useEffect(() => {
    if (stdout) {
      // Clear screen and move cursor to top-left
      stdout.write('\x1b[2J\x1b[H');
    }
  }, []);

  // Initialize session
  useEffect(() => {
    // Clean up stale logs first
    logManager.cleanupStaleLogs();

    if (providedSessionId) {
      // Use provided session ID
      const logPath = logManager.getLogPath(providedSessionId);
      if (logManager.isLogActive(logPath)) {
        const metadata = logManager.readMetadata(providedSessionId);
        setSession({
          sessionId: providedSessionId,
          logPath,
          metadata: metadata || undefined,
          isActive: true
        });
      } else {
        setError(`Session ${providedSessionId} not found or inactive`);
      }
    } else {
      // Auto-discover latest session
      const latestSession = sessionDiscovery.getLatestSession();
      if (latestSession) {
        setSession(latestSession);
      } else {
        setError('No active Claude Code sessions found');
      }
    }

    // Watch for new sessions
    sessionDiscovery.watchForSessions((newSession) => {
      setSession((prevSession) => {
        if (!prevSession) {
          // No current session, automatically use the new one
          setError(null);
          return newSession;
        } else if (prevSession.sessionId !== newSession.sessionId) {
          // New session detected while one is already active, prompt user to switch
          setPendingNewSession(newSession);
        }
        return prevSession;
      });
    });

    return () => {
      sessionDiscovery.stopWatching();
    };
  }, [providedSessionId]);

  // Event streaming
  const { events, connectionStatus, error: connectionError, clearEvents } = useEvents(
    session?.logPath || null
  );

  // Filtering
  const {
    filteredEvents,
    filterState,
    toggleEventType,
    clearFilters
  } = useFilters(events);

  // OTel Metrics
  const otelPaths = useMemo(() => {
    if (!session) return { logsPath: null, metricsPath: null };
    const paths = getDefaultCollectorPaths(session.sessionId);
    return {
      logsPath: paths.logsPath,
      metricsPath: paths.metricsPath,
    };
  }, [session?.sessionId]);

  const { metrics: otelMetrics, isConnected: otelConnected } = useOtelMetrics(
    session?.sessionId || '',
    otelPaths.logsPath,
    otelPaths.metricsPath
  );

  // Only auto-scroll to newest event if user is already at the newest position
  // If user has scrolled back, maintain their position
  useEffect(() => {
    setSelectedIndex((prevIndex) => {
      // If user is at the newest event (index 0), keep them there as new events arrive
      if (prevIndex === 0) {
        return 0;
      }
      // Otherwise, maintain their scroll position, but ensure it's within bounds
      // (in case filters changed and reduced the event count)
      return Math.min(prevIndex, Math.max(0, filteredEvents.length - 1));
    });
  }, [filteredEvents.length]);

  // Manual retry function
  const retryConnection = () => {
    setError(null);

    if (providedSessionId) {
      const logPath = logManager.getLogPath(providedSessionId);
      if (logManager.isLogActive(logPath)) {
        const metadata = logManager.readMetadata(providedSessionId);
        setSession({
          sessionId: providedSessionId,
          logPath,
          metadata: metadata || undefined,
          isActive: true
        });
      } else {
        setError(`Session ${providedSessionId} not found or inactive`);
      }
    } else {
      const latestSession = sessionDiscovery.getLatestSession();
      if (latestSession) {
        setSession(latestSession);
      } else {
        setError('No active Claude Code sessions found');
      }
    }
  };

  // Switch to the new session
  const switchToNewSession = () => {
    if (pendingNewSession) {
      setSession(pendingNewSession);
      setPendingNewSession(null);
      setSelectedIndex(0); // Reset scroll position for new session
      clearEvents(); // Clear events from the old session
    }
  };

  // Ignore the new session prompt
  const ignoreNewSession = () => {
    setPendingNewSession(null);
  };

  // Calculate dynamic heights based on terminal size
  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;

  // Calculate fixed heights
  const headerHeight = 3; // Border + padding
  const statusBarHeight = 2;
  const filterBarHeight = showFilters ? 3 : 0;
  const sessionPromptHeight = pendingNewSession ? 4 : 0;
  const footerHeight = 3;
  const fixedHeight = headerHeight + statusBarHeight + filterBarHeight + sessionPromptHeight + footerHeight;

  // Available space for EventList and EventDetail
  const availableHeight = Math.max(10, terminalHeight - fixedHeight);

  // EventList shows max 20 events + padding, give the rest to EventDetail
  const maxEventsToShow = 20;
  const eventListHeight = Math.min(maxEventsToShow + 2, availableHeight - 6); // +2 for padding, ensure detail gets at least 6 lines
  const eventDetailHeight = Math.max(6, availableHeight - eventListHeight);

  // Keyboard shortcuts
  useInput((input: string, key: Key) => {
    // Help screen toggle
    if (input === '?') {
      setShowHelp(prev => !prev);
      return;
    }

    // Close help screen with any key
    if (showHelp) {
      setShowHelp(false);
      return;
    }

    if (input === 'q' || (key.ctrl && input === 'c')) {
      exit();
    } else if (input === 'd') {
      // Switch to Dashboard view
      setCurrentView('dashboard');
    } else if (input === 'e') {
      // Switch to Events view
      setCurrentView('events');
    } else if (input === 'w') {
      // Switch to Context Window view
      setCurrentView('context');
    } else if (input === 'g') {
      // Switch to Git view
      setCurrentView('git');
    } else if (input === 't') {
      // Switch to Todos view
      setCurrentView('todos');
    } else if (input === 'o') {
      // Switch to OTel view
      setCurrentView('otel');
    } else if (key.upArrow && currentView === 'events') {
      // Scroll up to older events (only in Events view)
      setSelectedIndex((prev) => Math.min(prev + 1, filteredEvents.length - 1));
    } else if (key.downArrow && currentView === 'events') {
      // Scroll down to newer events (only in Events view)
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (pendingNewSession && input === 's') {
      // Switch to new session
      switchToNewSession();
    } else if (pendingNewSession && input === 'i') {
      // Ignore new session
      ignoreNewSession();
    } else if (error && input === 'r') {
      // Retry connection when in error state
      retryConnection();
    } else if (input === 'f' && currentView === 'events') {
      // Toggle filters (only in Events view)
      setShowFilters(!showFilters);
    } else if (input === 'c' && currentView === 'events') {
      // Clear events (only in Events view)
      setSelectedIndex(0); // Reset scroll position when clearing
      clearEvents();
    } else if (input === 'r' && !error && currentView === 'events') {
      // Reset filters (only in Events view)
      setSelectedIndex(0); // Reset scroll position when resetting filters
      clearFilters();
    } else if (input === '1' && currentView === 'events') {
      toggleEventType('ToolUse');
    } else if (input === '2' && currentView === 'events') {
      toggleEventType('UserPromptSubmit');
    } else if (input === '3' && currentView === 'events') {
      toggleEventType('Notification');
    } else if (input === '4' && currentView === 'events') {
      toggleEventType('SessionStart');
    } else if (input === '5' && currentView === 'events') {
      toggleEventType('SessionEnd');
    }
  }, { isActive: !isModalOpen && !showHelp });

  // Display error if exists
  if (error || connectionError) {
    return (
      <Box flexDirection="column" padding={1} width={terminalWidth} height={terminalHeight}>
        <Box borderStyle="double" borderColor={inkColors.warning} paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.warning}>
            Claude Companion - Waiting for Session
          </Text>
        </Box>

        <Box marginY={1} paddingX={1}>
          <Text color={inkColors.warning}>{error || connectionError?.message}</Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={inkColors.dim}>
            {colors.warning('●')} Watching for new Claude Code sessions...
          </Text>
          <Text color={inkColors.dim}>
            When you start a Claude Code session, it will appear here automatically.
          </Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="single" borderColor={inkColors.info} padding={1}>
          <Text bold color={inkColors.text}>What to do:</Text>
          <Text>  1. Open a terminal and start Claude Code</Text>
          <Text>  2. Wait for the session to be detected automatically</Text>
          <Text>  3. Or press <Text bold color={inkColors.success}>r</Text> to retry manually</Text>
        </Box>

        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={inkColors.dim}>Make sure hooks are configured:</Text>
          <Text color={inkColors.dim}>  • Run <Text bold>claude-companion setup</Text> if you haven't</Text>
          <Text color={inkColors.dim}>  • Check <Text bold>~/.claude/settings.json</Text> has hooks configured</Text>
        </Box>

        <Box marginTop={1} paddingX={1}>
          <Text>
            <Text bold color={inkColors.success}>r</Text>: retry | <Text bold color={inkColors.error}>q</Text>: quit
          </Text>
        </Box>
      </Box>
    );
  }

  // Render view content based on currentView
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            session={session}
            connectionStatus={connectionStatus}
            eventCount={events.length}
          />
        );
      case 'events':
        return (
          <EventsView
            session={session}
            filteredEvents={filteredEvents}
            filterState={filterState}
            showFilters={showFilters}
            selectedIndex={selectedIndex}
            eventListHeight={eventListHeight}
            eventDetailHeight={eventDetailHeight}
            terminalWidth={terminalWidth}
            onToggleEventType={toggleEventType}
          />
        );
      case 'context':
        return <ContextWindowView />;
      case 'git':
        return <GitView session={session} terminalWidth={terminalWidth} onModalStateChange={setIsModalOpen} />;
      case 'todos':
        return <TodosView events={events} />;
      case 'otel':
        return <OtelDashboard metrics={otelMetrics} isConnected={otelConnected} />;
      default:
        return null;
    }
  };

  // Help text based on current view (contextual only)
  const getHelpText = () => {
    if (pendingNewSession) {
      return 's: switch to new session | i: ignore | ?: help | q: quit';
    }

    if (currentView === 'events') {
      return '↑↓: scroll | f: toggle filters | c: clear | r: reset | 1-6: toggle types | ?: help | q: quit';
    }

    if (currentView === 'git') {
      return '↑↓: select file | Enter: stage/unstage | Shift+A: stage all | Shift+C: commit | PgUp/PgDn: scroll diff | r: refresh | ?: help | q: quit';
    }

    return '?: help | q: quit';
  };

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box borderStyle="double" borderColor={inkColors.borderAccent} paddingX={1}>
        <Text bold color={inkColors.borderAccent}>
          Claude Companion
        </Text>
      </Box>

      {/* Navigation Bar */}
      <NavBar currentView={currentView} />

      {/* Status Bar */}
      <StatusBar
        session={session}
        connectionStatus={connectionStatus}
        eventCount={events.length}
        filteredCount={filteredEvents.length}
      />

      {/* Session Switch Prompt */}
      {pendingNewSession && session && (
        <SessionSwitchPrompt
          currentSession={session}
          newSession={pendingNewSession}
        />
      )}

      {/* View Content */}
      {!showHelp && renderView()}

      {/* Help Screen */}
      {showHelp && (
        <Box flexGrow={1} padding={2}>
          <HelpScreen />
        </Box>
      )}

      {/* Help Footer */}
      <Box borderStyle="single" borderColor={inkColors.border} paddingX={1}>
        <Text color={inkColors.dim}>
          {getHelpText()}
        </Text>
      </Box>
    </Box>
  );
};
