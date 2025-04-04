// hooks/useKeySequence.ts
'use client'

import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'

export function useKeySequence(sequence: string) {
  const [keys, setKeys] = useState<string[]>([])
  const { theme, setTheme } = useTheme()
  const unlockedSoundRef = useRef<HTMLAudioElement | null>(null)
  
  // Initialize audio on component mount, regardless of theme
  useEffect(() => {
    // Create the audio element once on mount
    unlockedSoundRef.current = new Audio('/unlocked.mp3')
    
    // Check if the page loaded with doom theme
    if (theme === 'doom') {
      const savedTheme = localStorage.getItem('previousTheme') || 'system'
      setTheme(savedTheme)
      localStorage.removeItem('previousTheme')
    }
    
    // Cleanup function
    return () => {
      if (unlockedSoundRef.current) {
        unlockedSoundRef.current = null
      }
    }
  }, []) // Empty dependency array - only runs once on mount
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const newKeys = [...keys, event.key.toLowerCase()]
      
      // Keep only the most recent keys that could match the sequence
      if (newKeys.length > sequence.length) {
        newKeys.shift()
      }
      
      setKeys(newKeys)
      
      // Check if the sequence matches
      const enteredSequence = newKeys.join('')
      const targetSequence = sequence.toLowerCase()
      
      if (enteredSequence === targetSequence) {
        // Toggle DOOM theme
        if (theme === 'doom') {
          // Return to previous theme
          const savedTheme = localStorage.getItem('previousTheme') || 'system'
          setTheme(savedTheme)
          localStorage.removeItem('previousTheme')
        } else {
          // Store current theme before switching to DOOM
          localStorage.setItem('previousTheme', theme || 'system')
          setTheme('doom')
          
          // Play sound only after ensuring it's loaded
          if (unlockedSoundRef.current) {
            // Make sure the audio is ready
            unlockedSoundRef.current.load();
            unlockedSoundRef.current.volume = 0.1;
            
            // Use a timeout to ensure the audio context is ready
            setTimeout(() => {
              unlockedSoundRef.current?.play().catch(e => {
                console.log('Audio play failed:', e);
                // Try one more time after a user interaction
                document.addEventListener('click', function playOnce() {
                  unlockedSoundRef.current?.play();
                  document.removeEventListener('click', playOnce);
                }, { once: true });
              });
            }, 50);
          }
        }
        
        // Reset the key sequence
        setKeys([])
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [keys, sequence, theme, setTheme])

  return theme === 'doom'
}