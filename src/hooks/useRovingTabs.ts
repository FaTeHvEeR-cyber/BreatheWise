import { useCallback, useRef } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

export interface UseRovingTabsReturn<T extends string> {
  registerTabRef: (id: T) => (el: HTMLButtonElement | null) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => void;
  tabRefs: RefObject<Partial<Record<T, HTMLButtonElement | null>>>;
}

export function useRovingTabs<T extends string>(
  tabs: readonly T[],
  onSelect: (tab: T) => void,
): UseRovingTabsReturn<T> {
  const tabRefs = useRef<Partial<Record<T, HTMLButtonElement | null>>>({});

  const registerTabRef = useCallback(
    (id: T) => (el: HTMLButtonElement | null) => {
      tabRefs.current[id] = el;
    },
    [],
  );

  const focusTabAt = useCallback(
    (index: number) => {
      const targetId = tabs[index];
      if (!targetId) {
        return;
      }
      onSelect(targetId);
      tabRefs.current[targetId]?.focus();
    },
    [tabs, onSelect],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (tabs.length === 0) {
        return;
      }

      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault();
          focusTabAt((currentIndex + 1) % tabs.length);
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          focusTabAt((currentIndex - 1 + tabs.length) % tabs.length);
          break;
        }
        case 'Home': {
          event.preventDefault();
          focusTabAt(0);
          break;
        }
        case 'End': {
          event.preventDefault();
          focusTabAt(tabs.length - 1);
          break;
        }
        default:
          break;
      }
    },
    [tabs, focusTabAt],
  );

  return {
    registerTabRef,
    handleKeyDown,
    tabRefs,
  };
}
