import test from 'node:test'
import assert from 'node:assert/strict'
import { flightPose, landingFrames, poseTransform } from './beeMotion.ts'

test('the closed flight has continuous position, tangent and orientation over two cycles', () => {
  const first = flightPose(0), last = flightPose(1)
  assert.ok(Math.hypot(first.x - last.x, first.y - last.y) < 0.001)
  assert.ok(Math.abs(last.angle - first.angle - 360) < 0.001)
  const a = flightPose(0.0001), b = flightPose(0.9999)
  assert.ok(Math.abs((a.x - first.x) - (last.x - b.x)) < 0.001)
  assert.ok(Math.abs((a.y - first.y) - (last.y - b.y)) < 0.001)
  const poses = Array.from({ length: 201 }, (_, i) => flightPose(i / 100))
  assert.ok(Math.max(...poses.map(p => p.x)) - Math.min(...poses.map(p => p.x)) >= 190)
  for (const p of poses) {
    assert.ok(p.x > 50 && p.x < 300 && p.y > 45 && p.y < 130)
    assert.ok(Math.hypot(p.x - 312, p.y - 180) > 85, 'loop must not touch the flower')
  }
})

test('landing starts at the exact captured pose and enters behind the lower petals without fading', () => {
  for (const progress of [0, 0.2, 0.49, 0.75, 0.99]) {
    const pose = flightPose(progress)
    const frames = landingFrames(pose)
    assert.equal(frames[0].transform, poseTransform(pose))
    assert.ok(frames.length > 20)
    assert.ok(frames.every(frame => frame.opacity === undefined || frame.opacity === 1))
    assert.equal(frames.at(-1).offset, 1)
    assert.match(frames.at(-1).transform, /scale\(0\.18\)/)
    assert.ok(frames.every(frame => !/NaN|Infinity/.test(frame.transform)))
  }
})
