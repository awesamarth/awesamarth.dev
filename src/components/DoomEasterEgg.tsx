// components/DoomEasterEgg.tsx
'use client'

import { useKeySequence } from '@/hooks/useKeySequence'
import { useEffect } from 'react'

export function DoomEasterEgg() {
  // Initialize the hook with the "idkfa" sequence
  const isDoomActive = useKeySequence('idkfa')
  
  // Optional: Play a sound effect when DOOM mode is activated/deactivated
  useEffect(() => {
    if (isDoomActive) {
      console.log('DOOM mode activated! All weapons and keys acquired!')
      // You could play a sound here
      // new Audio('/sounds/doom-weapon.mp3').play().catch(e => console.log(e))
    }
  }, [isDoomActive])

  // This component doesn't render anything visible
  return null
}