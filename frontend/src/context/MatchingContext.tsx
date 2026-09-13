import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useMatching } from '../hooks/useMatching';
import type { UseMatchingReturn } from '../hooks/useMatching';

const MatchingContext = createContext<UseMatchingReturn | undefined>(undefined);

export const MatchingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const matchingState = useMatching();
  return (
    <MatchingContext.Provider value={matchingState}>
      {children}
    </MatchingContext.Provider>
  );
};

export const useMatchingContext = (): UseMatchingReturn => {
  const context = useContext(MatchingContext);
  if (!context) {
    throw new Error('useMatchingContext must be used within a MatchingProvider');
  }
  return context;
};
