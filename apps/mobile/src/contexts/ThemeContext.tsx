import React, { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, type SemanticTheme } from '@pocketdev/shared/theme';

interface ThemeContextValue {
  isDark: boolean;
  colors: SemanticTheme;
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightTheme as SemanticTheme,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <ThemeContext.Provider value={{ isDark, colors: (isDark ? darkTheme : lightTheme) as SemanticTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useIsDarkMode() {
  return useContext(ThemeContext).isDark;
}
