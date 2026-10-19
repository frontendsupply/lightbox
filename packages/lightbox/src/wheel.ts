/**
 * Turns horizontal wheel deltas (trackpad swipes, mouse wheels) into page turns that feel like Photos.
 *
 * Browsers don't say when fingers leave a trackpad; after lift-off macOS keeps sending "momentum"
 * deltas. Waiting for those to die out (what scroll-snap and most carousels do) makes a light swipe
 * land short and snap back, and the viewer seems to hang after release. Instead:
 *
 * - follow the fingers 1:1 for the whole swipe;
 * - spot lift-off from the momentum signature — macOS decays it by a steady ~8% per frame, while
 *   fingers are noisy — or from the deltas stopping;
 * - decide from where the content is *and* how fast it was moving at lift-off, then swallow the rest
 *   of the momentum so one swipe is one page. A new swipe is told apart from the tail by a pause, a
 *   reversal, or deltas rising again.
 */
export type WheelStep =
  | { type: 'follow'; offset: number } // move content to gesture start + offset
  | { type: 'release'; dir: -1 | 0 | 1; velocity: number } // settle: next/prev/back; velocity in px/s
  | { type: 'ignore' } // momentum of a gesture already released

type Sample = { t: number; d: number }

/** Four strictly decaying deltas with momentum-like ratios. */
function isMomentum(s: Sample[]) {
  if (s.length < 4) return false
  const [a, b, c, d] = s.slice(-4).map((x) => x.d) as [number, number, number, number]
  if (Math.sign(a) !== Math.sign(d) || Math.abs(a) < 6) return false
  const ok = (x: number, y: number) => {
    const r = Math.abs(y) / Math.abs(x)
    return r >= 0.84 && r < 0.985
  }
  return ok(a, b) && ok(b, c) && ok(c, d)
}

export function createWheelPager(size: () => number) {
  let gesture: { acc: number; samples: Sample[] } | null = null
  let lock: { dir: number; last: number; since: number; min: number } | null = null

  // Project where the swipe was heading: a light swipe forward means forward.
  const decide = (acc: number, v: number): -1 | 0 | 1 => {
    const projected = acc + v * 250
    // Finger travel doesn't grow with the screen, so the threshold is capped in pixels.
    return Math.abs(projected) > Math.min(size() * 0.18, 120) ? (Math.sign(projected) as -1 | 1) : 0
  }

  return {
    /** Mid-swipe or still swallowing a momentum tail: every wheel event is ours. */
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
      // Mouse wheels: one notch, one page.
      if (discrete || (!gesture && Math.abs(d) >= 50)) {
        gesture = null
        lock = { dir: Math.sign(d), last: t, since: t, min: Math.abs(d) }
        return { type: 'release', dir: Math.sign(d) as -1 | 1, velocity: 0 }
      }
      gesture ??= { acc: 0, samples: [] }
      gesture.acc += d
      gesture.samples.push({ t, d })
      if (gesture.samples.length > 8) gesture.samples.shift()
      if (isMomentum(gesture.samples)) {
        // The first decaying delta is the speed the fingers had when they lifted.
        const s = gesture.samples
        const lift = s[s.length - 4]!
        const prev = s[s.length - 5]
        const v = lift.d / Math.max(8, prev ? lift.t - prev.t : 16) // px/ms
        const { acc } = gesture
        gesture = null
        lock = { dir: Math.sign(d), last: t, since: t, min: Math.abs(d) }
        return { type: 'release', dir: decide(acc, v), velocity: v * 1000 }
      }
      return { type: 'follow', offset: gesture.acc }
    },
    /** The deltas stopped without momentum: the fingers lifted while (almost) still. */
    end(): WheelStep | null {
      if (!gesture) return null
      const { acc, samples } = gesture
      gesture = null
      // The last few deltas say which way the fingers were last going: pulling back before lifting cancels.
      const recent = samples.slice(-3)
      const v = recent.reduce((sum, x) => sum + x.d, 0) / (16 * recent.length)
      return { type: 'release', dir: decide(acc, v), velocity: 0 }
    },
    reset() {
      gesture = null
      lock = null
    },
  }
}
