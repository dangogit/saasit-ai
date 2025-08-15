import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for implementing resizable panels
 * @param {number} initialWidth - Initial width of the panel
 * @param {number} minWidth - Minimum width constraint
 * @param {number} maxWidth - Maximum width constraint
 * @param {string} storageKey - localStorage key for persistence
 * @returns {object} Hook state and handlers
 */
export const useResizablePanel = (initialWidth, minWidth, maxWidth, storageKey) => {
  // Load width from localStorage if available
  const getStoredWidth = () => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsedWidth = parseInt(stored, 10);
        // Ensure stored value is within constraints
        return Math.max(minWidth, Math.min(maxWidth, parsedWidth));
      }
    }
    return initialWidth;
  };

  const [width, setWidth] = useState(getStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Save width to localStorage when it changes
  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, width.toString());
    }
  }, [width, storageKey]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;

    // Add global styles for resizing
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startXRef.current;
    const newWidth = startWidthRef.current + deltaX;
    
    // Apply constraints
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setWidth(constrainedWidth);
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    
    // Remove global styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isResizing]);

  // Add global event listeners for mouse events
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Function to programmatically set width (for auto-expand functionality)
  const setWidthAnimated = useCallback((newWidth, duration = 300) => {
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    setWidth(constrainedWidth);
  }, [minWidth, maxWidth]);

  // Reset to initial width
  const resetWidth = useCallback(() => {
    setWidth(initialWidth);
  }, [initialWidth]);

  return {
    width,
    isResizing,
    handleMouseDown,
    setWidth: setWidthAnimated,
    resetWidth,
    constraints: { minWidth, maxWidth }
  };
};

/**
 * Resize handle component for visual consistency
 */
export const ResizeHandle = ({ onMouseDown, orientation = 'vertical', className = '' }) => {
  const baseClasses = `
    absolute bg-transparent cursor-col-resize transition-all duration-200 z-10
    hover:bg-gradient-to-r hover:from-transparent hover:via-blue-500/30 hover:to-transparent
  `;
  
  const verticalClasses = `
    w-2 top-0 bottom-0 -right-1
    before:content-[''] before:absolute before:top-1/2 before:left-1/2 
    before:-translate-x-1/2 before:-translate-y-1/2 before:w-0.5 before:h-10 
    before:bg-gray-400 before:rounded-full before:transition-all before:duration-200
    hover:before:bg-blue-500 hover:before:h-12 hover:before:w-1
  `;

  const horizontalClasses = `
    h-2 left-0 right-0 -bottom-1 cursor-row-resize
    before:content-[''] before:absolute before:top-1/2 before:left-1/2 
    before:-translate-x-1/2 before:-translate-y-1/2 before:h-0.5 before:w-10 
    before:bg-gray-400 before:rounded-full before:transition-all before:duration-200
    hover:before:bg-blue-500 hover:before:w-12 hover:before:h-1
  `;

  const classes = `${baseClasses} ${orientation === 'vertical' ? verticalClasses : horizontalClasses} ${className}`;

  return (
    <div
      className={classes}
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={orientation}
      aria-label={`Resize ${orientation === 'vertical' ? 'width' : 'height'}`}
    />
  );
};

export default useResizablePanel;