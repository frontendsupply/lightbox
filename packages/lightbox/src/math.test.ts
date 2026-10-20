import assert from 'node:assert/strict'
import { test } from 'node:test'
import { band, fit, intersect, lerpVisual, objectPosition, panRange, rubber, toStyle, zoomAt } from './math.ts'

const box = { x: 0, y: 0, w: 100, h: 100 }

test('fit contain / cover', () => {
  assert.deepEqual(fit(2, box, 'contain'), { x: 0, y: 25, w: 100, h: 50 })
  assert.deepEqual(fit(2, box, 'cover'), { x: -50, y: 0, w: 200, h: 100 })
  assert.deepEqual(fit(0.5, box, 'cover', 0.5, 0), { x: 0, y: 0, w: 100, h: 200 })
})

test('intersect', () => {
  assert.deepEqual(intersect(box, { x: 50, y: 50, w: 100, h: 100 }), { x: 50, y: 50, w: 50, h: 50 })
  assert.equal(intersect(box, { x: 200, y: 0, w: 10, h: 10 }).w, 0)
})

test('rubber band resists and stays under the dimension', () => {
  assert.equal(rubber(0, 100), 0)
  assert.ok(rubber(50, 100) < 50 && rubber(50, 100) > 0)
  assert.ok(rubber(1e6, 100) < 100)
  assert.equal(rubber(-50, 100), -rubber(50, 100))
  assert.equal(band(5, 0, 10, 100), 5)
  assert.ok(band(20, 0, 10, 100) < 20)
})

test('pan range centres small content and bounds large content', () => {
  assert.deepEqual(panRange(10, 80, 1, 100), [0, 0])
  assert.deepEqual(panRange(0, 100, 2, 100), [-100, -0])
  // asymmetric padding: resting at pos 20 in a 100 view, scale 1 must not move it
  assert.deepEqual(panRange(20, 50, 1, 100), [0, 0])
  // grows around its own centre…
  assert.deepEqual(panRange(20, 20, 2, 100), [-10, -10])
  // …until the viewport edge pushes back
  assert.deepEqual(panRange(40, 50, 1.6, 100), [-20, -20])
})

test('zoomAt keeps the focus point fixed', () => {
  const pos = 10,
    t = 0,
    s0 = 1,
    s1 = 3,
    f = 40
  const t1 = zoomAt(pos, t, s0, s1, f)
  // local point under focus before and after must match
  assert.equal((f - (pos + t)) / s0, (f - (pos + t1)) / s1)
})

test('toStyle maps a cover-cropped thumbnail onto the laid-out image', () => {
  const base = { x: 0, y: 0, w: 200, h: 100 }
  // thumbnail: 50x50 square showing the centre of a 2:1 image → image drawn 100x50, centred on the square
  const thumb = { img: { x: 75, y: 50, w: 100, h: 50 }, clip: { x: 100, y: 50, w: 50, h: 50 }, radius: 10, opacity: 1 }
  const s = toStyle(thumb, base)
  assert.equal(s.scale, 0.5)
  assert.equal(s.x, 75)
  assert.equal(s.clipPath, 'inset(0px 50px 0px 50px round 20px)')
  const end = toStyle(lerpVisual(thumb, { img: base, clip: base, radius: 0, opacity: 1 }, 1), base)
  assert.deepEqual([end.x, end.y, end.scale, end.clipPath], [0, 0, 1, 'inset(0px 0px 0px 0px round 0px)'])
})

test('objectPosition', () => {
  assert.deepEqual(objectPosition('50% 0%'), [0.5, 0])
  assert.deepEqual(objectPosition('10px 100%'), [0.5, 1])
})
