// components/DoomEffects.tsx
'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function DoomEffects() {
  const { theme } = useTheme()
  const isDoom = theme === 'doom'
  
  // Handle cursor change
  useEffect(() => {
    if (isDoom) {
      // Apply crosshair cursor directly
      applyCursorStyles('crosshair');
    } else {
      // Reset cursor styles
      resetCursorStyles();
    }
    
    return () => {
      // Cleanup
      resetCursorStyles();
    }
  }, [isDoom])
  
  function applyCursorStyles(cursorValue: string) {
    document.documentElement.style.cursor = cursorValue;
    document.body.style.cursor = cursorValue;
    
    const styleTag = document.createElement('style');
    styleTag.id = 'doom-cursor-style';
    styleTag.textContent = `
      * {
        cursor: ${cursorValue} !important;
      }
    `;
    document.head.appendChild(styleTag);
  }
  
  function resetCursorStyles() {
    document.documentElement.style.cursor = '';
    document.body.style.cursor = '';
    
    const styleTag = document.getElementById('doom-cursor-style');
    if (styleTag) {
      styleTag.remove();
    }
  }
  
  // This component doesn't render anything visible
  return null
}