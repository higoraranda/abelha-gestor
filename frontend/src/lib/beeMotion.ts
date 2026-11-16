export interface BeePose { x: number; y: number; angle: number; scale: number }

export const FLIGHT_DURATION = 5200
export const LANDING_DURATION = 980
const BEE_SIZE = 96 // 24% of the 400-unit scene; translations scale with the image.

export function poseTransform({ x, y, angle, scale }: BeePose): string {
  return `translate(${x / BEE_SIZE * 100}%, ${y / BEE_SIZE * 100}%) rotate(${angle}deg) scale(${scale})`
}

export function flightPose(progress: number): BeePose {
  const turns = Math.floor(progress)
  const phase = progress - turns
  const theta = phase * Math.PI * 2
  const dx = 100 * Math.sin(theta)
  const dy = -27 * Math.cos(theta) + 10 * Math.cos(theta * 2)
  let heading = Math.atan2(dy, dx) * 180 / Math.PI
  if (heading < -90 && phase > 0.5) heading += 360
  heading += turns * 360
  return { x: 180 - 100 * Math.cos(theta), y: 88 - 27 * Math.sin(theta) + 5 * Math.sin(theta * 2), angle: heading + 45, scale: 1 }
}

export function flightFrames(): Keyframe[] {
  return Array.from({ length: 121 }, (_, index) => ({ transform: poseTransform(flightPose(index / 120)), offset: index / 120 }))
}

export function landingFrames(start: BeePose): Keyframe[] {
  const direction = (start.angle - 45) * Math.PI / 180
  const c1 = { x: start.x + Math.cos(direction) * 46, y: start.y + Math.sin(direction) * 46 }
  const c2 = { x: 280, y: 114 }
  let angle = start.angle
  return Array.from({ length: 61 }, (_, index) => {
    const t = index / 60
    if (index === 0) return { transform: poseTransform(start), offset: 0 }
    const u = Math.min(t / 0.8, 1), v = 1 - u
    const x = v ** 3 * start.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u ** 3 * 312
    const y = v ** 3 * start.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u ** 3 * 180 + Math.max(0, (t - 0.8) / 0.2) * 32
    const dx = 3 * v * v * (c1.x - start.x) + 6 * v * u * (c2.x - c1.x) + 3 * u * u * (312 - c2.x)
    const dy = 3 * v * v * (c1.y - start.y) + 6 * v * u * (c2.y - c1.y) + 3 * u * u * (180 - c2.y)
    let target = Math.atan2(dy, dx) * 180 / Math.PI + 45
    while (target - angle > 180) target -= 360
    while (target - angle < -180) target += 360
    angle = target
    const scale = t <= 0.8 ? start.scale + (0.56 - start.scale) * u : 0.56 - (t - 0.8) / 0.2 * 0.38
    return { transform: poseTransform({ x, y, angle, scale: index === 60 ? 0.18 : scale }), offset: t }
  })
}
