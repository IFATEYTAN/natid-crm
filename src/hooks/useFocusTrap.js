import { useEffect, useRef } from 'react';

/**
 * Hook that traps focus within a container element.
 * Used for modals, dialogs, and sheets.
 *
 * @param {boolean} isActive - Whether the focus trap is active
 * @returns {React.RefObject} - Ref to attach to the container element
 */
export function useFocusTrap(isActive = false) {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Save current focus to restore later
    previousFocusRef.current = document.activeElement;

    // Focus first focusable element
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab' || !containerRef.current) return;

      const focusable = containerRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore previous focus
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

export default useFocusTrap;
