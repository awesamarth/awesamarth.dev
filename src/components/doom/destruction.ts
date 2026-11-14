// Page destruction for the idkfa easter egg.
//
// Holes: every [data-doom-root] element gets a "hole layer" on top of its content, clipped with
// clip-path: path(...) to its holes and showing the DOOM backdrop. clip-path updates synchronously
// (CSS masks reload an image and flash), and since the layer lives inside the root, holes move with
// it when the page scrolls. Damage lives on a grid of CELL px "pixels" (like the HUD's pixel art):
// holes are whole cells with crumbly edges, each hole gets a dithered inner shadow cast by its top-left
// edge (so the page reads as a thick wall, not paper), and scorch is a few stepped, noisy bands of
// soot (with a faint ash ring on dark surfaces). Both are drawn at one canvas pixel per cell and scaled up
// pixelated. The grid doubles as the hit-test for destroyed links. Letters inside a hole are found with
// the caret APIs, so the page's DOM (and React) is never modified; copies of them fall with simple
// physics on an overlay canvas and pile up on top of the status bar, together with debris and sparks.

import { image, type Manifest } from './sprites'

const CELL = 3 // CSS px per destruction pixel
const LEVELS = [0.22, 0.45, 0.7, 0.9] // scorch bands
const GRAVITY = 2200
const MAX_PARTICLES = 1400
const MAX_RESTING = 900
const PILE_BUCKET = 6
const PILE_MAX = 220

