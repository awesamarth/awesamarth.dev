// Page destruction for the idkfa easter egg.
//
// Holes: every [data-doom-root] element gets a "hole layer" on top of its content, clipped with
// clip-path: path(...) to the union of its holes and showing the DOOM backdrop. clip-path updates
// synchronously (CSS masks reload an image and flash), and since the layer lives inside the root,
// holes move with it when the page scrolls. A low-res canvas mirrors the holes for hit-testing.
// Scorch marks live on a decal canvas just below the hole layer. Letters inside a hole are found with
// the caret APIs, so the page's DOM (and React) is never modified; copies of them fall with simple
// physics on an overlay canvas and pile up on top of the status bar, together with debris and sparks.

import { image, type Manifest } from './sprites'

const MASK_SCALE = 0.5
const GRAVITY = 2200
const MAX_PARTICLES = 1400
const MAX_RESTING = 900
const PILE_BUCKET = 6
const PILE_MAX = 220

type Pt = [number, number]
type Root = {
  el: HTMLElement
  mask: HTMLCanvasElement
  mctx: CanvasRenderingContext2D
  decal: HTMLCanvasElement
  dctx: CanvasRenderingContext2D
  layer: HTMLDivElement
  w: number
  h: number
  holes: Pt[][] // in root CSS px, replayed on resize
  path: string[] // SVG subpath per hole
  decals: Decal[]
  dirty: boolean
}
type Decal = { kind: 'scorch' | 'rim' | 'burn'; x: number; y: number; r: number; pts?: Pt[] }

type Particle = {
  kind: 'letter' | 'chunk' | 'spark'
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
  char?: string
  font?: string
  life: number // seconds left (sparks), Infinity otherwise
  resting: boolean
  born: number
}
type Anim = { frames: string[]; tics: number[]; x: number; y: number; scale: number; t: number; filter?: string }
type Projectile = {
  frames: string[]
  frameTics: number
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  duration: number
  s0: number
  s1: number
  onHit: () => void
}

export type ImpactKind = 'bullet' | 'pellet' | 'rocket' | 'bfg'

export class Destruction {
  private roots = new Map<HTMLElement, Root>()
  private particles: Particle[] = []
  private anims: Anim[] = []
  private projectiles: Projectile[] = []
  private pile = new Float32Array(1)
  private removed = new WeakMap<Text, Set<number>>()
  private ctx: CanvasRenderingContext2D
  private raf = 0
  private last = 0
  private ro: ResizeObserver
  private destroyed = false

