import { clamp } from './math.ts'
import { createWheelPager, settleTarget } from './wheel.ts'

/**
 * Who moves the viewport's scroll position, and when it settles on a slide.
 *
 * One explicit mode instead of independent flags, so the states can't disagree:
 * - `idle`  — nothing of ours is moving it; CSS scroll-snap is on (touch scrolling is native).
 * - `wheel` — trackpad/wheel deltas are scrolling it 1:1.
 * - `drag`  — a mouse drag is scrolling it 1:1.
 * - `glide` — a spring is carrying it to a slide.
 * Snap is on exactly when the mode is `idle`. Every other mode ends in `glide`, and every glide ends
 * on a slide in `idle` — so input can never leave the viewer stranded between two slides.
 *
 * DOM-free (the scroller, animation and timers are injected) so it can be fuzz-tested.
 */
export interface Scroller {
  left: number
  readonly stride: number
  readonly max: number
  readonly count: number
  snap(on: boolean): void
}
export type Animate = (from: number, to: number, velocity: number, onUpdate: (v: number) => void, onComplete: () => void) => { stop(): void }
export type Schedule = (fn: () => void, ms: number) => () => void

export type Mode = 'idle' | 'wheel' | 'drag' | 'glide'

export interface WheelInput {
  dx: number
  dy: number
  t: number
  /** deltaMode !== 0: lines/pages, i.e. a mouse wheel */
  discrete: boolean
}

const IDLE_MS = 90

export function createPaging(s: Scroller, animate: Animate, schedule: Schedule, reducedMotion: () => boolean = () => false) {
  let mode: Mode = 'idle'
  let glider: { stop(): void } | null = null
  let target: number | null = null
  let dragFrom = 0
  let cancelIdle: (() => void) | null = null
  const pager = createWheelPager()

  const page = () => s.left / s.stride
  const threshold = () => Math.min(0.15, 100 / s.stride)
  const setMode = (next: Mode) => {
    if (next === mode) return
    if (mode === 'idle') s.snap(false)
    mode = next
    if (mode === 'idle') s.snap(true)
  }
  const stopGlide = () => {
    glider?.stop()
    glider = null
    target = null
  }
  const clearIdle = () => {
    cancelIdle?.()
    cancelIdle = null
  }

  /** Spring to slide `i`. The only way out of wheel/drag, and it always ends on a slide. */
  const glide = (i: number, velocity = 0) => {
    stopGlide()
    clearIdle()
    const to = clamp(Math.round(i), 0, s.count - 1) * s.stride
    setMode('glide')
    target = to / s.stride
    if (reducedMotion() || Math.abs(s.left - to) < 0.5) {
      s.left = to
      target = null
      return setMode('idle')
    }
    const run = animate(s.left, to, clamp(velocity, -8000, 8000), (v) => (s.left = v), () => {
      if (glider !== run) return
      glider = null
      target = null
      s.left = to
      setMode('idle')
    })
    glider = run
  }

  const settleWheel = (dir: number, velocity: number, flick: boolean) =>
    glide(settleTarget(page(), dir, flick ? 0.01 : threshold()), velocity)

  return {
    get mode() {
      return mode
    },
    /** Returns whether the event was consumed (it should then have its default prevented). */
    wheel({ dx, dy, t, discrete }: WheelInput): boolean {
      if (mode === 'drag') return true
      if (!pager.busy && Math.abs(dx) <= Math.abs(dy)) return true // vertical: nothing to scroll, but never native
      const step = pager.wheel(dx, t, discrete)
      clearIdle()
      if (step.type === 'ignore') return true
      if (step.type === 'page') {
        glide((target ?? Math.round(page())) + step.dir)
        return true
      }
      if (step.type === 'settle') {
        settleWheel(step.dir, step.velocity, step.flick)
        return true
      }
      if (mode !== 'wheel') {
        stopGlide()
        setMode('wheel')
      }
      s.left = clamp(s.left + step.by, 0, s.max)
      cancelIdle = schedule(() => {
        cancelIdle = null
        const end = pager.idle()
        if (end?.type === 'settle') settleWheel(end.dir, end.velocity, end.flick)
        else if (mode === 'wheel') glide(Math.round(page()))
      }, IDLE_MS)
      return true
    },
    dragStart() {
      stopGlide()
      clearIdle()
      pager.reset()
      dragFrom = s.left
      setMode('drag')
    },
    /** Scroll by a drag; returns how far past either end it wants to go (for a rubber band). */
    dragMove(dx: number) {
      if (mode !== 'drag') return 0
      const want = dragFrom - dx
      s.left = clamp(want, 0, s.max)
      return want - s.left
    },
    /** `vx` is the pointer's release velocity in px/s (positive = moving right = going back). */
    dragEnd(vx: number) {
      if (mode !== 'drag') return
      const from = Math.round(dragFrom / s.stride)
      const travel = s.left - dragFrom
      const v = -vx / 1000 // scroll direction, px/ms
      const dir = Math.abs(v) > 0.3 ? Math.sign(v) : Math.sign(travel)
      const flick = Math.abs(v) >= 0.45 && Math.sign(travel) === dir
      const to = settleTarget(page(), dir, flick ? 0.01 : threshold())
      glide(clamp(to, from - 1, from + 1), -vx)
    },
    goTo(i: number, instant = false) {
      if (!instant) return glide(i)
      stopGlide()
      clearIdle()
      pager.reset()
      s.left = clamp(i, 0, s.count - 1) * s.stride
      setMode('idle')
    },
    /** Stop everything and pin a slide (closing the viewer). */
    freeze(i: number) {
      stopGlide()
      clearIdle()
      pager.reset()
      s.left = clamp(i, 0, s.count - 1) * s.stride
      setMode('idle')
    },
    /** A finger landed: hand a gliding viewport back to native (touch) scrolling. */
    pointerDown() {
      if (mode !== 'glide') return
      stopGlide()
      setMode('idle')
    },
    /**
     * Native scrolling ended (`scrollend`), or a finger lifted without scrolling: if nothing of ours is
     * running and the viewport sits between slides, finish the job. The safety net under every path.
     */
    rest() {
      if (mode !== 'idle') return
      const i = Math.round(page())
      const to = clamp(i, 0, s.count - 1) * s.stride
      if (Math.abs(s.left - to) > 0.5) glide(i)
      else s.left = to
    },
    dispose() {
      stopGlide()
      clearIdle()
      setMode('idle')
    },
  }
}