type Pt = [number, number]
type Box = [number, number, number, number]
type Tint = 0 | 1 | 2 // soot (light surfaces), soot + a faint ash ring (dark surfaces), BFG burn
type Scorch = { x: number; y: number; r0: number; r1: number; strength: number; tint: Tint }
type Root = {
  el: HTMLElement
  decal: HTMLCanvasElement // scorch, over the content
  dctx: CanvasRenderingContext2D
  shade: HTMLCanvasElement // inner shadows, inside the hole layer
  sctx: CanvasRenderingContext2D
  layer: HTMLDivElement
  w: number
  h: number
  gw: number
  gh: number
  solid: Uint8Array // 1 = page, 0 = hole
  burn: Uint8Array // scorch band 0-4 per cell
  tint: Uint8Array
  holes: Pt[][] // in root CSS px, replayed on resize
  scorches: Scorch[]
  rows: string[] // clip-path subpaths per grid row
  rowsDirty: [number, number] | null
  paintDirty: Box[] // cell boxes to repaint (kept separate: BFG rays damage far-apart spots)
}

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
    const shots: [number, number, number, Pt[]][] = []
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      const r = width * (0.45 + Math.random() * 0.35) * (1 - t * 0.4)
      shots.push([x, y, r, jagged(x, y, r, 8)])
    }
    // Letters first for the whole trench (one hit-testing pass), then holes and debris.
    this.withoutLayers(() => {
      for (const [x, y, r, poly] of shots) this.findLetters(x, y, r, 900, poly, Math.atan2(y1 - y0, x1 - x0))
    })
    shots.forEach(([x, y, r, poly], i) => {
      this.cut(poly, x, y, r, 'bfg', true)
      if ((i + 1) % 3 === 0) this.debris(x, y, r, 700, 'bfg', 3)
    })
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
      const gx = Math.floor((x - b.left) / CELL)
      const gy = Math.floor((y - b.top) / CELL)
      if (gx < 0 || gy < 0 || gx >= r.gw || gy >= r.gh || r.solid[gy * r.gw + gx]) return false
    }
    return covered
  }

  // ---------- holes and decals ----------

  private root(el: HTMLElement): Root {
    let r = this.roots.get(el)
    if (r) return r
    const canvasStyle = { position: 'absolute', left: '0', top: '0', pointerEvents: 'none', imageRendering: 'pixelated' }
    const decal = document.createElement('canvas')
    decal.setAttribute('aria-hidden', 'true')
    Object.assign(decal.style, canvasStyle, { zIndex: '5' })
    const shade = document.createElement('canvas')
    Object.assign(shade.style, canvasStyle, { zIndex: '1' })
    const layer = document.createElement('div')
    layer.setAttribute('aria-hidden', 'true')
    layer.dataset.doomHoles = ''
    Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '6', clipPath: 'path("M0 0")', overflow: 'hidden' })
    layer.append(shade)
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
    el.append(decal, layer)
    r = {
      el,
      decal,
      dctx: decal.getContext('2d')!,
      shade,
      sctx: shade.getContext('2d')!,
      layer,
      w: 0,
      h: 0,
      gw: 0,
      gh: 0,
      solid: new Uint8Array(0),
      burn: new Uint8Array(0),
      tint: new Uint8Array(0),
      holes: [],
      scorches: [],
      rows: [],
      rowsDirty: null,
      paintDirty: [],
    }
    this.roots.set(el, r)
    this.onLayer(layer)
    this.sizeRoot(r)
    this.ro.observe(el)
    return r
  }

  // (Re)build the grid for the root's size and replay its damage.
  private sizeRoot(r: Root) {
    r.w = Math.max(1, r.el.offsetWidth)
    r.h = Math.max(1, r.el.offsetHeight)
    r.gw = Math.ceil(r.w / CELL)
    r.gh = Math.ceil(r.h / CELL)
    const n = r.gw * r.gh
    r.solid = new Uint8Array(n).fill(1)
    r.burn = new Uint8Array(n)
    r.tint = new Uint8Array(n)
    r.rows = new Array(r.gh).fill('')
    for (const c of [r.decal, r.shade]) {
      c.width = r.gw
      c.height = r.gh
      c.style.width = `${r.gw * CELL}px`
      c.style.height = `${r.gh * CELL}px`
    }
    for (const h of r.holes) this.carve(r, h)
    for (const sc of r.scorches) this.scorch(r, sc)
    r.rowsDirty = [0, r.gh - 1]
    r.paintDirty = [[0, 0, r.gw - 1, r.gh - 1]]
  }

  private resizeRoot(el: HTMLElement) {
    const r = this.roots.get(el)
    if (!r || (el.offsetWidth === r.w && el.offsetHeight === r.h)) return
    this.sizeRoot(r)
  }

  private cut(poly: Pt[], x: number, y: number, radius: number, kind: ImpactKind, quiet = false) {
    let tint: Tint = 2
    if (kind !== 'bfg') tint = luminance(surfaceColor(x, y)) < 0.3 ? 1 : 0
    for (const el of document.querySelectorAll<HTMLElement>('[data-doom-root]')) {
      const b = el.getBoundingClientRect()
      if (x + radius < b.left || x - radius > b.right || y + radius < b.top || y - radius > b.bottom) continue
      const r = this.root(el)
      const local = poly.map(([px, py]) => [px - b.left, py - b.top] as Pt)
      r.holes.push(local)
      this.carve(r, local)
      const lx = x - b.left
      const ly = y - b.top
      const sc: Scorch =
        kind === 'bfg'
          ? { x: lx, y: ly, r0: radius * 0.7, r1: radius * (quiet ? 1.55 : 1.4), strength: 0.95, tint }
          : kind === 'rocket'
            ? { x: lx, y: ly, r0: radius * 0.8, r1: radius * 1.45, strength: 1, tint }
            : { x: lx, y: ly, r0: radius * 0.7, r1: radius + 9, strength: 0.8, tint }
      r.scorches.push(sc)
      this.scorch(r, sc)
    }
    // Shake only the card that was hit; moving a page-sized root would change the scroll size.
    if (!quiet) {
      const card = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-doom-target]')
      const d = kind === 'bullet' || kind === 'pellet' ? 2 : 5
      card?.animate([{ translate: '0 0' }, { translate: `${d}px -${d / 2}px` }, { translate: `-${d}px ${d / 2}px` }, { translate: '0 0' }], { duration: kind === 'bfg' ? 360 : 140 })
    }
  }

  // Remove the cells inside a hole polygon. Each cell's test point is jittered (deterministically,
  // so resizes replay the same shape), which crumbles the edge into pixels instead of a clean cut.
  private carve(r: Root, poly: Pt[]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [px, py] of poly) {
      minX = Math.min(minX, px)
      minY = Math.min(minY, py)
      maxX = Math.max(maxX, px)
      maxY = Math.max(maxY, py)
    }
    const x0 = Math.max(0, Math.floor(minX / CELL) - 1)
    const y0 = Math.max(0, Math.floor(minY / CELL) - 1)
    const x1 = Math.min(r.gw - 1, Math.ceil(maxX / CELL) + 1)
    const y1 = Math.min(r.gh - 1, Math.ceil(maxY / CELL) + 1)
    if (x0 > x1 || y0 > y1) return
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const i = gy * r.gw + gx
        if (!r.solid[i]) continue
        const jx = (hash(gx, gy) - 0.5) * CELL * 1.8
        const jy = (hash(gy * 7 + 3, gx) - 0.5) * CELL * 1.8
        if (inside(poly, (gx + 0.5) * CELL + jx, (gy + 0.5) * CELL + jy)) r.solid[i] = 0
      }
    }
    this.markRows(r, y0, y1)
    this.markPaint(r, x0, y0, x1 + 4, y1 + 4) // shadows reach 4 cells down-right
  }

  // Stepped, noisy scorch bands around a hole. A cell keeps its darkest band.
  private scorch(r: Root, sc: Scorch) {
    const cx = sc.x / CELL
    const cy = sc.y / CELL
    const r0 = sc.r0 / CELL
    const r1 = Math.max(r0 + 1, sc.r1 / CELL)
    const x0 = Math.max(0, Math.floor(cx - r1))
    const y0 = Math.max(0, Math.floor(cy - r1))
    const x1 = Math.min(r.gw - 1, Math.ceil(cx + r1))
    const y1 = Math.min(r.gh - 1, Math.ceil(cy + r1))
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const i = gy * r.gw + gx
        if (!r.solid[i]) continue
        const d = Math.hypot(gx + 0.5 - cx, gy + 0.5 - cy)
        if (d > r1) continue
        const j = Math.max(0, (d - r0) / (r1 - r0))
        const q = sc.strength * Math.pow(1 - j, 1.4) + (hash(gx * 3 + 1, gy * 5 + 2) - 0.5) * 0.3
        let level = 0
        for (let k = LEVELS.length - 1; k >= 0; k--) {
          if (q >= LEVELS[k]) {
            level = k + 1
            break
          }
        }
        if (sc.tint === 1 && level < 2) continue // the faintest band is just noise on dark surfaces
        if (level > r.burn[i]) {
          r.burn[i] = level
          r.tint[i] = sc.tint
        }
      }
    }
    this.markPaint(r, x0, y0, x1, y1)
  }

  private markRows(r: Root, y0: number, y1: number) {
    r.rowsDirty = r.rowsDirty ? [Math.min(r.rowsDirty[0], y0), Math.max(r.rowsDirty[1], y1)] : [y0, y1]
  }

  private markPaint(r: Root, x0: number, y0: number, x1: number, y1: number) {
    r.paintDirty.push([x0, y0, x1, y1])
  }

  // Apply new damage once per frame (the BFG spray adds hundreds of holes in a burst).
  private applyHoles() {
    for (const r of this.roots.values()) {
      if (r.rowsDirty) {
        const [y0, y1] = r.rowsDirty
        r.rowsDirty = null
        for (let gy = y0; gy <= y1; gy++) {
          let row = ''
          const base = gy * r.gw
          for (let gx = 0; gx < r.gw; gx++) {
            if (r.solid[base + gx]) continue
            let end = gx
            while (end + 1 < r.gw && !r.solid[base + end + 1]) end++
            row += `M${gx * CELL} ${gy * CELL}h${(end - gx + 1) * CELL}v${CELL}h${-(end - gx + 1) * CELL}z`
            gx = end
          }
          r.rows[gy] = row
        }
        const path = r.rows.join('')
        r.layer.style.clipPath = path ? `path(nonzero, "${path}")` : 'path("M0 0")'
      }
      if (r.paintDirty.length) {
        const boxes = r.paintDirty
        r.paintDirty = []
        for (const box of boxes) this.paint(r, box)
      }
    }
  }

  // Scorch (decal canvas) and inner shadows (shade canvas) for a box of cells, one pixel per cell.
  private paint(r: Root, [bx0, by0, bx1, by1]: Box) {
    const x0 = Math.max(0, bx0)
    const y0 = Math.max(0, by0)
    const x1 = Math.min(r.gw - 1, bx1)
    const y1 = Math.min(r.gh - 1, by1)
    if (x0 > x1 || y0 > y1) return
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    const dec = r.dctx.createImageData(w, h)
    const sh = r.sctx.createImageData(w, h)
    const isHole = (gx: number, gy: number) => gx < 0 || gy < 0 || gx >= r.gw || gy >= r.gh || !r.solid[gy * r.gw + gx]
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const i = gy * r.gw + gx
        const o = ((gy - y0) * w + (gx - x0)) * 4
        if (r.solid[i]) {
          const lv = r.burn[i]
          if (!lv) continue
          const a = LEVELS[lv - 1]
          const [cr, cg, cb, ca] =
            r.tint[i] === 1 ? (lv >= 3 ? [10, 6, 4, a * 0.9] : [150, 140, 132, 0.28]) : r.tint[i] === 2 ? (lv >= 3 ? [12, 40, 6, a] : [70, 255, 70, a * 0.4]) : [28, 14, 9, a]
          dec.data[o] = cr
          dec.data[o + 1] = cg
          dec.data[o + 2] = cb
          dec.data[o + 3] = ca * 255
        } else if (!isHole(gx - 1, gy - 2)) {
          // The top-left lip casts a shadow into the hole: solid, then a dithered half-shadow.
          sh.data.set([8, 4, 18, 150], o)
        } else if (!isHole(gx - 2, gy - 4) && hash(gx, gy) < 0.5) {
          sh.data.set([8, 4, 18, 90], o)
        }
      }
    }
    r.dctx.putImageData(dec, x0, y0)
    r.sctx.putImageData(sh, x0, y0)
  }

  // ---------- letters, debris, sparks ----------

  private letters(cx: number, cy: number, radius: number, force: number, poly: Pt[], dir?: number) {
    this.withoutLayers(() => this.findLetters(cx, cy, radius, force, poly, dir))
  }

  // Hit-testing through the hole layers' clip-paths is ~4x slower (the BFG does thousands of tests),
  // so take them out while looking for letters. It's synchronous, so nothing renders in between.
  private withoutLayers(fn: () => void) {
    const layers = [...this.roots.values()].map(r => r.layer)
    for (const l of layers) l.style.display = 'none'
    try {
      fn()
    } finally {
      for (const l of layers) l.style.display = ''
    }
  }

  private findLetters(cx: number, cy: number, radius: number, force: number, poly: Pt[], dir?: number) {
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
    const base = rgb(surfaceColor(x, y))
    const big = kind === 'rocket' || kind === 'bfg'
    // Chunks of the wall: whole cells in shades of the surface that was hit, axis-aligned like pixel art.
    const chunks = Math.round((big ? 30 : 7) * scaleCount)
    for (let i = 0; i < chunks; i++) {
      const a = Math.random() * Math.PI * 2
      const v = force * (0.3 + Math.random() * 0.8)
      const cells = big ? 1 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 1.6)
      const k = Math.random() < 0.15 ? 0.35 : 0.7 + Math.random() * 0.6
      this.add({
        kind: 'chunk',
        x: x + Math.cos(a) * radius * 0.5,
        y: y + Math.sin(a) * radius * 0.5,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 250,
        rot: 0,
        vr: 0,
        w: cells * CELL,
        h: Math.max(1, cells - (Math.random() < 0.4 ? 1 : 0)) * CELL,
        color: `rgb(${base.map(c => Math.min(255, Math.round(c * k + (k > 1 ? 18 : 0)))).join(',')})`,
        life: Infinity,
        resting: false,
        born: performance.now(),
      })
    }
    // Dust: pale cells that drift and fade.
    const dust = Math.round((big ? 26 : 7) * scaleCount)
    for (let i = 0; i < dust; i++) {
      const a = Math.random() * Math.PI * 2
      const v = (big ? 260 : 90) * (0.3 + Math.random())
      const g = 150 + Math.round(Math.random() * 60)
      this.add({
        kind: 'spark',
        x: x + (Math.random() - 0.5) * radius,
        y: y + (Math.random() - 0.5) * radius,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        rot: 0,
        vr: 0,
        w: CELL,
        h: CELL,
        color: `rgba(${g},${g - 8},${g - 14},0.55)`,
        life: 0.35 + Math.random() * (big ? 1 : 0.5),
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
          p.rot = p.kind === 'chunk' ? 0 : Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2) + (Math.random() - 0.5) * 0.5
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
        c.fillRect(p.x, p.y, p.w + 0.5, p.h + 0.5)
        c.globalAlpha = 1
        continue
      }
      c.save()
      c.translate(p.kind === 'chunk' ? Math.round(p.x) : p.x, p.kind === 'chunk' ? Math.round(p.y) : p.y)
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

function rgb(color: string): [number, number, number] {
  const m = color.match(/[\d.]+/g)
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [48, 0, 0]
}

function luminance(color: string) {
  const [r, g, b] = rgb(color)
  return (r * 0.3 + g * 0.59 + b * 0.11) / 255
}

// Deterministic per-cell noise in [0, 1).
function hash(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
