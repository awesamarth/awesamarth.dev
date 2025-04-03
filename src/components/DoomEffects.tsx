// components/DoomEffects.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

export function DoomEffects() {
  const { theme } = useTheme()
  const gunshotSoundRef = useRef<HTMLAudioElement | null>(null)
  const isDoom = theme === 'doom'
  
  // Initialize audio elements
  useEffect(() => {
    gunshotSoundRef.current = new Audio('/gunshot.mp3')
  }, [])
  
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
  
  // Handle click sounds
  useEffect(() => {
    const handleClick = () => {
      if (isDoom && gunshotSoundRef.current) {
        // Reset the audio to the beginning if it's already playing
        gunshotSoundRef.current.pause();
        gunshotSoundRef.current.currentTime = 0;
        
        // Play the gunshot sound
        gunshotSoundRef.current.volume = 0.3;
        gunshotSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    }
    
    if (isDoom) {
      document.addEventListener('click', handleClick);
    }
    
    return () => {
      document.removeEventListener('click', handleClick);
    }
  }, [isDoom])
  
  // This component doesn't render anything visible
  return null
}