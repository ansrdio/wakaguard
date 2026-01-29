'use client';

import { useEffect, useRef, ReactNode } from 'react';

interface AppShellProps {
  header: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}

/**
 * AppShell Component
 * 
 * Enforces a true app shell layout:
 * - 100dvh viewport with overflow-hidden
 * - Dynamically measures header and filter heights
 * - Sets CSS variables for precise height calculations
 * - Ensures no full-page scroll, only internal panel scrolling
 * 
 * CSS Variables Set:
 * - --app-header-h: Header height in px
 * - --app-filters-h: Filter bar height in px (0 if no filters)
 * - Main content automatically gets remaining height
 */
export function AppShell({ header, filters, children }: AppShellProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeights = () => {
      const headerHeight = headerRef.current?.offsetHeight || 0;
      const filtersHeight = filtersRef.current?.offsetHeight || 0;

      // Set CSS custom properties
      document.documentElement.style.setProperty('--app-header-h', `${headerHeight}px`);
      document.documentElement.style.setProperty('--app-filters-h', `${filtersHeight}px`);
    };

    // Initial measurement
    updateHeights();

    // Update on resize (debounced)
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateHeights, 100);
    };

    window.addEventListener('resize', handleResize);
    
    // Observer for when content changes (filters collapse, etc.)
    const observer = new ResizeObserver(updateHeights);
    if (headerRef.current) observer.observe(headerRef.current);
    if (filtersRef.current) observer.observe(filtersRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="h-[100dvh] overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header - Fixed */}
      <div ref={headerRef} className="flex-none">
        {header}
      </div>

      {/* Filter Bar - Fixed (if present) */}
      {filters && (
        <div ref={filtersRef} className="flex-none">
          {filters}
        </div>
      )}

      {/* Main Content - Remaining Height */}
      <main 
        className="flex-1 min-h-0 overflow-auto lg:overflow-hidden"
        style={{
          height: 'calc(100dvh - var(--app-header-h, 0px) - var(--app-filters-h, 0px))'
        }}
      >
        {children}
      </main>
    </div>
  );
}
