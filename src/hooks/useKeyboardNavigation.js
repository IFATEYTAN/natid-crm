import { useEffect, useCallback } from 'react';

/**
 * Hook for keyboard navigation in lists and tables.
 * Handles arrow keys, Enter, and Escape.
 *
 * @param {Object} options
 * @param {number} options.itemCount - Total number of navigable items
 * @param {number} options.selectedIndex - Currently selected index
 * @param {Function} options.onSelect - Called when item is activated (Enter)
 * @param {Function} options.onNavigate - Called with new index on arrow key
 * @param {Function} options.onEscape - Called on Escape key
 * @param {boolean} options.enabled - Whether keyboard navigation is active
 */
export function useKeyboardNavigation({
  itemCount = 0,
  selectedIndex = -1,
  onSelect,
  onNavigate,
  onEscape,
  enabled = true,
}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled || itemCount === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          onNavigate?.(Math.min(selectedIndex + 1, itemCount - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onNavigate?.(Math.max(selectedIndex - 1, 0));
          break;
        case 'Enter':
          if (selectedIndex >= 0) {
            e.preventDefault();
            onSelect?.(selectedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onEscape?.();
          break;
        case 'Home':
          e.preventDefault();
          onNavigate?.(0);
          break;
        case 'End':
          e.preventDefault();
          onNavigate?.(itemCount - 1);
          break;
      }
    },
    [enabled, itemCount, selectedIndex, onSelect, onNavigate, onEscape]
  );

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return { handleKeyDown };
}

export default useKeyboardNavigation;
