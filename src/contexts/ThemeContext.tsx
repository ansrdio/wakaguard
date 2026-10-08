'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isPlainPage } from '@/lib/plainPages';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  const body = document.body;
  
  if (theme === 'dark') {
    html.classList.add('dark');
    body.classList.add('dark-mode');
    // Force style update
    html.style.colorScheme = 'dark';
  } else {
    html.classList.remove('dark');
    body.classList.remove('dark-mode');
    html.style.colorScheme = 'light';
  }
  
  // Force repaint
  void document.body.offsetHeight;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const plainPage = isPlainPage(usePathname());

  useEffect(() => {
    // Always start with light mode and ensure dark class is removed
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark-mode');
    
    // Check localStorage
    const stored = localStorage.getItem('wakaguard_theme') as Theme | null;
    const initialTheme = stored || 'light';
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('wakaguard_theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // Prevent flash of wrong theme. A plain page has no theme to get wrong.
  if (!mounted && !plainPage) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