  constructor(
    private overlay: HTMLCanvasElement,
    private manifest: Manifest,
    private scale: () => number,
    private floor: () => number, // viewport y of the status bar top
    private onLayer: (layer: HTMLDivElement) => void, // render the backdrop into a new hole layer
  ) {
    this.ctx = overlay.getContext('2d')!
    this.ro = new ResizeObserver(entries => entries.forEach(e => this.resizeRoot(e.target as HTMLElement)))
    this.resizeOverlay()
    window.addEventListener('resize', this.resizeOverlay)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  dispose() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resizeOverlay)
    this.ro.disconnect()
    for (const r of this.roots.values()) {
      r.decal.remove()
      r.layer.remove()
    }
    this.roots.clear()
  }

  // ---------- public API ----------

  /** A shot or explosion at viewport point (x, y). */
  impact(x: number, y: number, kind: ImpactKind) {
    const r = { bullet: 9, pellet: 8, rocket: 78, bfg: 170 }[kind]
    const force = { bullet: 260, pellet: 300, rocket: 1100, bfg: 1700 }[kind]
    const poly = jagged(x, y, r, kind === 'rocket' || kind === 'bfg' ? 22 : 9)
    this.letters(x, y, r, force, poly)
    this.debris(x, y, r, force, kind)
    this.cut(poly, x, y, r, kind)
    if (kind === 'bullet' || kind === 'pellet') this.anim(['PUFFA0', 'PUFFB0', 'PUFFC0', 'PUFFD0'], [4, 4, 4, 4], x, y, 1)
  }

  /** A BFG tracer: a burnt trench from (x0, y0) outwards. */
  ray(x0: number, y0: number, x1: number, y1: number, width: number) {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.round(len / (width * 0.6)))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      const r = width * (0.45 + Math.random() * 0.35) * (1 - t * 0.4)
      const poly = jagged(x, y, r, 8)
      this.letters(x, y, r, 900, poly, Math.atan2(y1 - y0, x1 - x0))
      this.cut(poly, x, y, r, 'bfg', true)
      if (i % 3 === 0) this.debris(x, y, r, 700, 'bfg', 3)
    }
    this.anim(['BFE2A0', 'BFE2B0', 'BFE2C0', 'BFE2D0'], [8, 8, 8, 8], x1, y1, 1)
  }

  /** Animated sprite (explosions, puffs) centred on a viewport point using its world offsets. */
  anim(frames: string[], tics: number[], x: number, y: number, scaleMul: number, filter?: string) {
    this.anims.push({ frames, tics, x, y, scale: this.scale() * scaleMul, t: 0, filter })
  }

  projectile(p: Omit<Projectile, 't'>) {
    this.projectiles.push({ ...p, t: 0 })
  }

  /** Is (x, y) inside a hole of every root that covers it? (destroyed links can't be used) */
  isVoid(x: number, y: number) {
    let covered = false
    for (const r of this.roots.values()) {
      const b = r.el.getBoundingClientRect()
      if (x < b.left || x >= b.right || y < b.top || y >= b.bottom) continue
      covered = true
      const a = r.mctx.getImageData(Math.floor((x - b.left) * MASK_SCALE), Math.floor((y - b.top) * MASK_SCALE), 1, 1).data[3]
      if (a > 0) return false
    }
    return covered
  }

  // ---------- holes and decals ----------

  private root(el: HTMLElement): Root {
    let r = this.roots.get(el)
    if (r) return r
    const mask = document.createElement('canvas')
    const mctx = mask.getContext('2d', { willReadFrequently: true })!
    const decal = document.createElement('canvas')
    decal.setAttribute('aria-hidden', 'true')
    Object.assign(decal.style, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '5' })
    const layer = document.createElement('div')
    layer.setAttribute('aria-hidden', 'true')
    layer.dataset.doomHoles = ''
    Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '6', clipPath: 'path("M0 0")', overflow: 'hidden' })
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    el.append(decal, layer)
    r = { el, mask, mctx, decal, dctx: decal.getContext('2d')!, layer, w: 0, h: 0, holes: [], path: [], decals: [], dirty: false }
    this.roots.set(el, r)
    this.onLayer(layer)
    this.sizeRoot(r)
    this.ro.observe(el)
    return r
  }

  private sizeRoot(r: Root) {
    r.w = Math.max(1, r.el.offsetWidth)
    r.h = Math.max(1, r.el.offsetHeight)
    r.mask.width = Math.ceil(r.w * MASK_SCALE)
    r.mask.height = Math.ceil(r.h * MASK_SCALE)
    r.decal.width = r.w
    r.decal.height = r.h
    r.mctx.fillStyle = '#fff'
    r.mctx.fillRect(0, 0, r.mask.width, r.mask.height)
    r.mctx.globalCompositeOperation = 'destination-out'
    for (const h of r.holes) this.fillPoly(r.mctx, h, MASK_SCALE)
    for (const d of r.decals) this.drawDecal(r, d)
  }

  private resizeRoot(el: HTMLElement) {
    const r = this.roots.get(el)
    if (!r || (el.offsetWidth === r.w && el.offsetHeight === r.h)) return
    this.sizeRoot(r)
  }

  private cut(poly: Pt[], x: number, y: number, radius: number, kind: ImpactKind, quiet = false) {
    for (const el of document.querySelectorAll<HTMLElement>('[data-doom-root]')) {
      const b = el.getBoundingClientRect()
      if (x + radius < b.left || x - radius > b.right || y + radius < b.top || y - radius > b.bottom) continue
      const r = this.root(el)
      const local = poly.map(([px, py]) => [px - b.left, py - b.top] as Pt)
      r.holes.push(local)
      r.path.push(`M${local.map(([px, py]) => `${px.toFixed(1)} ${py.toFixed(1)}`).join('L')}Z`)
      r.dirty = true
      this.fillPoly(r.mctx, local, MASK_SCALE)
      const lx = x - b.left
      const ly = y - b.top
      const decals: Decal[] =
        kind === 'bfg'
          ? [{ kind: 'burn', x: lx, y: ly, r: radius * (quiet ? 1.6 : 1.4) }]
          : kind === 'rocket'
            ? [{ kind: 'scorch', x: lx, y: ly, r: radius * 1.9 }, { kind: 'rim', x: lx, y: ly, r: radius, pts: local }]
            : [{ kind: 'scorch', x: lx, y: ly, r: radius * 2.4 }, { kind: 'rim', x: lx, y: ly, r: radius, pts: local }]
      for (const d of decals) {
        r.decals.push(d)
        this.drawDecal(r, d)
      }
    }
    // Shake only the card that was hit; moving a page-sized root would change the scroll size.
    if (!quiet) {
      const card = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-doom-target]')
      const d = kind === 'bullet' || kind === 'pellet' ? 2 : 5
      card?.animate([{ translate: '0 0' }, { translate: `${d}px -${d / 2}px` }, { translate: `-${d}px ${d / 2}px` }, { translate: '0 0' }], { duration: kind === 'bfg' ? 360 : 140 })
    }
  }

  // Apply new holes once per frame (the BFG spray adds hundreds in a burst).
  private applyHoles() {
    for (const r of this.roots.values()) {
      if (!r.dirty) continue
      r.dirty = false
      r.layer.style.clipPath = `path(nonzero, "${r.path.join('')}")`
    }
  }

  private fillPoly(ctx: CanvasRenderingContext2D, pts: Pt[], k: number) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)))
    ctx.closePath()
    ctx.fill()
  }

  private drawDecal(r: Root, d: Decal) {
    const c = r.dctx
    if (d.kind === 'rim' && d.pts) {
      c.save()
      c.strokeStyle = 'rgba(20,10,5,0.85)'
      c.lineWidth = 4
      c.beginPath()
      d.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
      c.closePath()
      c.stroke()
      c.restore()
      return
    }
    const g = c.createRadialGradient(d.x, d.y, d.r * 0.2, d.x, d.y, d.r)
    if (d.kind === 'burn') {
      g.addColorStop(0, 'rgba(10,40,0,0.85)')
      g.addColorStop(0.55, 'rgba(40,255,40,0.22)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
    } else {
      g.addColorStop(0, 'rgba(0,0,0,0.7)')
      g.addColorStop(0.45, 'rgba(25,12,4,0.45)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
    }
    c.fillStyle = g
    c.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2)
  }

  // ---------- letters, debris, sparks ----------

  private letters(cx: number, cy: number, radius: number, force: number, poly: Pt[], dir?: number) {
    const step = Math.max(4, Math.min(11, radius / 3))
    const seen = new Map<Text, Set<number>>()
    let spawned = 0
    for (let y = cy - radius; y <= cy + radius; y += step) {
      for (let x = cx - radius; x <= cx + radius; x += step) {
        if (!inside(poly, x, y) || spawned > 160) continue
        const hit = caretAt(x, y)
        if (!hit) continue
        for (const off of [hit.offset, hit.offset - 1]) {
          const node = hit.node
          if (off < 0 || off >= node.data.length) continue
          const gone = this.removed.get(node)
          if (gone?.has(off) || seen.get(node)?.has(off)) continue
          const ch = node.data[off]
          if (!ch.trim()) continue
          const range = document.createRange()
          range.setStart(node, off)
          range.setEnd(node, off + 1)
          const rect = range.getBoundingClientRect()
          if (!rect.width || x < rect.left - 1 || x > rect.right + 1 || y < rect.top - 1 || y > rect.bottom + 1) continue
          const mx = rect.left + rect.width / 2
          const my = rect.top + rect.height / 2
          if (!inside(poly, mx, my)) continue
          if (!seen.has(node)) seen.set(node, new Set())
          seen.get(node)!.add(off)
          if (gone) gone.add(off)
          else this.removed.set(node, new Set([off]))
          const parent = node.parentElement!
          const cs = getComputedStyle(parent)
          const t = cs.textTransform
          const char = t === 'uppercase' ? ch.toUpperCase() : t === 'lowercase' ? ch.toLowerCase() : ch
          const a = dir ?? Math.atan2(my - cy, mx - cx)
          const falloff = 1 - Math.min(1, Math.hypot(mx - cx, my - cy) / (radius * 1.2))
          const v = force * (0.35 + 0.65 * falloff) * (0.6 + Math.random() * 0.5)
          this.add({
            kind: 'letter',
            x: mx,
            y: my,
            vx: Math.cos(a) * v * 0.8 + (Math.random() - 0.5) * 120,
            vy: Math.sin(a) * v * 0.6 - 160 - Math.random() * 220,
            rot: 0,
            vr: (Math.random() - 0.5) * 14,
            w: rect.width,
            h: rect.height,
            color: cs.color,
            char,
            font: `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`,
            life: Infinity,
            resting: false,
            born: performance.now(),
          })
          spawned++
          break
        }
      }
    }
  }

  private debris(x: number, y: number, radius: number, force: number, kind: ImpactKind, scaleCount = 1) {
    const base = surfaceColor(x, y)
    const big = kind === 'rocket' || kind === 'bfg'
    const chunks = Math.round((big ? 26 : 5) * scaleCount)
    for (let i = 0; i < chunks; i++) {
      const a = Math.random() * Math.PI * 2
      const v = force * (0.3 + Math.random() * 0.8)
      const size = big ? 3 + Math.random() * 9 : 2 + Math.random() * 4
      this.add({
        kind: 'chunk',
        x: x + Math.cos(a) * radius * 0.5,
        y: y + Math.sin(a) * radius * 0.5,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 250,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 20,
        w: size,
        h: size * (0.5 + Math.random()),
        color: Math.random() < 0.7 ? base : Math.random() < 0.5 ? '#2a2a2a' : '#5a3a20',
        life: Infinity,
        resting: false,
        born: performance.now(),
      })
    }
    const sparks = Math.round((big ? 40 : 8) * scaleCount)
    for (let i = 0; i < sparks; i++) {
      const a = Math.random() * Math.PI * 2
      const v = (big ? 900 : 500) * (0.4 + Math.random())
      this.add({
        kind: 'spark',
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 100,
        rot: 0,
        vr: 0,
        w: 2,
        h: 2,
        color: kind === 'bfg' ? (Math.random() < 0.5 ? '#9dff6a' : '#e8ffe0') : Math.random() < 0.5 ? '#ffd27a' : '#ff8a1e',
        life: 0.2 + Math.random() * (big ? 0.7 : 0.3),
        resting: false,
        born: performance.now(),
      })
    }
  }

  private add(p: Particle) {
    this.particles.push(p)
    if (this.particles.length > MAX_PARTICLES) {
      const i = this.particles.findIndex(q => q.resting)
      this.particles.splice(i >= 0 ? i : 0, 1)
    }
  }

  // ---------- simulation and rendering ----------

  private resizeOverlay = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    this.overlay.width = Math.round(window.innerWidth * dpr)
    this.overlay.height = Math.round(window.innerHeight * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.pile = new Float32Array(Math.ceil(window.innerWidth / PILE_BUCKET) + 1)
    for (const p of this.particles) p.resting = false
  }

  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.step(dt)
    this.applyHoles()
    this.draw()
    this.raf = requestAnimationFrame(this.frame)
  }

  private step(dt: number) {
    const floor = this.floor()
    const W = window.innerWidth
    let resting = 0
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (p.kind === 'spark') {
        p.life -= dt
        if (p.life <= 0) {
          this.particles.splice(i, 1)
          continue
        }
        p.vy += GRAVITY * 0.35 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        continue
      }
      if (p.resting) {
        resting++
        continue
      }
      p.vy += GRAVITY * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (p.x < p.w / 2) {
        p.x = p.w / 2
        p.vx = Math.abs(p.vx) * 0.4
      } else if (p.x > W - p.w / 2) {
        p.x = W - p.w / 2
        p.vx = -Math.abs(p.vx) * 0.4
      }
      const b = Math.min(this.pile.length - 1, Math.max(0, Math.floor(p.x / PILE_BUCKET)))
      const ground = floor - this.pile[b]
      if (p.y + p.h / 2 >= ground && p.vy > 0) {
        if (p.vy < 260) {
          p.y = ground - p.h / 2
          p.resting = true
          p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2) + (Math.random() - 0.5) * 0.5
          // Spread the pile a little so it builds into mounds rather than spikes.
          const add = Math.min(p.h, p.w) * 0.7
          for (let k = -1; k <= 1; k++) {
            const j = b + k
            if (j >= 0 && j < this.pile.length) this.pile[j] = Math.min(PILE_MAX, this.pile[j] + add * (k ? 0.45 : 1))
          }
        } else {
          p.y = ground - p.h / 2
          p.vy *= -0.32
          p.vx *= 0.6
          p.vr *= 0.5
        }
      }
    }
    // Keep the pile bounded: drop the oldest resting pieces.
    if (resting > MAX_RESTING) {
      let drop = resting - MAX_RESTING
      this.particles = this.particles.filter(p => !(p.resting && drop-- > 0))
    }

    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]
      a.t += dt * 35
      if (a.t >= a.tics.reduce((s, t) => s + t, 0)) this.anims.splice(i, 1)
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      p.t += dt * 1000
      if (p.t >= p.duration) {
        this.projectiles.splice(i, 1)
        p.onHit()
      }
    }
  }

  private draw() {
    const c = this.ctx
    c.clearRect(0, 0, window.innerWidth, window.innerHeight)
    c.imageSmoothingEnabled = false
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    for (const p of this.particles) {
      if (p.kind === 'spark') {
        c.fillStyle = p.color
        c.globalAlpha = Math.min(1, p.life * 4)
        c.fillRect(p.x, p.y, 2.5, 2.5)
        c.globalAlpha = 1
        continue
      }
      c.save()
      c.translate(p.x, p.y)
      c.rotate(p.rot)
      if (p.kind === 'letter') {
        c.font = p.font!
        c.fillStyle = p.color
        c.fillText(p.char!, 0, 0)
      } else {
        c.fillStyle = p.color
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      }
      c.restore()
    }
    const s = this.scale()
    for (const p of this.projectiles) {
      const t = p.t / p.duration
      const x = p.x0 + (p.x1 - p.x0) * t
      const y = p.y0 + (p.y1 - p.y0) * t
      const k = p.s0 + (p.s1 - p.s0) * t
      const name = p.frames[Math.floor(p.t / ((1000 / 35) * p.frameTics)) % p.frames.length]
      this.sprite(name, x, y, s * k)
    }
    for (const a of this.anims) {
      let t = a.t
      let i = 0
      while (i < a.tics.length - 1 && t >= a.tics[i]) t -= a.tics[i++]
      if (a.filter) c.filter = a.filter
      this.sprite(a.frames[i], a.x, a.y, a.scale)
      c.filter = 'none'
    }
  }

  private sprite(name: string, x: number, y: number, k: number) {
    const p = this.manifest[name]
    const img = image(name)
    if (!p || !img.complete) return
    // World sprites: lx is the horizontal centre and ly the height above the origin, so (x, y) is the sprite's origin.
    this.ctx.drawImage(img, x - p.lx * k, y - p.ly * k, p.w * k, p.h * k)
  }
}

