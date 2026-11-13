'use client'

// DOOM HUD for the idkfa easter egg: the original status bar, Doomguy's face, first-person weapons
// (fists to BFG) and a page you can blow apart to reveal the DOOM world behind it.
// Graphics and sounds: shareware DOOM1.WAD v1.9 (BFG: Freedoom, recoloured), extracted into /public/doom.
// Layout and timings follow the original source (st_stuff.c, info.c, p_pspr.c).

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'next-themes'
import { loadManifest, spriteUrl, type Manifest } from './doom/sprites'
import { Destruction } from './doom/destruction'
import { Backdrop } from './doom/Backdrop'

type Weapon = 'fist' | 'pistol' | 'shotgun' | 'chaingun' | 'rocket' | 'bfg'
type Sfx = 'pistol' | 'shotgn' | 'punch' | 'plpain' | 'rlaunc' | 'barexp' | 'bfg' | 'rxplod'
type Flash = { sprite: string; tics: number }
type Frame = { sprite: string; tics: number; fire?: boolean; flash?: Flash[]; sound?: Sfx }
type Ammo = { bullets: number; shells: number; rockets: number; cells: number }

const TIC = 1000 / 35
const WEAPONTOP = 32
const WEAPONBOTTOM = 128
const SPEED = 6

// Weapon states from info.c
const SEQ: Record<Weapon, { ready: string; fire: Frame[] }> = {
  fist: {
    ready: 'PUNGA0',
    fire: [
      { sprite: 'PUNGB0', tics: 4 },
      { sprite: 'PUNGC0', tics: 4, fire: true },
      { sprite: 'PUNGD0', tics: 5 },
      { sprite: 'PUNGC0', tics: 4 },
      { sprite: 'PUNGB0', tics: 5 },
    ],
  },
  pistol: {
    ready: 'PISGA0',
    fire: [
      { sprite: 'PISGA0', tics: 4 },
      { sprite: 'PISGB0', tics: 6, fire: true, flash: [{ sprite: 'PISFA0', tics: 7 }] },
      { sprite: 'PISGC0', tics: 4 },
      { sprite: 'PISGB0', tics: 5 },
    ],
  },
  shotgun: {
    ready: 'SHTGA0',
    fire: [
      { sprite: 'SHTGA0', tics: 3 },
      { sprite: 'SHTGA0', tics: 7, fire: true, flash: [{ sprite: 'SHTFA0', tics: 4 }, { sprite: 'SHTFB0', tics: 3 }] },
      { sprite: 'SHTGB0', tics: 5 },
      { sprite: 'SHTGC0', tics: 5 },
      { sprite: 'SHTGD0', tics: 4 },
      { sprite: 'SHTGC0', tics: 5 },
      { sprite: 'SHTGB0', tics: 5 },
      { sprite: 'SHTGA0', tics: 3 },
      { sprite: 'SHTGA0', tics: 7 },
    ],
  },
  chaingun: {
    ready: 'CHGGA0',
    fire: [
      { sprite: 'CHGGA0', tics: 4, fire: true, flash: [{ sprite: 'CHGFA0', tics: 5 }] },
      { sprite: 'CHGGB0', tics: 4, fire: true, flash: [{ sprite: 'CHGFB0', tics: 5 }] },
    ],
  },
  rocket: {
    ready: 'MISGA0',
    fire: [
      { sprite: 'MISGB0', tics: 8, flash: [{ sprite: 'MISFA0', tics: 3 }, { sprite: 'MISFB0', tics: 4 }, { sprite: 'MISFC0', tics: 4 }, { sprite: 'MISFD0', tics: 4 }] },
      { sprite: 'MISGB0', tics: 12, fire: true },
    ],
  },
  bfg: {
    ready: 'BFGGA0',
    fire: [
      { sprite: 'BFGGA0', tics: 20, sound: 'bfg' },
      { sprite: 'BFGGB0', tics: 10, flash: [{ sprite: 'BFGFA0', tics: 11 }, { sprite: 'BFGFB0', tics: 6 }] },
      { sprite: 'BFGGB0', tics: 10, fire: true },
      { sprite: 'BFGGB0', tics: 20 },
    ],
  },
}
const SLOT: Record<string, Weapon> = { '1': 'fist', '2': 'pistol', '3': 'shotgun', '4': 'chaingun', '5': 'rocket', '7': 'bfg' }
const MAX_AMMO: Ammo = { bullets: 200, shells: 50, rockets: 50, cells: 300 }
const COST: Record<Weapon, [keyof Ammo, number] | null> = {
  fist: null,
  pistol: ['bullets', 1],
  shotgun: ['shells', 1],
  chaingun: ['bullets', 1],
  rocket: ['rockets', 1],
  bfg: ['cells', 40],
}
// Fallback order when a weapon runs dry (roughly P_CheckAmmo)
const PREFERENCE: Weapon[] = ['chaingun', 'shotgun', 'pistol', 'rocket', 'bfg', 'fist']
const SFX: Sfx[] = ['pistol', 'shotgn', 'punch', 'plpain', 'rlaunc', 'barexp', 'bfg', 'rxplod']
const OPENING_MESSAGES = ['VERY HAPPY AMMO ADDED', 'PRESS 1 FOR FISTS TO USE LINKS']

