import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWheelPager } from './wheel.ts'

const W = 1200
/** Feed deltas 16ms apart starting at t0; returns every step. */
const feed = (pager: ReturnType<typeof createWheelPager>, deltas: number[], t0 = 0, discrete = false) =>
  deltas.map((d, i) => pager.wheel(d, t0 + i * 16, discrete))
const commits = (steps: { type: string }[]) => steps.filter((s) => s.type === 'commit').length

// macOS-like: fingers ramp up then lift, then a long decaying momentum tail
const swipe = [2, 5, 10, 18, 25, 30, 28, 20, 15, 10]
const momentum = [12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1, 1, 1]

test('one swipe with momentum turns exactly one page', () => {
  const p = createWheelPager(() => W)
  const steps = feed(p, [...swipe, ...momentum])
  assert.equal(commits(steps), 1)
  const c = steps.find((s) => s.type === 'commit')
  assert.ok(c && c.type === 'commit' && c.dir === 1 && c.velocity > 0)
  // everything after the commit is swallowed
  assert.ok(steps.slice(steps.indexOf(c) + 1).every((s) => s.type === 'ignore'))
})

test('fingers are followed 1:1 before the commit', () => {
  const p = createWheelPager(() => W)
  assert.deepEqual(feed(p, [2, 3, 4]), [
    { type: 'follow', offset: 2 },
    { type: 'follow', offset: 5 },
    { type: 'follow', offset: 9 },
  ])
})

test('a slow short swipe does not commit and settles back', () => {
  const p = createWheelPager(() => W)
  assert.equal(commits(feed(p, [2, 3, 3, 4, 3, 2])), 0)
  assert.equal(p.end(), true)
  assert.equal(p.busy, false)
})

test('a slow drag commits once it passes 30% of the width', () => {
  const p = createWheelPager(() => W)
  const steps = feed(p, Array(40).fill(-10)) // 0.6px/ms: never a flick
  const at = steps.findIndex((s) => s.type === 'commit')
  assert.equal(at, 36) // 37 × 10 = 370 > 360
  assert.deepEqual(steps[at], { type: 'commit', dir: -1, velocity: -625 })
})

test('two swipes in a row turn two pages', () => {
  const p = createWheelPager(() => W)
  const first = feed(p, [...swipe, ...momentum.slice(0, 8)])
  // fingers land again: momentum stops, a fresh ramp starts 300ms after the first commit
  const second = feed(p, swipe, 16 * first.length + 120)
  assert.equal(commits(first) + commits(second), 2)
})

test('a quiet gap ends the momentum lock', () => {
  const p = createWheelPager(() => W)
  feed(p, swipe)
  assert.equal(commits(feed(p, swipe, 1000)), 1)
})

test('reversing during the tail starts a new gesture the other way', () => {
  const p = createWheelPager(() => W)
  feed(p, [...swipe, 12, 10])
  const back = feed(p, [-5, -10, -20, -30, -30], 16 * 13)
  const c = back.find((s) => s.type === 'commit')
  assert.ok(c && c.type === 'commit' && c.dir === -1)
})

test('a mouse wheel notch is one page', () => {
  const p = createWheelPager(() => W)
  const [step] = feed(p, [100], 0, true)
  assert.deepEqual(step, { type: 'commit', dir: 1, velocity: 0 })
})
