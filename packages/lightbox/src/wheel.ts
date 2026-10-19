/**
 * Turns a stream of horizontal wheel deltas (trackpad swipes, mouse wheels) into page turns.
 *
 * Native scroll-snap decides from where the gesture *plus momentum* would stop, so ordinary trackpad
 * swipes fall short of halfway and snap back. This follows the fingers 1:1, commits as soon as the
 * swipe is clearly meant (distance or a flick), then swallows that gesture's momentum tail so one
 * swipe is one page. A new swipe is told apart from the tail by a quiet gap, a reversal, or deltas
 * rising again after they had decayed.
 */
export type WheelStep =
  | { type: 'follow'; offset: number } // move content to gesture start + offset
  | { type: 'commit'; dir: 1 | -1; velocity: number } // turn the page; velocity in px/s
  | { type: 'ignore' } // momentum of a gesture already committed

export function createWheelPager(size: () => number) {
  let gesture: { acc: number; samples: { t: number; d: number }[] } | null = null
  let lock: { dir: number; last: number; since: number; min: number } | null = null

  return {
    /** Mid-gesture or still swallowing a momentum tail: every wheel event is ours. */
    get busy() {
      return !!gesture || !!lock
    },
    wheel(d: number, t: number, discrete: boolean): WheelStep {
      if (lock) {
        const abs = Math.abs(d)
        const quiet = t - lock.last > 160
        const reversed = Math.sign(d) === -lock.dir && abs > 3
        const rising = t - lock.since > 220 && abs > lock.min * 1.6 + 3
        lock.last = t
        lock.min = Math.min(lock.min, abs)
        if (!quiet && !reversed && !rising) return { type: 'ignore' }
        lock = null
      }
      gesture ??= { acc: 0, samples: [] }
      gesture.acc += d
      gesture.samples.push({ t, d })
      gesture.samples = gesture.samples.filter((s) => t - s.t <= 60)
      // px/ms: the deltas that arrived after the oldest sample, over the time they took
      const [first, ...rest] = gesture.samples
      const v = rest.length ? rest.reduce((sum, s) => sum + s.d, 0) / Math.max(1, t - first!.t) : d / 16
      const { acc } = gesture
      if (discrete || Math.abs(acc) > size() * 0.3 || (Math.abs(v) > 1.2 && Math.abs(acc) > 20)) {
        const dir = (Math.sign(acc) || Math.sign(d) || 1) as 1 | -1
        gesture = null
        lock = { dir, last: t, since: t, min: Math.abs(d) }
        return { type: 'commit', dir, velocity: discrete ? 0 : v * 1000 }
      }
      return { type: 'follow', offset: acc }
    },
    /** The wheel went quiet without a commit (too short, too slow): settle back. Returns whether a gesture was open. */
    end() {
      const open = !!gesture
      gesture = null
      return open
    },
    reset() {
      gesture = null
      lock = null
    },
  }
}
