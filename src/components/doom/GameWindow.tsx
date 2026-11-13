'use client'

// Real DOOM (Chocolate Doom compiled to WebAssembly, shareware E1) in a monitor window.
// The game runs in a same-origin iframe (/doom/game/) so its globals, keyboard and focus stay
// separate from the site. Closing pauses it (DOOM's own menu + muted audio); reopening resumes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { spriteUrl } from './sprites'

type Props = { open: boolean; onClose: () => void }

const W = 320
const H = 200

export function GameWindow({ open, onClose }: Props) {
  const iframe = useRef<HTMLIFrameElement>(null)
  const screen = useRef<HTMLDivElement>(null)
  const melt = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [melting, setMelting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const enterFullscreenRef = useRef<() => void>(() => {})
  const [session, setSession] = useState(0) // bumping it reloads the game iframe
  const [booted, setBooted] = useState(true) // false after Quit Game: no iframe (and no music) until reopened
  const readyRef = useRef(false)
  const runMeltRef = useRef<() => void>(() => {})

  const game = () => iframe.current?.contentWindow as (Window & { doom?: { pause(): void; resume(): void } }) | null

  const focusGame = useCallback(() => {
    const w = game()
    w?.doom?.resume()
    iframe.current?.focus()
    w?.focus()
  }, [])

  // f_wipe.c wipe_doMelt: 2px columns slide down with random staggered starts, 35 tics/s.
  const runMelt = useCallback(() => {
    const canvas = melt.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const title = new Image()
    title.src = spriteUrl('TITLEPIC')
    setMelting(true)
    title.decode().then(() => {
      const cols = W / 2
      const y = new Array<number>(cols)
      y[0] = -Math.floor(Math.random() * 16)
      for (let i = 1; i < cols; i++) y[i] = Math.min(0, Math.max(-15, y[i - 1] + Math.floor(Math.random() * 3) - 1))
      ctx.imageSmoothingEnabled = false
      const draw = () => {
        ctx.clearRect(0, 0, W, H)
        for (let i = 0; i < cols; i++) {
          const dy = Math.max(0, y[i])
          if (dy < H) ctx.drawImage(title, i * 2, 0, 2, H - dy, i * 2, dy, 2, H - dy)
        }
      }
      draw()
      const tick = () => {
        for (let i = 0; i < cols; i++) {
          if (y[i] < 0) y[i]++
          else if (y[i] < H) y[i] = Math.min(H, y[i] + (y[i] < 16 ? y[i] + 1 : 8))
        }
      }
      let last = 0
      let acc = 0
      const step = (now: number) => {
        acc += now - last
        last = now
        while (acc >= 1000 / 35) {
          acc -= 1000 / 35
          tick()
        }
        draw()
        if (y.every(v => v >= H)) {
          setMelting(false)
          focusGame()
        } else requestAnimationFrame(step)
      }
      // Hold the title screen briefly, then melt into the game.
      setTimeout(() => requestAnimationFrame(t => {
        last = t
        step(t)
      }), 450)
    })
  }, [focusGame])
  runMeltRef.current = runMelt

  // Messages from the game page.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== game() || e.data?.source !== 'doom') return
      if (e.data.type === 'ready' && !readyRef.current) {
        readyRef.current = true
        setReady(true)
        runMeltRef.current()
      } else if (e.data.type === 'close') onClose()
      else if (e.data.type === 'fullscreen') {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
        else enterFullscreenRef.current()
      }
      else if (e.data.type === 'quit') {
        // The engine has exited; close the window and boot a fresh game for next time.
        readyRef.current = false
        setReady(false)
        setMelting(true)
        setBooted(false)
        onClose()
      }
      else if (e.data.type === 'error') setError(String(e.data.message))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onClose])

  // Open/close: melt in (once loaded), pause and mute on close, lock page scroll while open.
  useEffect(() => {
    if (open) {
      document.documentElement.style.overflow = 'hidden'
      if (!booted) {
        setSession(n => n + 1)
        setBooted(true)
      }
      if (readyRef.current) runMeltRef.current()
      else {
        // Title screen while the engine and WAD download.
        const ctx = melt.current?.getContext('2d')
        const title = new Image()
        title.src = spriteUrl('TITLEPIC')
        title.decode().then(() => ctx?.drawImage(title, 0, 0))
      }
    } else {
      document.documentElement.style.overflow = ''
      game()?.doom?.pause()
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open, booted])

  // Backtick also closes when focus is on the site rather than the game.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Backquote') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // In fullscreen, Chrome/Edge let the page claim Esc (Keyboard Lock API): Esc goes to DOOM and
  // holding it leaves fullscreen. Other browsers fall back to "one Esc releases the mouse + menu".
  function enterFullscreen() {
    screen.current
      ?.requestFullscreen()
      .then(() => (navigator as Navigator & { keyboard?: { lock(keys: string[]): Promise<void> } }).keyboard?.lock(['Escape']).catch(() => {}))
      .then(focusGame)
      .catch(() => {})
  }
  enterFullscreenRef.current = enterFullscreen
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) (navigator as Navigator & { keyboard?: { unlock(): void } }).keyboard?.unlock()
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const font = 'var(--font-doom), monospace'

  return (
    <div
      data-doom-hud
      role="dialog"
      aria-modal="true"
      aria-label="DOOM"
      aria-hidden={!open}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        visibility: open ? 'visible' : 'hidden',
        opacity: open ? 1 : 0,
        transition: 'opacity 160ms ease, visibility 160ms',
        pointerEvents: open ? 'auto' : 'none',
        cursor: 'default',
      }}
    >
      {/* Monitor */}
      <div
        style={{
          width: 'min(80vw, calc((86vh - 96px) * 4 / 3))',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          padding: 14,
          paddingBottom: 10,
          borderRadius: 18,
          background: 'linear-gradient(#3a3a3a, #1c1c1c)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.6)',
          border: '1px solid #000',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, color: '#b8b8b8', fontFamily: font, fontSize: 10 }}>
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ready ? '#5f5' : '#f80', marginRight: 8, boxShadow: `0 0 6px ${ready ? '#5f5' : '#f80'}` }} />
            DOOM · E1M1 HANGAR
          </span>
          <span style={{ display: 'flex', gap: 6 }}>
            <BezelButton label="Fullscreen" onClick={enterFullscreen}>
              <Maximize2 size={13} strokeWidth={2.25} />
            </BezelButton>
            <BezelButton label="Close (`)" onClick={onClose}>
              <X size={14} strokeWidth={2.5} />
            </BezelButton>
          </span>
        </div>

        {/* Screen, 4:3 like a 1993 CRT */}
        <div
          ref={screen}
          style={{
            position: 'relative',
            aspectRatio: '4 / 3',
            background: '#000',
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 0 2px #000, 0 0 0 1px #444',
          }}
        >
          {booted && <iframe
            key={session}
            ref={iframe}
            src="/doom/game/index.html"
            title="DOOM"
            allow="autoplay; fullscreen"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
          />}
          <canvas
            ref={melt}
            width={W}
            height={H}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              imageRendering: 'pixelated',
              pointerEvents: 'none',
              display: melting ? 'block' : 'none',
            }}
          />
          {!ready && !error && <Notice font={font}>LOADING...</Notice>}
          {error && <Notice font={font}>{`ERROR: ${error.slice(0, 60)}`}</Notice>}
          {/* CRT scanlines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: 'repeating-linear-gradient(rgba(0,0,0,0.12) 0 1px, transparent 1px 3px)',
              mixBlendMode: 'multiply',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 16, rowGap: 2, marginTop: 9, color: '#8a8a8a', fontSize: 11, lineHeight: 1.4 }}>
          <span style={{ minWidth: 0 }}>Click to grab the mouse · WASD move · click fire · E use · 1-7 weapons · Esc menu · F fullscreen · ` close</span>
          <span style={{ whiteSpace: 'nowrap' }}>
            DOOM shareware © id Software · Engine:{' '}
            <a href="/doom/game/SOURCE.txt" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Chocolate Doom (GPL)
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}

function BezelButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        width: 26,
        height: 22,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        borderRadius: 5,
        border: '1px solid #000',
        background: 'linear-gradient(#4a4a4a, #2a2a2a)',
        color: '#ddd',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

function Notice({ font, children }: { font: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '8%',
        textAlign: 'center',
        color: '#fff',
        fontFamily: font,
        fontSize: 12,
        textShadow: '2px 2px 0 #000',
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  )
}
