/**
 * Horizontal wheel input (trackpad swipes, mouse wheels) for a paged viewer.
 *
 * Rule one: never ignore the fingers. Every delta — finger or macOS momentum — moves the content 1:1,
 * through as many slides as the user scrolls, exactly like native scrolling. Nothing is capped,
 * locked or decided mid-gesture: guessing gesture phases from deltas misfires on real hands and
 * makes the content freeze, then jump.
 *
 * Only when the input is finished does a settle happen, toward the neighbouring slide in the
 * direction of travel. "Finished" is either a pause, or a momentum tail that has slowed to crumbs —
 * waiting those out would read as a hang. Crumbs that keep arriving during the settle are
 * swallowed; anything faster is the fingers again and takes over.
 *
 * Every threshold is a rate (px/ms from event timestamps), not pixels per event: a 120Hz display
 * delivers twice the events at half the size, and a busy main thread makes Chromium merge queued
 * events into fewer, bigger ones. Per-event sizes would misread both.
 */
export type WheelStep =
  | { type: 'move'; by: number }
  | { type: 'settle'; dir: -1 | 0 | 1; velocity: number; flick: boolean } // velocity in px/s, to seed the spring
  | { type: 'page'; dir: -1 | 1 } // a mouse-wheel notch
  | { type: 'ignore' }

type Sample = { t: number; d: number }

const FRAME = 16
/** ≤2px a 60Hz frame: the end of a momentum tail. */
const CRUMB_RATE = 2 / FRAME
/** What still counts as a crumb once a settle has begun (3px a frame). */
const SWALLOW_RATE = 3 / FRAME
/** A gesture with real motion in it (4px a frame), as opposed to a nudge. */
const MOTION_RATE = 4 / FRAME
/** A quick swipe: intent even if it travelled only a little. */
const FLICK_RATE = 0.45
/** A big delta this long after any other wheel input is a mouse-wheel notch, not a trackpad. */
const NOTCH_GAP = 250
/** How much recent input the crumb test looks at (about three 60Hz frames). */
const WINDOW = 48

export function createWheelPager() {
  let recent: Sample[] = []
  let travel = 0
  let speed = 0
  let lastT = -Infinity
  let settling: { t: number; dir: number } | null = null

  const finish = (): Extract<WheelStep, { type: 'settle' }> => {
    const sum = recent.reduce((s, x) => s + x.d, 0)
    const [first, ...rest] = recent
    const v = first && rest.length ? (rest.reduce((s, x) => s + x.d, 0) / Math.max(1, rest.at(-1)!.t - first.t)) * 1000 : 0
    // The overall direction, unless the last moments clearly went the other way (a pull-back);
    // a pixel of jitter as the fingers stop must not flip a 45% swipe backwards.
    const dir = Math.sign(Math.abs(sum) >= 10 ? sum : travel) as -1 | 0 | 1
    const flick = speed >= FLICK_RATE && Math.abs(travel) >= 30 && Math.sign(travel) === dir
    settling = { t: recent.at(-1)?.t ?? lastT, dir: dir || Math.sign(travel) }
    recent = []
    travel = 0
    speed = 0
    return { type: 'settle', dir, velocity: v, flick }
  }

  return {
    /** Input in progress or a settle still swallowing crumbs: every wheel event is ours. */
    get busy() {
      return recent.length > 0 || !!settling
    },
    wheel(d: number, t: number, discrete: boolean): WheelStep {
      if (d === 0) return { type: 'ignore' } // purely vertical noise: neither motion nor the fingers coming back
      const gap = t - lastT
      lastT = t
      const rate = Math.abs(d) / Math.max(8, gap > 100 ? FRAME : gap)
      if (settling) {
        const crumb = Math.sign(d) === settling.dir && rate <= SWALLOW_RATE && t - settling.t < 120
        settling.t = t
        if (crumb) return { type: 'ignore' }
        settling = null
      }
      if (discrete || (!recent.length && gap > NOTCH_GAP && Math.abs(d) >= 50)) return { type: 'page', dir: Math.sign(d) as -1 | 1 }
      speed = Math.max(speed, rate)
      travel += d
      recent.push({ t, d })
      recent = recent.filter((s) => t - s.t <= 100)
      // Crumbs = the average rate over the last ~3 frames, which reads the same at 60Hz, 120Hz or with
      // merged events (judging single events made "1 2 1 1 1 2" at 120Hz look like a tail).
      const window = recent.filter((s) => t - s.t < WINDOW)
      const full = recent.some((s) => t - s.t >= WINDOW - 8)
      const slow = window.reduce((sum, s) => sum + Math.abs(s.d), 0) / WINDOW <= CRUMB_RATE
      if (speed >= MOTION_RATE && full && slow && window.every((s) => Math.sign(s.d) === Math.sign(d))) return finish()
      return { type: 'move', by: d }
    },
    /** No input for a while: the fingers lifted without momentum (late momentum is still swallowed). */
    idle(): WheelStep | null {
      return recent.length ? finish() : null
    },
    reset() {
      recent = []
      travel = 0
      speed = 0
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
