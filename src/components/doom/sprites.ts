// Sprite manifest and image cache for the idkfa easter egg (assets in /public/doom).

export type Patch = { w: number; h: number; lx: number; ly: number }
export type Manifest = Record<string, Patch>

const images = new Map<string, HTMLImageElement>()

export function spriteUrl(name: string) {
  return `/doom/gfx/${name}.png`
}

export function image(name: string) {
  let img = images.get(name)
  if (!img) {
    img = new Image()
    img.src = spriteUrl(name)
    images.set(name, img)
  }
  return img
}

let manifestPromise: Promise<Manifest> | null = null
export function loadManifest() {
  manifestPromise ??= fetch('/doom/manifest.json')
    .then(r => r.json() as Promise<Manifest>)
    .then(m => {
      // Warm the cache so the first frame of every animation is ready.
      for (const name of Object.keys(m)) if (!name.startsWith('STCFN')) image(name)
      return m
    })
  return manifestPromise
}