type HudSnapshot = {
  weapon: Weapon
  sprite: string
  flash: string | null
  sx: number
  sy: number
  face: string
  ammo: Ammo
  message: string
}

export function DoomHud() {
  const { theme } = useTheme()
  const [enabled, setEnabled] = useState(false)
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [scale, setScale] = useState(3)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [layers, setLayers] = useState<HTMLDivElement[]>([])
  const overlay = useRef<HTMLCanvasElement>(null)
  const greenFlash = useRef<HTMLDivElement>(null)
  const useLabel = useRef<HTMLDivElement>(null)
  const boom = useRef<Destruction | null>(null)
  const sfx = useRef<Partial<Record<Sfx, HTMLAudioElement>>>({})
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const g = useRef(freshState())
  const isDoom = theme === 'doom'

  // Desktop only (needs a mouse and keyboard), at an integer pixel scale.
  useEffect(() => {
    const check = () => {
      const fine = window.matchMedia('(pointer: fine)').matches && !('ontouchstart' in window)
      setEnabled(isDoom && fine && window.innerWidth >= 700)
      setScale(Math.max(2, Math.min(3, Math.floor((window.innerWidth - 64) / 320))))
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [isDoom])

  // Load assets and start fresh on every activation.
  useEffect(() => {
    if (!enabled) {
      setHud(null)
      return
    }
    let cancelled = false
    loadManifest().then(m => !cancelled && setManifest(m))
    for (const name of SFX) {
      const a = new Audio(`/doom/sfx/${name}.wav`)
      a.preload = 'auto'
      sfx.current[name] = a
    }
    g.current = freshState()
    return () => {
      cancelled = true
    }
  }, [enabled])

  // Page padding for the status bar.
  useEffect(() => {
    if (!enabled) return
    document.body.style.paddingBottom = `${32 * scale}px`
    document.documentElement.classList.toggle('doom-armed', g.current.weapon !== 'fist')
    return () => {
      document.body.style.paddingBottom = ''
      document.documentElement.classList.remove('doom-armed')
    }
  }, [enabled, scale])

  // The destruction engine lives as long as DOOM mode; leaving resets the page completely.
  useEffect(() => {
    if (!enabled || !manifest || !overlay.current) return
    const d = new Destruction(
      overlay.current,
      manifest,
      () => scaleRef.current,
      () => window.innerHeight - 32 * scaleRef.current,
      layer => setLayers(l => [...l, layer]),
    )
    boom.current = d
    return () => {
      d.dispose()
      boom.current = null
      setLayers([])
    }
  }, [enabled, manifest])

  function play(name: Sfx, volume = 0.2) {
    const base = sfx.current[name]
    if (!base) return
    const a = base.cloneNode() as HTMLAudioElement
    a.volume = volume
    a.play().catch(() => {})
  }

  function hasAmmo(w: Weapon) {
    const c = COST[w]
    return !c || g.current.ammo[c[0]] >= c[1]
  }

  function selectWeapon(w: Weapon) {
    const s = g.current
    if ((w === s.weapon && !s.pending) || !hasAmmo(w)) return
    s.pending = w
    if (s.phase !== 'firing') s.phase = 'lower'
  }

  function muzzle() {
    return { x: window.innerWidth / 2, y: window.innerHeight - 32 * scaleRef.current - 30 * scaleRef.current }
  }

  function fire() {
    const s = g.current
    const d = boom.current
    const { x, y, target } = s.pointer
    if (s.weapon === 'fist') {
      // The original only plays this on a hit; swinging silently at air just felt broken here.
      play('punch', target?.closest('a, button, [data-doom-target]') ? 0.25 : 0.15)
      return
    }
    const cost = COST[s.weapon]!
    s.ammo[cost[0]] -= cost[1]
    if (!d) return
    if (s.weapon === 'pistol' || s.weapon === 'chaingun') {
      play('pistol')
      const spread = s.refire || s.weapon === 'chaingun' ? 14 : 0 // the first pistol shot is accurate
      d.impact(x + (Math.random() - 0.5) * 2 * spread, y + (Math.random() - 0.5) * spread, 'bullet')
    } else if (s.weapon === 'shotgun') {
      play('shotgn')
      for (let i = 0; i < 7; i++) d.impact(x + (Math.random() - 0.5) * 100, y + (Math.random() - 0.5) * 44, 'pellet')
    } else if (s.weapon === 'rocket') {
      play('rlaunc')
      const m = muzzle()
      d.projectile({
        frames: ['MISLA1'],
        frameTics: 4,
        x0: m.x,
        y0: m.y,
        x1: x,
        y1: y,
        duration: Math.max(140, Math.hypot(x - m.x, y - m.y) / 2.2),
        s0: 2.6,
        s1: 1,
        onHit: () => {
          play('barexp', 0.3)
          d.anim(['MISLB0', 'MISLC0', 'MISLD0'], [8, 6, 4], x, y, 1.4)
          d.impact(x, y, 'rocket')
        },
      })
    } else if (s.weapon === 'bfg') {
      const m = muzzle()
      d.projectile({
        frames: ['BFS1A0', 'BFS1B0'],
        frameTics: 4,
        x0: m.x,
        y0: m.y,
        x1: x,
        y1: y,
        duration: Math.max(300, Math.hypot(x - m.x, y - m.y) / 0.9),
        s0: 2.2,
        s1: 1.4,
        onHit: () => {
          play('rxplod', 0.35)
          greenFlash.current?.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' })
          d.anim(['BFE1A0', 'BFE1B0', 'BFE1C0', 'BFE1D0', 'BFE1E0', 'BFE1F0'], [8, 8, 8, 8, 8, 8], x, y, 2.4)
          d.impact(x, y, 'bfg')
          // A_BFGSpray: 40 tracers, fired as the explosion reaches its third frame.
          setTimeout(() => {
            const reach = Math.hypot(window.innerWidth, window.innerHeight) * 0.55
            for (let i = 0; i < 40; i++) {
              const a = (i / 40) * Math.PI * 2 + (Math.random() - 0.5) * 0.12
              const len = reach * (0.45 + Math.random() * 0.55)
              setTimeout(() => d.ray(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 34 + Math.random() * 18), i * 9)
            }
          }, 16 * TIC)
        },
      })
    }
  }

  // The 35 Hz game loop.
  useEffect(() => {
    if (!enabled || !manifest) return
    let raf = 0
    let last = performance.now()
    let acc = 0

    const enterFrame = (f: Frame) => {
      const s = g.current
      s.frameTics = f.tics
      if (f.sound) play(f.sound, 0.3)
      if (f.flash) {
        s.flashSeq = f.flash
        s.flash = 0
        s.flashTics = f.flash[0].tics
      }
      if (f.fire) fire()
    }
    const startFire = () => {
      const s = g.current
      s.phase = 'firing'
      s.frame = 0
      enterFrame(SEQ[s.weapon].fire[0])
    }
    startFireRef.current = startFire

    const tick = () => {
      const s = g.current
      s.tic++
      s.bob *= 0.9
      if (s.phase === 'lower') {
        s.sy += SPEED
        if (s.sy >= WEAPONBOTTOM) {
          s.sy = WEAPONBOTTOM
          s.weapon = s.pending ?? s.weapon
          s.pending = null
          s.phase = 'raise'
          document.documentElement.classList.toggle('doom-armed', s.weapon !== 'fist')
        }
      } else if (s.phase === 'raise') {
        s.sy -= SPEED
        if (s.sy <= WEAPONTOP) {
          s.sy = WEAPONTOP
          s.phase = 'ready'
        }
      } else if (s.phase === 'firing') {
        if (--s.frameTics <= 0) {
          s.frame++
          const seq = SEQ[s.weapon].fire
          if (s.frame >= seq.length) {
            if (s.pending) s.phase = 'lower'
            else if (s.held && s.weapon !== 'fist' && hasAmmo(s.weapon)) {
              s.refire = true
              startFire()
            } else {
              s.phase = 'ready'
              s.refire = false
              if (!hasAmmo(s.weapon)) selectWeapon(PREFERENCE.find(hasAmmo) ?? 'fist')
            }
          } else enterFrame(seq[s.frame])
        }
      } else if (s.phase === 'ready' && s.pending) s.phase = 'lower'

      if (s.flash >= 0 && --s.flashTics <= 0) {
        s.flash++
        if (s.flash >= s.flashSeq.length) s.flash = -1
        else s.flashTics = s.flashSeq[s.flash].tics
      }

      // Face (ST_updateFaceWidget, simplified): ouch > evil grin > rampage > looking around
      s.heldTics = s.held && s.weapon !== 'fist' ? s.heldTics + 1 : 0
      if (s.ouchTics > 0) {
        s.ouchTics--
        s.face = 'STFOUCH0'
      } else if (s.grinTics > 0) {
        s.grinTics--
        s.face = 'STFEVL0'
      } else if (s.heldTics > 70) s.face = 'STFKILL0'
      else if (--s.faceTics <= 0) {
        s.faceTics = 17
        const px = s.pointer.x / window.innerWidth
        s.face = px < 0.15 ? 'STFTL00' : px > 0.85 ? 'STFTR00' : `STFST0${Math.floor(Math.random() * 3)}`
      }

      if (s.messageTics > 0 && --s.messageTics === 0) {
        s.messages.shift()
        if (s.messages.length) s.messageTics = 140
      }
    }

    const loop = (now: number) => {
      acc += now - last
      last = now
      let ticked = false
      while (acc >= TIC) {
        tick()
        acc -= TIC
        ticked = true
      }
      if (ticked) {
        const s = g.current
        const seq = SEQ[s.weapon]
        const angle = (s.tic * 128 * 2 * Math.PI) / 8192
        const bob = s.phase === 'ready' ? Math.min(16, s.bob) : 0
        setHud({
          weapon: s.weapon,
          sprite: s.phase === 'firing' ? (seq.fire[s.frame]?.sprite ?? seq.ready) : seq.ready,
          flash: s.flash >= 0 ? (s.flashSeq[s.flash]?.sprite ?? null) : null,
          sx: 1 + bob * Math.cos(angle),
          sy: s.sy + bob * Math.abs(Math.sin(angle)),
          face: s.face,
          ammo: { ...s.ammo },
          message: s.messages[0] ?? '',
        })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, manifest])

  const startFireRef = useRef<() => void>(() => {})

  // Input: number keys switch weapons; the mouse aims and fires.
  useEffect(() => {
    if (!enabled) return
    const typing = (e: Event) => {
      const t = e.target as HTMLElement | null
      return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    }
    const inHud = (e: Event) => !!(e.target as Element)?.closest?.('[data-doom-hud]')
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (SLOT[e.key]) selectWeapon(SLOT[e.key])
      else if (e.key === 'Escape') selectWeapon('fist')
    }
    const onMove = (e: PointerEvent) => {
      const s = g.current
      s.bob = Math.min(16, s.bob + Math.hypot(e.clientX - s.pointer.x, e.clientY - s.pointer.y) * 0.08)
      s.pointer.x = e.clientX
      s.pointer.y = e.clientY
      // "USE" next to the crosshair over links while holding fists (links are doors).
      const label = useLabel.current
      if (label) {
        const over =
          s.weapon === 'fist' &&
          !s.pending &&
          !!(e.target as Element)?.closest?.('a, button') &&
          !inHud(e) &&
          !boom.current?.isVoid(e.clientX, e.clientY)
        label.style.display = over ? 'block' : 'none'
        label.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`
      }
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || inHud(e)) return
      const s = g.current
      s.pointer = { x: e.clientX, y: e.clientY, target: e.target as Element }
      s.held = true
      if (s.phase === 'ready' && !s.pending) startFireRef.current()
    }
    const onUp = () => {
      g.current.held = false
    }
    // Armed: clicks shoot instead of following links. Fists can't use a link that's been blown away.
    const onClick = (e: MouseEvent) => {
      if (inHud(e)) return
      if (g.current.weapon !== 'fist' || boom.current?.isVoid(e.clientX, e.clientY)) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('blur', onUp)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('blur', onUp)
      document.removeEventListener('click', onClick, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  if (!enabled || !manifest) return null

  const s = scale
  const img = (name: string, x: number, y: number, extra?: CSSProperties) => {
    const p = manifest[name]
    if (!p) return null
    return (
      <img
        key={`${name}-${x}-${y}`}
        src={spriteUrl(name)}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: (x - p.lx) * s,
          top: (y - p.ly) * s,
          width: p.w * s,
          height: p.h * s,
          maxWidth: 'none', // Tailwind's img { max-width: 100% } would collapse glyphs in width-less boxes
          imageRendering: 'pixelated',
          ...extra,
        }}
      />
    )
  }
  // STlib_drawNum: right-aligned digits ending at x
  const num = (value: number | null, x: number, y: number, font: string, digitWidth: number) =>
    value === null
      ? null
      : String(value)
          .split('')
          .reverse()
          .map((d, i) => img(`${font}${d}`, x - (i + 1) * digitWidth, y))
  const text = (msg: string) => {
    let x = 0
    return msg.split('').map(ch => {
      const name = `STCFN${String(ch.toUpperCase().charCodeAt(0)).padStart(3, '0')}`
      const p = manifest[name]
      const at = x
      x += p ? p.w : 4
      return p ? img(name, at, 0) : null
    })
  }

  const cost = hud && COST[hud.weapon]
  const ammoNow = hud && cost ? hud.ammo[cost[0]] : null
  const owned = [true, true, true, true, false, true] // ARMS 2..7; no plasma rifle

  return (
    <>
      {hud && layers.map((layer, i) => createPortal(<Backdrop scale={s} statusBar={32 * s} />, layer, `backdrop-${i}`))}
      <div data-doom-hud style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10000 }}>
        {/* Falling letters, debris, projectiles and explosions */}
        <canvas ref={overlay} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }} />
        <div ref={greenFlash} style={{ position: 'fixed', inset: 0, background: '#3cff3c', opacity: 0, pointerEvents: 'none', mixBlendMode: 'screen' }} />

        {hud && (
          <>
            {hud.message && <div style={{ position: 'fixed', left: 24, top: 96, height: 8 * s }}>{text(hud.message)}</div>}

            <div ref={useLabel} style={{ position: 'fixed', left: 0, top: 0, display: 'none' }}>
              <div style={{ position: 'relative', height: 14, transform: 'scale(0.67)', transformOrigin: 'top left' }}>{text('USE')}</div>
            </div>

            {/* First-person weapon in a 320x168 view above the status bar */}
            <div
              style={{
                position: 'fixed',
                left: '50%',
                bottom: 32 * s,
                width: 320 * s,
                height: 168 * s,
                transform: 'translateX(-50%)',
                overflow: 'hidden',
              }}
            >
              {img(hud.sprite, hud.sx, hud.sy - 16)}
              {hud.flash && img(hud.flash, hud.sx, hud.sy - 16)}
            </div>

            {/* Status bar */}
            <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 32 * s, background: '#000', pointerEvents: 'auto' }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, width: 320 * s, height: 32 * s, transform: 'translateX(-50%)' }}>
                {img('STBAR', 0, 0)}
                {img('STARMS', 104, 0)}
                {num(ammoNow, 44, 3, 'STTNUM', 14)}
                {num(100, 90, 3, 'STTNUM', 14)}
                {img('STTPRCNT', 90, 3)}
                {owned.map((own, i) => img(`${own ? 'STYSNUM' : 'STGNUM'}${i + 2}`, 111 + (i % 3) * 12, 4 + Math.floor(i / 3) * 10))}
                {num(200, 221, 3, 'STTNUM', 14)}
                {img('STTPRCNT', 221, 3)}
                {/* idkfa gives every key; skull keys take precedence in the box */}
                {img('STKEYS3', 239, 3)}
                {img('STKEYS4', 239, 13)}
                {img('STKEYS5', 239, 23)}
                {num(hud.ammo.bullets, 288, 5, 'STYSNUM', 4)}
                {num(MAX_AMMO.bullets, 314, 5, 'STYSNUM', 4)}
                {num(hud.ammo.shells, 288, 11, 'STYSNUM', 4)}
                {num(MAX_AMMO.shells, 314, 11, 'STYSNUM', 4)}
                {num(hud.ammo.rockets, 288, 17, 'STYSNUM', 4)}
                {num(MAX_AMMO.rockets, 314, 17, 'STYSNUM', 4)}
                {num(hud.ammo.cells, 288, 23, 'STYSNUM', 4)}
                {num(MAX_AMMO.cells, 314, 23, 'STYSNUM', 4)}
                {/* Doomguy. Clicking him will start the real game later; for now he just says ouch. */}
                <button
                  type="button"
                  aria-label="Doomguy"
                  onClick={() => {
                    g.current.ouchTics = 35
                    play('plpain', 0.25)
                  }}
                  style={{ position: 'absolute', left: 143 * s, top: 0, width: 35 * s, height: 32 * s, background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
                />
                {img(hud.face, 143, 0, { pointerEvents: 'none' })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function freshState() {
  return {
    weapon: 'pistol' as Weapon,
    pending: null as Weapon | null,
    phase: 'raise' as 'ready' | 'firing' | 'lower' | 'raise',
    frame: 0,
    frameTics: 0,
    flash: -1,
    flashTics: 0,
    flashSeq: [] as Flash[],
    sy: WEAPONBOTTOM,
    bob: 0,
    tic: 0,
    held: false,
    heldTics: 0,
    refire: false,
    pointer: { x: 0, y: 0, target: null as Element | null },
    face: 'STFST01',
    faceTics: 0,
    grinTics: 70,
    ouchTics: 0,
    ammo: { ...MAX_AMMO },
    messages: [...OPENING_MESSAGES],
    messageTics: 140,
  }
}
