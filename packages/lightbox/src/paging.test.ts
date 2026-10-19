import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPaging, type Animate, type Schedule, type Scroller } from './paging.ts'

// Sequences recorded from a real MacBook trackpad (Chromium, natural scrolling), ~16ms apart.
const REAL = [
  [5, 8, 10, 9, 8, 7, 6, 6, 5, 4, 3, 2, 1, 1, 1],
  [-1, -3, -6, -7, -8, -11, -10, -9, -10, -9, -8, -8, -11, -12, -12, -12, -12, -11, -12, -12, -11, -10, -9, -8, -8, -7, -6, -6, -5, -5, -5, -4, -4, -4, -3, -3, -3, -3, -2, -2, -2, -2, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 5, 8, 8, 7, 5, 6, 5, 4, 4, 4, 5, 5, 7, 8, 8, 6, 5, 4, 3, 3, 3, 3, 3, 2, 3, 6, 9, 13, 16, 17, 13, 12, 8, 13, 14, 15, 15, 15, 14, 16, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  [-3, -7, -19, -20, -22, -30, -33, -34, -34, -34, -33, -36, -35, -32, -29, -26, -24, -22, -20, -18, -17, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, -5, -4, -3, -2, -2, -1, -1],
  [3, 1, 4, 13, 29, 37, 40, 42, 47, 48, 41, 39, 42, 65, 75, 76, 75, 72, 70, 72, 68, 64, 60, 56, 53, 49, 45, 41, 38, 35, 32, 30, 27, 24, 22, 20, 19, 17, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3],
]

function env(count = 12, stride = 1000) {
  let now = 0
  const st = { left: 0, snap: true }
  const anims: { from: number; to: number; onUpdate: (v: number) => void; onComplete: () => void; stopped: boolean; t0: number }[] = []
  const timers: { at: number; fn: () => void; cancelled: boolean }[] = []
  const s: Scroller = {
    get left() {
      return st.left
    },
    set left(v) {
      st.left = v
    },
    stride,
    max: (count - 1) * stride,
    count,
    snap: (on) => (st.snap = on),
  }
  const animate: Animate = (from, to, _v, onUpdate, onComplete) => {
    const a = { from, to, onUpdate, onComplete, stopped: false, t0: now }
    anims.push(a)
    return { stop: () => (a.stopped = true) }
  }
  const schedule: Schedule = (fn, ms) => {
    const tm = { at: now + ms, fn, cancelled: false }
    timers.push(tm)
    return () => (tm.cancelled = true)
  }
  /** Advance the clock in 16ms frames, firing timers and stepping animations (each takes ~320ms). */
  const advance = (ms: number) => {
    const end = now + ms
    while (now < end) {
      now = Math.min(end, now + 16)
      for (const tm of timers) if (!tm.cancelled && tm.at <= now) (tm.cancelled = true), tm.fn()
      for (const a of anims) {
        if (a.stopped) continue
        const p = Math.min(1, (now - a.t0) / 320)
        a.onUpdate(a.from + (a.to - a.from) * (1 - (1 - p) ** 3))
        if (p === 1) (a.stopped = true), a.onComplete()
      }
    }
  }
  const paging = createPaging(s, animate, schedule)
  return { s, st, paging, advance, get now() { return now } }
}

function seeded(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647
}

function wheelStream(e: ReturnType<typeof env>, deltas: number[], dy: (i: number) => number = () => 0, dt = 16) {
  for (let i = 0; i < deltas.length; i++) {
    assert.equal(e.paging.wheel({ dx: deltas[i]!, dy: dy(i), t: e.now, discrete: false }), true, 'every wheel event is consumed (never native)')
    e.advance(dt)
  }
}
const to120Hz = (deltas: number[]) => deltas.flatMap((d) => [Math.trunc(d / 2), d - Math.trunc(d / 2)])
/** A busy main thread: Chromium coalesces queued wheel events into fewer, bigger ones. */
const merged = (deltas: number[], n: number) => Array.from({ length: Math.ceil(deltas.length / n) }, (_, i) => deltas.slice(i * n, i * n + n).reduce((a, b) => a + b, 0))

const atRest = (e: ReturnType<typeof env>, label: string) => {
  e.advance(5000)
  e.paging.rest()
  e.advance(5000)
  assert.equal(e.paging.mode, 'idle', `${label}: back to idle`)
  assert.equal(e.st.snap, true, `${label}: snapping restored`)
  assert.ok(Math.abs(e.st.left / e.s.stride - Math.round(e.st.left / e.s.stride)) < 1e-6, `${label}: on a slide (left=${e.st.left})`)
  assert.ok(e.st.left >= 0 && e.st.left <= e.s.max, `${label}: in range`)
}

test('fuzz: any interleaving of wheel, drag, keys, closes and touches comes to rest on a slide', () => {
  const rnd = seeded(Number(process.env.FUZZ_SEED ?? 42))
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]!
  for (let run = 0; run < 3000; run++) {
    const e = env(12, pick([449, 1000, 1624]))
    e.paging.goTo(Math.floor(rnd() * 12), true)
    const ops = 3 + Math.floor(rnd() * 10)
    for (let k = 0; k < ops; k++) {
      const op = Math.floor(rnd() * 9)
      const sign = rnd() < 0.5 ? -1 : 1
      if (op <= 2) {
        const deltas = pick(REAL).map((d) => d * sign)
        const variant = Math.floor(rnd() * 3)
        if (variant === 0) wheelStream(e, deltas)
        else if (variant === 1) wheelStream(e, to120Hz(deltas), undefined, 8)
        else wheelStream(e, merged(deltas, 2 + Math.floor(rnd() * 3)), undefined, 40)
      }
      else if (op === 3) wheelStream(e, Array.from({ length: 20 + Math.floor(rnd() * 100) }, () => sign * Math.round(8 + (rnd() - 0.5) * 6)))
      else if (op === 4) wheelStream(e, Array.from({ length: 40 }, (_, i) => sign * (i < 3 ? 1 : 9)), (i) => (i < 3 ? 4 : 1)) // starts vertical
      else if (op === 5) {
        e.paging.dragStart()
        const n = 1 + Math.floor(rnd() * 20)
        for (let i = 1; i <= n; i++) e.paging.dragMove(sign * i * 25), e.advance(16)
        if (rnd() < 0.9) e.paging.dragEnd(sign * rnd() * 3000)
        else e.paging.dragStart(), e.paging.dragEnd(0) // a drag that got restarted
      } else if (op === 6) e.paging.goTo(Math.floor(rnd() * 12))
      else if (op === 7) {
        e.paging.pointerDown() // a finger lands mid-glide…
        e.advance(Math.floor(rnd() * 200))
        e.paging.rest() // …and lifts without scrolling (a real scroll would end in \`scrollend\` → rest())
      }
      else e.paging.wheel({ dx: sign * 100, dy: 0, t: e.now, discrete: true }) // mouse notch
      e.advance(Math.floor(rnd() * 400))
    }
    atRest(e, `run ${run}`)
  }
})

