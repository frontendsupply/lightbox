/**
 * Horizontal wheel input (trackpad swipes, mouse wheels) for a paged viewer.
 *
 * Rule one: never ignore the fingers. Every delta — finger or macOS momentum — moves the content 1:1,
 * through as many slides as the user scrolls, exactly like native scrolling. Nothing is capped,
 * locked or decided mid-gesture: guessing gesture phases from deltas misfires on real hands and
 * makes the content freeze, then jump.
 *
 * Only when the input is finished does a settle happen, toward the neighbouring slide in the
 * direction of travel. "Finished" is either a pause, or a momentum tail that has shrunk to crumbs
 * (≤2px a frame after real motion) — waiting those out would read as a hang. Crumbs that keep
 * arriving during the settle are swallowed; anything bigger is the fingers again and takes over.
 */
export type WheelStep =
  | { type: 'move'; by: number }
  | { type: 'settle'; dir: -1 | 0 | 1; velocity: number } // velocity in px/s, to seed the spring
  | { type: 'page'; dir: -1 | 1 } // a mouse-wheel notch
  | { type: 'ignore' }

type Sample = { t: number; d: number }

const CRUMB = 2

export function createWheelPager() {
  let recent: Sample[] = []
  let peak = 0
  let settling: { last: number; t: number; dir: number } | null = null

  const finish = (): WheelStep => {
    const sum = recent.reduce((s, x) => s + x.d, 0)
    const [first, ...rest] = recent
    const v = first && rest.length ? (rest.reduce((s, x) => s + x.d, 0) / Math.max(1, rest.at(-1)!.t - first.t)) * 1000 : 0
    recent = []
    peak = 0
    return { type: 'settle', dir: Math.sign(sum) as -1 | 0 | 1, velocity: v }
  }

  return {
    /** Input in progress or a settle still swallowing crumbs: every wheel event is ours. */
    get busy() {
      return recent.length > 0 || !!settling
    },
    wheel(d: number, t: number, discrete: boolean): WheelStep {
      if (settling) {
        const crumb = Math.sign(d) === settling.dir && Math.abs(d) <= Math.min(3, Math.abs(settling.last) + 1) && t - settling.t < 120
        settling.last = d
        settling.t = t
        if (crumb) return { type: 'ignore' }
        settling = null
      }
      if (discrete || (!recent.length && Math.abs(d) >= 50)) return { type: 'page', dir: Math.sign(d) as -1 | 1 }
      recent.push({ t, d })
      recent = recent.filter((s) => t - s.t <= 100)
      peak = Math.max(peak, Math.abs(d))
      const tail = recent.slice(-3)
      if (peak >= 4 && tail.length === 3 && tail.every((s) => Math.abs(s.d) <= CRUMB && Math.sign(s.d) === Math.sign(d))) {
        settling = { last: d, t, dir: Math.sign(d) }
        return finish()
      }
      return { type: 'move', by: d }
    },
    /** No input for a while: the fingers lifted without momentum. */
    idle(): WheelStep | null {
      return recent.length ? finish() : null
    },
    reset() {
      recent = []
      peak = 0
      settling = null
    },
  }
}

/**
 * Which slide to settle on from fractional position `p`, moving `dir`: the next one in the direction
 * of travel once at least `threshold` (fraction of a slide) into it, otherwise back. Never against
 * the motion.
 */
export function settleTarget(p: number, dir: number, threshold: number) {
  const eps = 1e-6
  if (dir > 0) return p - Math.floor(p + eps) >= threshold ? Math.floor(p + eps) + 1 : Math.floor(p + eps)
  if (dir < 0) return Math.ceil(p - eps) - p >= threshold ? Math.ceil(p - eps) - 1 : Math.ceil(p - eps)
  return Math.round(p)
}
