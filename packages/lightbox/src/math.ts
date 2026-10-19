export type Rect = { x: number; y: number; w: number; h: number }

/** Everything needed to draw the image at one moment, in screen space. */
export type Visual = { img: Rect; clip: Rect; radius: number; opacity: number }

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  w: lerp(a.w, b.w, t),
  h: lerp(a.h, b.h, t),
})

export const lerpVisual = (a: Visual, b: Visual, t: number): Visual => ({
  img: lerpRect(a.img, b.img, t),
  clip: lerpRect(a.clip, b.clip, t),
  radius: lerp(a.radius, b.radius, t),
  opacity: clamp(lerp(a.opacity, b.opacity, t), 0, 1),
})

/** Place a box with `aspect` (w/h) inside `box` like CSS object-fit + object-position. */
export function fit(aspect: number, box: Rect, mode: 'contain' | 'cover' = 'contain', posX = 0.5, posY = 0.5): Rect {
  const byWidth = aspect > box.w / box.h === (mode === 'contain')
  const w = byWidth ? box.w : box.h * aspect
  const h = byWidth ? box.w / aspect : box.h
  return { x: box.x + (box.w - w) * posX, y: box.y + (box.h - h) * posY, w, h }
}

export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) }
}

export const scaleRect = (r: Rect, s: number): Rect => ({
  x: r.x + (r.w * (1 - s)) / 2,
  y: r.y + (r.h * (1 - s)) / 2,
  w: r.w * s,
  h: r.h * s,
})

/** iOS-style rubber band: how far content travels when pulled `overflow` px past an edge. */
export const rubber = (overflow: number, dimension: number, c = 0.55) =>
  Math.sign(overflow) * (1 - 1 / ((Math.abs(overflow) * c) / dimension + 1)) * dimension

/** Apply rubber banding to `v` outside [min, max]. */
export const band = (v: number, min: number, max: number, dimension: number) =>
  v < min ? min + rubber(v - min, dimension) : v > max ? max + rubber(v - max, dimension) : v

/**
 * Allowed translate range for an element laid out at `pos` with `size`, scaled by `s`
 * (transform-origin 0 0) inside a viewport of `view`. When it fits, it stays centred on its
 * resting position (so scale 1 → translate 0), nudged only as far as needed to stay in view.
 */
export function panRange(pos: number, size: number, s: number, view: number): [number, number] {
  const scaled = size * s
  const lo = view - scaled - pos
  const hi = -pos
  if (scaled <= view) {
    const c = clamp((size * (1 - s)) / 2, hi, lo)
    return [c, c]
  }
  return [lo, hi]
}

/** New translate so the point under `focus` stays put when scale goes s0 → s1. */
export const zoomAt = (pos: number, t: number, s0: number, s1: number, focus: number) =>
  focus - (focus - (pos + t)) * (s1 / s0) - pos

/** Turn a screen-space visual into transform + clip-path for an element laid out at `base`. */
export function toStyle(v: Visual, base: Rect) {
  const s = v.img.w / base.w
  const i = (n: number) => Math.max(0, n / s)
  const top = i(v.clip.y - v.img.y)
  const left = i(v.clip.x - v.img.x)
  const right = i(v.img.x + v.img.w - v.clip.x - v.clip.w)
  const bottom = i(v.img.y + v.img.h - v.clip.y - v.clip.h)
  return {
    x: v.img.x - base.x,
    y: v.img.y - base.y,
    scale: s,
    clipPath: `inset(${top}px ${right}px ${bottom}px ${left}px round ${i(v.radius)}px)`,
    opacity: v.opacity,
  }
}

/** Parse a computed `object-position` like "50% 0%" into fractions. Non-percent values fall back to centre. */
export function objectPosition(value: string): [number, number] {
  const [x = '50%', y = '50%'] = value.split(' ')
  const f = (s: string) => (s.endsWith('%') ? parseFloat(s) / 100 : 0.5)
  return [f(x), f(y)]
}
