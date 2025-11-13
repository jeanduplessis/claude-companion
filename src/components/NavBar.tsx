import React from 'react';
import { Box, Text } from 'ink';
import { ViewType, VIEW_TABS } from '../types/navigation.js';
import { inkColors } from '../theme/colors.js';

interface NavBarProps {
  currentView: ViewType;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView }) => {
  // Highlight the shortcut key in the label
  const renderLabel = (label: string, shortcut: string, isActive: boolean) => {
    const shortcutUpper = shortcut.toUpperCase();
    const index = label.toUpperCase().indexOf(shortcutUpper);

    if (index === -1) {
      return label;
    }

    const before = label.substring(0, index);
    const key = label.substring(index, index + 1);
    const after = label.substring(index + 1);

    return (
      <>
        {before}
        <Text bold underline>{key}</Text>
        {after}
      </>
    );
  };

  return (
    <Box borderStyle="single" borderColor={inkColors.border} paddingX={1}>
      {VIEW_TABS.map((tab, index) => {
        const isActive = tab.id === currentView;
        const isLast = index === VIEW_TABS.length - 1;

        return (
          <React.Fragment key={tab.id}>
            <Text
              bold={isActive}
              color={isActive ? inkColors.borderAccent : inkColors.dim}
              backgroundColor={isActive ? inkColors.border : undefined}
            >
              {renderLabel(tab.label, tab.shortcut, isActive)}
            </Text>
            {!isLast && (
              <Text color={inkColors.dim}> | </Text>
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
};
