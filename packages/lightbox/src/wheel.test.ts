import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWheelPager, settleTarget, type WheelStep } from './wheel.ts'

// Sequences recorded from a real MacBook trackpad (Chromium, natural scrolling), ~16ms apart.
const REAL = {
  lightForward: [5, 8, 10, 9, 8, 7, 6, 6, 5, 4, 3, 2, 1, 1, 1],
  slowBackward: [-1, -3, -6, -7, -8, -11, -10, -9, -10, -9, -8, -8, -11, -12, -12, -12, -12, -11, -12, -12, -11, -10, -9, -8, -8, -7, -6, -6, -5, -5, -5, -4, -4, -4, -3, -3, -3, -3, -2, -2, -2, -2, -1, -1, -1, -1, -1, -1, -1],
  slowForwardWithPause: [1, 2, 5, 8, 8, 7, 5, 6, 5, 4, 4, 4, 5, 5, 7, 8, 8, 6, 5, 4, 3, 3, 3, 3, 3, 2, 3, 6, 9, 13, 16, 17, 13, 12, 8, 13, 14, 15, 15, 15, 14, 16, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  twoFastSwipes: [
    3, 1, 4, 13, 29, 37, 40, 42, 47, 48, 41, 39, 42, 65, 75, 76, 75, 72, 70, 72, 68, 64, 60, 56, 53, 49, 45, 41, 38, 35, 32, 30, 27, 24, 22, 20, 19, 17, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3,
    6, 1, 1, 10, 22, 37, 41, 41, 49, 45, 46, 48, 42, 76, 85, 87, 85, 82, 79, 80, 77, 72, 66, 62, 58, 55, 51, 47, 43, 40, 37, 34, 31, 28, 26, 24, 22, 20, 19, 17, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3,
  ],
}

function play(deltas: number[], pager = createWheelPager(), t0 = 0) {
  const steps: WheelStep[] = deltas.map((d, i) => pager.wheel(d, t0 + i * 16, false))
  const end = pager.idle()
  if (end) steps.push(end)
  const moved = steps.reduce((s, x) => s + (x.type === 'move' ? x.by : 0), 0)
  const settles = steps.filter((s): s is Extract<WheelStep, { type: 'settle' }> => s.type === 'settle')
  return { steps, moved, settles, ignored: steps.filter((s) => s.type === 'ignore').length, pager }
}

test('steady scrolling is followed 1:1 with nothing ignored and no early settle', () => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const steady = Array.from({ length: 125 }, () => Math.round(8 + (rnd() - 0.5) * 6)) // 2s, ±3px hand noise
  const { steps, moved, ignored } = play(steady)
  assert.equal(ignored, 0)
  assert.equal(moved, steady.reduce((a, b) => a + b, 0))
  assert.equal(steps.slice(0, -1).every((s) => s.type === 'move'), true) // the only settle is when input stops
})

test('real swipes move the content by every finger and momentum pixel until the crumbs', () => {
  for (const deltas of [REAL.lightForward, REAL.slowForwardWithPause, REAL.twoFastSwipes]) {
    const { steps, settles } = play(deltas)
    // the only deltas not applied are the ≤2px crumbs at the very end of the momentum tail
    const skipped = deltas.filter((_, i) => steps[i]!.type === 'ignore')
    assert.ok(skipped.every((d) => Math.abs(d) <= 2), `skipped: ${skipped}`)
    assert.ok(deltas.slice(0, deltas.length - skipped.length).every((_, i) => steps[i]!.type !== 'ignore'))
    assert.equal(settles.length, 1)
    assert.equal(settles[0]!.dir, 1)
  }
})

test('a slow backward swipe settles backward', () => {
  const { settles } = play(REAL.slowBackward)
  assert.deepEqual(settles.map((s) => s.dir), [-1])
})

test('two swipes in a row are one continuous scroll, not two locked pages', () => {
  const { settles, ignored } = play(REAL.twoFastSwipes)
  assert.equal(settles.length, 1)
  assert.equal(ignored, 0)
})

test('momentum crumbs after a settle are swallowed, the fingers coming back are not', () => {
  const pager = createWheelPager()
  play([10, 12, 10, 8, 6, 4, 2, 2, 2], pager)
  const after = [1, 1, 2, 1].map((d, i) => pager.wheel(d, 200 + i * 16, false))
  assert.ok(after.every((s) => s.type === 'ignore'))
  const again = [2, 3, 6, 10].map((d, i) => pager.wheel(d, 270 + i * 16, false))
  assert.deepEqual(again.map((s) => s.type), ['ignore', 'ignore', 'move', 'move'])
})

test('reversing during the crumbs takes over immediately', () => {
  const pager = createWheelPager()
  play([10, 12, 10, 8, 6, 4, 2, 2, 2], pager)
  assert.equal(pager.wheel(-2, 200, false).type, 'move')
})

test('a mouse wheel notch pages', () => {
  assert.deepEqual(createWheelPager().wheel(100, 0, true), { type: 'page', dir: 1 })
  assert.deepEqual(createWheelPager().wheel(-120, 0, false), { type: 'page', dir: -1 })
})

test('a light flick counts as intent; a slow nudge does not', () => {
  // lightForward travels only 76px in total — under a wide screen's distance threshold — but was quick,
  // also when events arrive a little late (browser timers, busy frames)
  assert.equal(play(REAL.lightForward).settles[0]!.flick, true)
  const late = createWheelPager()
  const steps = REAL.lightForward.map((d, i) => late.wheel(d, i * 19, false)) // 19ms apart
  const settle = steps.find((s) => s.type === 'settle') ?? late.idle()
  assert.ok(settle?.type === 'settle' && settle.flick)
  assert.equal(play([2, 3, 3, 4, 3, 2]).settles[0]!.flick, false)
  assert.equal(play(Array(30).fill(4)).settles[0]!.flick, false) // slow drag: distance decides
  // flicked forward, then pulled back before letting go: settles backward, no flick
  const back = play([10, 14, 12, ...Array(12).fill(-4)]).settles[0]!
  assert.equal(back.dir, -1)
  assert.equal(back.flick, false)
})

test('settle target: forward once 15% in, never against the motion', () => {
  assert.equal(settleTarget(3.17, 1, 0.15), 4)
  assert.equal(settleTarget(3.1, 1, 0.15), 3)
  assert.equal(settleTarget(3.9, 1, 0.15), 4)
  assert.equal(settleTarget(3.6, -1, 0.15), 3)
  assert.equal(settleTarget(3.95, -1, 0.15), 4)
  assert.equal(settleTarget(4, 1, 0.15), 4)
  assert.equal(settleTarget(4, -1, 0.15), 4)
  assert.equal(settleTarget(3.4, 0, 0.15), 3)
})
