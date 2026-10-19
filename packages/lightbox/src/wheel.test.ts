import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWheelPager, type WheelStep } from './wheel.ts'

// Sequences recorded from a real MacBook trackpad (Chromium, natural scrolling), ~16ms apart.
const REAL = {
  lightForward: [5, 8, 10, 9, 8, 7, 6, 6, 5, 4, 3, 2, 1, 1, 1],
  slowBackward: [-1, -3, -6, -7, -8, -11, -10, -9, -10, -9, -8, -8, -11, -12, -12, -12, -12, -11, -12, -12, -11, -10, -9, -8, -8, -7, -6, -6, -5, -5, -5, -4, -4, -4, -3, -3, -3, -3, -2, -2, -2, -2, -1, -1, -1, -1, -1, -1, -1],
  slowForwardWithPause: [1, 2, 5, 8, 8, 7, 5, 6, 5, 4, 4, 4, 5, 5, 7, 8, 8, 6, 5, 4, 3, 3, 3, 3, 3, 2, 3, 6, 9, 13, 16, 17, 13, 12, 8, 13, 14, 15, 15, 15, 14, 16, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  quickFlickBackward: [-3, -7, -19, -20, -22, -30, -33, -34, -34, -34, -33, -36, -35, -32, -29, -26, -24, -22, -20, -18, -17, -15, -14, -13, -12, -11, -10, -9],
  twoFastSwipes: [
    3, 1, 4, 13, 29, 37, 40, 42, 47, 48, 41, 39, 42, 65, 75, 76, 75, 72, 70, 72, 68, 64, 60, 56, 53, 49, 45, 41, 38, 35, 32, 30, 27, 24, 22, 20, 19, 17, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3,
    6, 1, 1, 10, 22, 37, 41, 41, 49, 45, 46, 48, 42, 76, 85, 87, 85, 82, 79, 80, 77, 72, 66, 62, 58, 55, 51, 47, 43, 40, 37, 34, 31, 28, 26, 24, 22, 20, 19, 17, 16, 14, 13, 12, 11, 10, 9, 8, 8, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3,
  ],
}
const W = 425

function play(deltas: number[], { t0 = 0, discrete = false, pager = createWheelPager(() => W) } = {}) {
  const steps: WheelStep[] = deltas.map((d, i) => pager.wheel(d, t0 + i * 16, discrete))
  const tail = pager.end() // the wheel goes quiet afterwards
  if (tail) steps.push(tail)
  const releases = steps.filter((s): s is Extract<WheelStep, { type: 'release' }> => s.type === 'release')
  return { steps, releases, pager }
}

test('a light forward swipe turns the page instead of snapping back', () => {
  const { releases } = play(REAL.lightForward)
  assert.deepEqual(releases.map((r) => r.dir), [1])
  assert.ok(releases[0]!.velocity > 0)
})

test('a slow backward swipe goes back exactly one page', () => {
  assert.deepEqual(play(REAL.slowBackward).releases.map((r) => r.dir), [-1])
})

test('a slow forward swipe with a hesitation in the middle is still one page', () => {
  assert.deepEqual(play(REAL.slowForwardWithPause).releases.map((r) => r.dir), [1])
})

test('a quick flick is one page', () => {
  assert.deepEqual(play(REAL.quickFlickBackward).releases.map((r) => r.dir), [-1])
})

test('two fast swipes in a row are two pages, momentum in between is swallowed', () => {
  assert.deepEqual(play(REAL.twoFastSwipes).releases.map((r) => r.dir), [1, 1])
})

test('content follows the fingers 1:1 until lift-off', () => {
  const { steps } = play(REAL.lightForward)
  assert.deepEqual(steps.slice(0, 3), [
    { type: 'follow', offset: 5 },
    { type: 'follow', offset: 13 },
    { type: 'follow', offset: 23 },
  ])
  // after the release the momentum tail never moves anything
  const at = steps.findIndex((s) => s.type === 'release')
  assert.ok(steps.slice(at + 1).every((s) => s.type === 'ignore'))
})

test('a slow drag lifted while still goes forward', () => {
  assert.deepEqual(play(Array(30).fill(4)).releases.map((r) => r.dir), [1])
})

test('a tiny nudge settles back', () => {
  assert.deepEqual(play([2, 3, 3, 4, 3, 2]).releases.map((r) => r.dir), [0])
})

test('pulling back before lifting cancels', () => {
  assert.deepEqual(play([...Array(15).fill(10), ...Array(10).fill(-8)]).releases.map((r) => r.dir), [0])
})

test('the same swipes behave the same on a wide screen', () => {
  const wide = () => createWheelPager(() => 1440)
  assert.deepEqual(play(REAL.lightForward, { pager: wide() }).releases.map((r) => r.dir), [1])
  assert.deepEqual(play(REAL.slowBackward, { pager: wide() }).releases.map((r) => r.dir), [-1])
  assert.deepEqual(play([2, 3, 3, 4, 3, 2], { pager: wide() }).releases.map((r) => r.dir), [0])
})

test('a mouse wheel notch is one page', () => {
  assert.deepEqual(play([100], { discrete: true }).releases.map((r) => r.dir), [1])
  assert.deepEqual(play([-120]).releases.map((r) => r.dir), [-1])
})
