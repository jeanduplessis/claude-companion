import React from 'react';
import { Box, Text } from 'ink';
import { ViewType, VIEW_TABS } from '../types/navigation.js';
import { inkColors } from '../theme/colors.js';

interface NavBarProps {
  currentView: ViewType;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView }) => {
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
              {tab.label}
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
