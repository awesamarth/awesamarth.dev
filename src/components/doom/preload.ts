// Download the game's big files (engine + WAD, ~5 MB) as soon as idkfa is typed, so clicking
// Doomguy usually starts instantly. The game iframe (same origin) picks these up from
// window.__doomPreload and falls back to downloading itself if they're missing or failed.

const FILES = ['doom.wasm', 'DOOM1.WAD', 'default.cfg'] as const

type Preload = Partial<Record<(typeof FILES)[number], Promise<ArrayBuffer>>>
declare global {
  interface Window {
    __doomPreload?: Preload
  }
}

// Retries with a short backoff: one stalled connection (e.g. ERR_HTTP2_PING_FAILED) shouldn't kill the game.
export async function fetchWithRetry(url: string, tries = 3): Promise<ArrayBuffer> {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.arrayBuffer()
    } catch (e) {
      if (i >= tries - 1) throw e
      await new Promise(r => setTimeout(r, 1000 * (i + 1)))
    }
  }
}

export function preloadDoom() {
  const cache = (window.__doomPreload ??= {})
  for (const name of FILES) {
    if (cache[name]) continue
    const p = fetchWithRetry(`/doom/game/${name}`)
    p.catch(() => {
      if (cache[name] === p) delete cache[name] // try again next time
    })
    cache[name] = p
  }
}
