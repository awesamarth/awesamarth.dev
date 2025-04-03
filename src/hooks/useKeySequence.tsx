// hooks/useKeySequence.ts
'use client'

import { useEffect, useState, useRef } from 'react'
import { useTheme } from 'next-themes'

export function useKeySequence(sequence: string) {
  const [keys, setKeys] = useState<string[]>([])
  const { theme, setTheme } = useTheme()
  const unlockedSoundRef = useRef<HTMLAudioElement | null>(null)

  
  // Add this effect to check for doom theme on page load
  useEffect(() => {
    // If the page loads with doom theme, revert to the previous theme or system
    if (theme === 'doom') {
      const savedTheme = localStorage.getItem('previousTheme') || 'system'
      setTheme(savedTheme)
      localStorage.removeItem('previousTheme')
      unlockedSoundRef.current = new Audio('/unlocked.mp3')

    }
  }, [])

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

          if (unlockedSoundRef.current) {
            unlockedSoundRef.current.volume = 0.1
            unlockedSoundRef.current.play().catch(e => console.log('Audio play failed:', e))
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