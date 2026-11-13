'use client'

// What's behind the website: a little piece of Knee-Deep in the Dead. The E1 sky, a row of UAC
// tech-base walls and animated nukage, all from the shareware WAD. One copy is rendered into each
// hole layer; it's fixed to the viewport, so every hole looks into the same scene.

import { useEffect, useRef, useState } from 'react'
import { spriteUrl } from './sprites'

const WALLS = ['STARTAN3', 'SUPPORT2', 'COMPTALL', 'SUPPORT2', 'BIGDOOR2', 'SUPPORT2', 'COMPSTA1', 'TEKWALL4', 'SUPPORT2', 'STARTAN3']
const WALL_WIDTH: Record<string, number> = { STARTAN3: 128, SUPPORT2: 64, COMPTALL: 256, BIGDOOR2: 128, COMPSTA1: 128, TEKWALL4: 128 }

export function Backdrop({ scale, statusBar }: { scale: number; statusBar: number }) {
  const [nukage, setNukage] = useState(1)
  const sky = useRef<HTMLDivElement>(null)
  const walls = useRef<HTMLDivElement>(null)

  // Flats animate every 8 tics, like the original.
  useEffect(() => {
    const t = setInterval(() => setNukage(n => (n % 3) + 1), (8 * 1000) / 35)
    return () => clearInterval(t)
  }, [])

  // Gentle parallax with the mouse and page scroll.
  useEffect(() => {
    let mx = 0
    const apply = () => {
      const y = window.scrollY
      if (sky.current) sky.current.style.backgroundPositionX = `${-(y * 0.12 + mx * 0.02)}px`
      if (walls.current) walls.current.style.transform = `translateX(${-(mx * 0.04) - 200}px)`
    }
    const onMove = (e: PointerEvent) => {
      mx = e.clientX - window.innerWidth / 2
      apply()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('scroll', apply, { passive: true })
    apply()
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', apply)
    }
  }, [])

  const ws = Math.max(1.5, scale * 0.75) // wall texture scale
  const wallH = 128 * ws
  const strip = Array.from({ length: 4 }, () => WALLS).flat()

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000', pointerEvents: 'none' }}>
      {/* Sky */}
      <div
        ref={sky}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: `calc(${statusBar}px + 18vh + ${wallH}px - 4px)`,
          backgroundImage: `url(${spriteUrl('SKY1')})`,
          backgroundRepeat: 'repeat-x',
          backgroundSize: `${256 * scale}px ${128 * scale}px`,
          backgroundPosition: '0 100%',
          backgroundColor: '#7f5f3f',
          imageRendering: 'pixelated',
        }}
      />
      {/* UAC walls */}
      <div
        ref={walls}
        style={{ position: 'absolute', left: 0, bottom: `calc(${statusBar}px + 18vh)`, height: wallH, display: 'flex', whiteSpace: 'nowrap' }}
      >
        {strip.map((name, i) => (
          <img
            key={i}
            src={spriteUrl(name)}
            alt=""
            draggable={false}
            style={{ height: wallH, width: WALL_WIDTH[name] * ws, maxWidth: 'none', imageRendering: 'pixelated', display: 'block' }}
          />
        ))}
      </div>
      {/* Nukage floor, in perspective */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: statusBar,
          height: '18vh',
          perspective: '260px',
          perspectiveOrigin: '50% 0%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-150%',
            right: '-150%',
            top: 0,
            height: '400%',
            transformOrigin: '50% 0%',
            transform: 'rotateX(72deg)',
            backgroundImage: `url(${spriteUrl(`NUKAGE${nukage}`)})`,
            backgroundSize: `${64 * scale}px ${64 * scale}px`,
            imageRendering: 'pixelated',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0) 60%)' }} />
      </div>
    </div>
  )
}