// ---------- helpers ----------

function jagged(x: number, y: number, r: number, n: number): Pt[] {
  const pts: Pt[] = []
  const verts = n + Math.floor(Math.random() * 5)
  const spin = Math.random() * Math.PI * 2
  for (let i = 0; i < verts; i++) {
    const a = spin + (i / verts) * Math.PI * 2
    const rr = r * (0.62 + Math.random() * 0.55)
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr])
  }
  return pts
}

function inside(poly: Pt[], x: number, y: number) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function caretAt(x: number, y: number): { node: Text; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y)
    if (p && p.offsetNode.nodeType === Node.TEXT_NODE) return { node: p.offsetNode as Text, offset: p.offset }
    return null
  }
  const r = d.caretRangeFromPoint?.(x, y)
  if (r && r.startContainer.nodeType === Node.TEXT_NODE) return { node: r.startContainer as Text, offset: r.startOffset }
  return null
}

function surfaceColor(x: number, y: number) {
  let el = document.elementFromPoint(x, y) as HTMLElement | null
  while (el && el !== document.body) {
    const bg = getComputedStyle(el).backgroundColor
    if (bg && bg !== 'transparent' && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)/.test(bg)) return bg
    el = el.parentElement
  }
  return getComputedStyle(document.body).backgroundColor || '#300'
}