test('fingers are never ignored: every non-crumb delta moves the content by exactly that much', () => {
  const e = env()
  e.paging.goTo(5, true)
  const rnd = seeded(3)
  const steady = Array.from({ length: 150 }, () => Math.round(8 + (rnd() - 0.5) * 6))
  for (const d of steady) {
    const before = e.st.left
    e.paging.wheel({ dx: d, dy: 0, t: e.now, discrete: false })
    assert.equal(e.st.left - before, d)
    e.advance(16)
  }
  atRest(e, 'steady')
})

test('a 40–50% swipe goes to the next slide — wheel and mouse drag alike', () => {
  for (const stride of [449, 1624]) {
    for (const frac of [0.4, 0.45, 0.5]) {
      const w = env(12, stride)
      w.paging.goTo(3, true)
      const px = Math.round(frac * stride)
      wheelStream(w, Array.from({ length: Math.ceil(px / 6) }, () => 6)) // slow and steady, then lift
      atRest(w, 'wheel')
      assert.equal(w.st.left / stride, 4, `wheel ${frac} of ${stride}`)

      const d = env(12, stride)
      d.paging.goTo(3, true)
      d.paging.dragStart()
      d.paging.dragMove(-px)
      d.paging.dragEnd(0) // released while still
      atRest(d, 'drag')
      assert.equal(d.st.left / stride, 4, `drag ${frac} of ${stride}`)
    }
  }
})

test('120Hz and merged events: a 45% swipe still goes to the next slide', () => {
  for (const stride of [449, 1624]) {
    const px = Math.round(0.45 * stride)
    const slow = Array.from({ length: Math.ceil(px / 6) }, () => 6)
    for (const [deltas, dt] of [[to120Hz(slow), 8], [merged(slow, 3), 48]] as const) {
      const e = env(12, stride)
      e.paging.goTo(3, true)
      wheelStream(e, [...deltas], undefined, dt)
      atRest(e, 'variant')
      assert.equal(e.st.left / stride, 4)
    }
  }
})

test('a tiny nudge stays, a pull-back before letting go stays', () => {
  const e = env()
  e.paging.goTo(3, true)
  wheelStream(e, [2, 3, 3, 4, 3, 2])
  atRest(e, 'nudge')
  assert.equal(e.st.left / 1000, 3)
  wheelStream(e, [...Array(10).fill(12), ...Array(15).fill(-6)])
  atRest(e, 'pull-back')
  assert.equal(e.st.left / 1000, 3)
})

test('every recorded swipe settles in the direction it was going', () => {
  for (const stride of [449, 1624]) {
    REAL.forEach((deltas, i) => {
      const e = env(12, stride)
      e.paging.goTo(5, true)
      wheelStream(e, deltas)
      atRest(e, `real ${i}`)
      const moved = e.st.left / stride - 5
      assert.equal(Math.sign(moved), Math.sign(deltas.reduce((a, b) => a + b, 0)), `real ${i} @${stride}`)
    })
  }
})
