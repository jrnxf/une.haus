import {
  CONE_H,
  DEATH_ANIM_FRAMES,
  DEATH_FREEZE_FRAMES,
  DUST_LIFE,
  LETTER_BOB_AMPLITUDE,
  LETTER_BONUS_DISPLAY_FRAMES,
  LETTER_SIZE,
  LETTER_WORD,
  PLAYER_X,
  RAIL_GAP_BOB_AMPLITUDE,
  RAIL_OFFSET,
  TRAMPOLINE_H,
  WHEEL_R,
} from "./constants"
import { computeLean, randomBetween } from "./helpers"
import { getSurfaceY } from "./terrain"
import {
  type Cloud,
  type CollectibleLetter,
  type DustParticle,
  type GameState,
  type LightningBolt,
  type SpeedLine,
  type TerrainPiece,
  type Ufo,
} from "./types"

// --- Unicyclist ---

function drawUnicyclist(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wheelAngle: number,
  pedalAngle: number,
  fg: string,
  flatTire: boolean,
  grinding: boolean,
  lean: number,
  deathTilt: number,
  seatSpin: number,
  backflipAngle: number,
) {
  const wheelR = WHEEL_R
  const wheelCenterY = y

  ctx.save()
  if (backflipAngle > 0) {
    const pivotX = x
    const pivotY = y
    ctx.translate(pivotX, pivotY)
    ctx.rotate(-backflipAngle)
    ctx.translate(-pivotX, -pivotY)
  }
  if (deathTilt !== 0) {
    const pivotX = x
    const pivotY = y + wheelR
    ctx.translate(pivotX, pivotY)
    ctx.rotate(deathTilt)
    ctx.translate(-pivotX, -pivotY)
  }

  // --- Compute positions ---
  const seatY = wheelCenterY - wheelR - 16
  const pedalLen = 4
  const hipX = x + lean
  const hipY = seatY
  const px1 = x + Math.cos(pedalAngle) * pedalLen
  const py1 = wheelCenterY + Math.sin(pedalAngle) * pedalLen
  const px2 = x + Math.cos(pedalAngle + Math.PI) * pedalLen
  const py2 = wheelCenterY + Math.sin(pedalAngle + Math.PI) * pedalLen

  // Leg helper: 2-bone IK with subtle blend toward straight line
  const drawLeg = (footX: number, footY: number) => {
    ctx.strokeStyle = fg
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    if (seatSpin === 0) {
      const thigh = 17,
        shin = 17,
        blend = 0.2
      const ldx = footX - hipX,
        ldy = footY - hipY
      const dist = Math.min(Math.hypot(ldx, ldy), thigh + shin - 0.1)
      const cosA =
        (thigh * thigh + dist * dist - shin * shin) / (2 * thigh * dist)
      const a = Math.acos(Math.max(-1, Math.min(1, cosA)))
      const base = Math.atan2(ldy, ldx)
      const fullKx = hipX + Math.cos(base - a) * thigh
      const fullKy = hipY + Math.sin(base - a) * thigh
      const midX = (hipX + footX) / 2,
        midY = (hipY + footY) / 2
      ctx.lineTo(midX + (fullKx - midX) * blend, midY + (fullKy - midY) * blend)
      ctx.lineTo(footX, footY)
    } else {
      ctx.lineTo(hipX + 2, hipY + 10)
      ctx.lineTo(hipX - 1, hipY + 14)
    }
    ctx.stroke()
  }

  // --- Back leg (behind wheel) ---
  drawLeg(px2, py2)

  // --- Tire ---
  ctx.strokeStyle = fg
  ctx.lineWidth = flatTire ? 1.5 : 3.5
  ctx.beginPath()
  ctx.arc(x, wheelCenterY, wheelR, 0, Math.PI * 2)
  ctx.stroke()

  // Spokes
  ctx.strokeStyle = fg
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const angle = wheelAngle + (i * Math.PI) / 4
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(angle) * 2, wheelCenterY + Math.sin(angle) * 2)
    ctx.lineTo(
      x + Math.cos(angle) * (wheelR - 2),
      wheelCenterY + Math.sin(angle) * (wheelR - 2),
    )
    ctx.stroke()
  }

  // Seat post, seat, and pedals — rotate around wheel center during unispin
  if (seatSpin !== 0) {
    ctx.save()
    ctx.translate(x, wheelCenterY)
    ctx.rotate(seatSpin)
    ctx.translate(-x, -wheelCenterY)
  }

  // Frame (thick line from seat to wheel center)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(x, wheelCenterY)
  ctx.lineTo(x + lean, seatY)
  ctx.stroke()

  // Curved seat
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + lean - 4, seatY - 1)
  ctx.quadraticCurveTo(x + lean + 1, seatY + 2, x + lean + 7, seatY - 1)
  ctx.stroke()

  // Front pedal
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(px1 - 3, py1)
  ctx.lineTo(px1 + 3, py1)
  ctx.stroke()

  // Back pedal
  ctx.beginPath()
  ctx.moveTo(px2 - 3, py2)
  ctx.lineTo(px2 + 3, py2)
  ctx.stroke()

  if (seatSpin !== 0) {
    ctx.restore()
  }
  ctx.lineWidth = 2

  // Body
  const torsoLen = 14
  const shoulderX = hipX + 3
  const shoulderY = hipY - torsoLen
  const headR = 5
  const headX = shoulderX + 2
  const headY = shoulderY - headR - 1

  // Torso
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(shoulderX, shoulderY)
  ctx.stroke()

  // Head
  ctx.beginPath()
  ctx.arc(headX, headY, headR, 0, Math.PI * 2)
  ctx.stroke()

  // Eye
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.ellipse(headX + 2.5, headY - 0.5, 1.2, 0.8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Ear (small C-shape on back of head)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(headX - headR + 1.5, headY + 0.5, 1.5, -Math.PI * 0.5, Math.PI * 0.5)
  ctx.stroke()

  // Mouth
  ctx.beginPath()
  ctx.moveTo(headX + 1.5, headY + 2)
  ctx.lineTo(headX + 4, headY + 2)
  ctx.stroke()

  ctx.lineWidth = 2

  // Front arm — always grabs front of seat
  const seatFrontX = x + lean + 7
  const seatFrontY = seatY - 1
  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY)
  ctx.lineTo(seatFrontX, seatFrontY)
  ctx.stroke()

  // Back arm
  if (grinding) {
    // Raised with rock-on hand — pushed further from head
    const ba1x = shoulderX - 7
    const ba1y = shoulderY - 5
    const bhx = shoulderX - 10
    const bhy = shoulderY - 13
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY)
    ctx.lineTo(ba1x, ba1y)
    ctx.lineTo(bhx, bhy)
    ctx.stroke()
    // Rock-on fingers
    ctx.lineWidth = 1.5
    // Index finger (inner)
    ctx.beginPath()
    ctx.moveTo(bhx + 1.5, bhy)
    ctx.lineTo(bhx + 2, bhy - 6)
    ctx.stroke()
    // Pinky (outer)
    ctx.beginPath()
    ctx.moveTo(bhx - 1.5, bhy)
    ctx.lineTo(bhx - 2, bhy - 6)
    ctx.stroke()
    // Curled middle + ring (short nubs)
    ctx.beginPath()
    ctx.moveTo(bhx + 0.3, bhy)
    ctx.lineTo(bhx + 0.3, bhy - 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(bhx - 0.3, bhy)
    ctx.lineTo(bhx - 0.3, bhy - 2)
    ctx.stroke()
    // Thumb
    ctx.beginPath()
    ctx.moveTo(bhx + 2, bhy)
    ctx.lineTo(bhx + 3.5, bhy + 1.5)
    ctx.stroke()
    ctx.lineWidth = 2
  } else {
    // Relaxed, hanging down — matches front arm length (~14px)
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY)
    ctx.lineTo(shoulderX - 5, shoulderY + 12)
    ctx.stroke()
  }

  // --- Front leg (in front of wheel) ---
  drawLeg(px1, py1)

  ctx.restore()

  // Grinding sparks — drawn outside transform so they stay world-aligned
  if (grinding && deathTilt === 0) {
    ctx.strokeStyle = fg
    const sparkBase = wheelCenterY + wheelR
    ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) {
      const sx = x + randomBetween(-4, 4)
      const angle = Math.PI * 1.45 + randomBetween(-0.25, 0.25)
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const px = -sin
      const py = cos
      const segments = 3 + Math.floor(randomBetween(0, 2))
      const segLen = randomBetween(4, 7)
      ctx.beginPath()
      ctx.moveTo(sx, sparkBase)
      let bx = sx
      let by = sparkBase
      for (let s = 0; s < segments; s++) {
        bx += cos * segLen
        by += sin * segLen
        const jag = randomBetween(-3, 3)
        ctx.lineTo(bx + px * jag, by + py * jag)
      }
      ctx.stroke()
    }
  }
}

// --- Stairset ---

function drawStairset(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "stairset" },
  groundY: number,
  fg: string,
  bg: string,
  _muted: string,
  _animTick = 0,
) {
  const topY = groundY - t.height
  const fillBelow = groundY + 10
  ctx.fillStyle = bg

  if (t.ascent === "stairs") {
    const stepW = t.rampW / t.ascentSteps
    let cumH = 0
    for (let i = 0; i < t.ascentSteps; i++) {
      cumH += t.ascentStepHeights[i]
      const sx = t.x + i * stepW
      const sy = groundY - cumH
      ctx.fillRect(sx, sy, stepW + 1, fillBelow - sy)
    }
  } else if (t.ascent === "curve") {
    const steps = 30
    ctx.beginPath()
    ctx.moveTo(t.x, fillBelow)
    ctx.lineTo(t.x, groundY)
    for (let i = 1; i <= steps; i++) {
      const p = i / steps
      const cx = t.x + p * t.rampW
      const cy = groundY - Math.sin(p * Math.PI * 0.5) * t.height
      ctx.lineTo(cx, cy)
    }
    ctx.lineTo(t.x + t.rampW, fillBelow)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(t.x, fillBelow)
    ctx.lineTo(t.x, groundY)
    ctx.lineTo(t.x + t.rampW, topY)
    ctx.lineTo(t.x + t.rampW, fillBelow)
    ctx.closePath()
    ctx.fill()
  }

  // Platform fill
  ctx.fillRect(t.x + t.rampW, topY, t.platW, fillBelow - topY)

  // Stair segments fill
  let offsetX = t.x + t.rampW + t.platW
  let dropSoFar = 0
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg
      const stepW = run.totalW / run.count
      const stepH = run.totalH / run.count
      for (let i = 0; i < run.count; i++) {
        const sx = offsetX + i * stepW
        const sy = topY + dropSoFar + i * stepH
        ctx.fillRect(sx, sy, stepW + 1, fillBelow - sy)
      }
      offsetX += run.totalW
      dropSoFar += run.totalH
    } else {
      const landY = topY + dropSoFar
      ctx.fillRect(offsetX, landY, seg.width, fillBelow - landY)
      offsetX += seg.width
    }
  }

  // --- Outlines ---
  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  if (t.ascent === "stairs") {
    const stepW = t.rampW / t.ascentSteps
    let cumH = 0
    ctx.beginPath()
    ctx.moveTo(t.x, groundY)
    for (let i = 0; i < t.ascentSteps; i++) {
      cumH += t.ascentStepHeights[i]
      const sy = groundY - cumH
      ctx.lineTo(t.x + i * stepW, sy)
      ctx.lineTo(t.x + (i + 1) * stepW, sy)
    }
    ctx.stroke()
  } else if (t.ascent === "curve") {
    const steps = 30
    ctx.beginPath()
    ctx.moveTo(t.x, groundY)
    for (let i = 1; i <= steps; i++) {
      const p = i / steps
      ctx.lineTo(
        t.x + p * t.rampW,
        groundY - Math.sin(p * Math.PI * 0.5) * t.height,
      )
    }
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(t.x, groundY)
    ctx.lineTo(t.x + t.rampW, topY)
    ctx.stroke()
  }

  // Platform top
  ctx.beginPath()
  ctx.moveTo(t.x + t.rampW, topY)
  ctx.lineTo(t.x + t.rampW + t.platW, topY)
  ctx.stroke()

  // Stair outlines
  offsetX = t.x + t.rampW + t.platW
  dropSoFar = 0
  ctx.beginPath()
  ctx.moveTo(offsetX, topY)
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg
      const stepW = run.totalW / run.count
      const stepH = run.totalH / run.count
      for (let i = 0; i < run.count; i++) {
        const sy = topY + dropSoFar + i * stepH
        ctx.lineTo(offsetX + i * stepW, sy + stepH)
        ctx.lineTo(offsetX + (i + 1) * stepW, sy + stepH)
      }
      offsetX += run.totalW
      dropSoFar += run.totalH
    } else {
      const landY = topY + dropSoFar
      ctx.lineTo(offsetX, landY)
      ctx.lineTo(offsetX + seg.width, landY)
      offsetX += seg.width
    }
  }
  ctx.stroke()

  // Ramp cones
  if (t.rampSpikes.length > 0) {
    for (const spike of t.rampSpikes) {
      const off = spike.offset + spike.width / 2
      const p = off / t.rampW
      const baseX = t.x + off
      let baseY: number
      let coneAngle: number
      if (t.ascent === "curve") {
        baseY = groundY - Math.sin(p * Math.PI * 0.5) * t.height
        const dydx =
          (Math.cos(p * Math.PI * 0.5) * Math.PI * 0.5 * t.height) / t.rampW
        coneAngle = -Math.atan(dydx)
      } else {
        baseY = groundY - p * t.height
        coneAngle = -Math.atan2(t.height, t.rampW)
      }
      drawCone(ctx, baseX, baseY, CONE_H, fg, coneAngle)
    }
  }

  // --- Handrail ---
  ctx.strokeStyle = fg
  ctx.lineWidth = 2
  const railStartX = t.x + t.rampW + t.platW
  const curveDown = 6
  const curveIn = 12
  const railStartY = topY - RAIL_OFFSET

  ctx.beginPath()
  ctx.moveTo(railStartX - curveIn, railStartY + curveDown)
  ctx.quadraticCurveTo(railStartX - curveIn, railStartY, railStartX, railStartY)

  offsetX = 0
  dropSoFar = 0
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      offsetX += seg.run.totalW
      dropSoFar += seg.run.totalH
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET)
    } else {
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET)
      offsetX += seg.width
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET)
    }
  }

  const railEndX = railStartX + offsetX
  const railEndY = topY + dropSoFar - RAIL_OFFSET
  ctx.quadraticCurveTo(
    railEndX + curveIn,
    railEndY,
    railEndX + curveIn,
    railEndY + curveDown,
  )
  ctx.stroke()

  // Rail supports
  ctx.lineWidth = 2
  ctx.strokeStyle = fg
  offsetX = 0
  dropSoFar = 0

  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const startRailY = topY + dropSoFar - RAIL_OFFSET
      const startSurfY = Math.min(topY + dropSoFar, groundY)
      ctx.beginPath()
      ctx.moveTo(railStartX + offsetX, startRailY)
      ctx.lineTo(railStartX + offsetX, startSurfY)
      ctx.stroke()

      offsetX += seg.run.totalW
      dropSoFar += seg.run.totalH

      const endRailY = topY + dropSoFar - RAIL_OFFSET
      const endSurfY = Math.min(topY + dropSoFar, groundY)
      ctx.beginPath()
      ctx.moveTo(railStartX + offsetX, endRailY)
      ctx.lineTo(railStartX + offsetX, endSurfY)
      ctx.stroke()
    } else {
      offsetX += seg.width
    }
  }
}

// --- Gap ---

function drawGap(
  _ctx: CanvasRenderingContext2D,
  _t: TerrainPiece & { type: "gap" },
  _groundY: number,
  _bg: string,
) {
  // Ground line is already skipped by drawGround — nothing to draw
}

// --- Rail Gap ---

function drawRailGap(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "railGap" },
  groundY: number,
  fg: string,
  _bg: string,
) {
  const bob = Math.sin(t.bobPhase) * RAIL_GAP_BOB_AMPLITUDE
  const baseRailY = groundY - t.railHeight - RAIL_OFFSET + bob
  const sagDepth = t.width * 0.09

  ctx.strokeStyle = fg
  ctx.lineWidth = 2
  ctx.beginPath()

  const steps = 24
  for (let i = 0; i <= steps; i++) {
    const p = i / steps
    const x = t.x + p * t.width
    const sag = 4 * p * (1 - p) * sagDepth
    if (i === 0) ctx.moveTo(x, baseRailY + sag)
    else ctx.lineTo(x, baseRailY + sag)
  }
  ctx.stroke()
}

// --- Standalone Rail ---

function drawStandaloneRail(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "rail" },
  groundY: number,
  fg: string,
  bg: string,
) {
  const topY = groundY - t.railHeight
  const fillBelow = groundY + 10
  const gapStartX = t.x + t.rampW + t.platW

  // Background fills
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(t.x, fillBelow)
  ctx.lineTo(t.x, groundY)
  ctx.lineTo(t.x + t.rampW, topY)
  ctx.lineTo(t.x + t.rampW, fillBelow)
  ctx.closePath()
  ctx.fill()

  ctx.fillRect(t.x + t.rampW, topY, t.platW, fillBelow - topY)

  // Outlines
  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(t.x, groundY)
  ctx.lineTo(t.x + t.rampW, topY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(t.x + t.rampW, topY)
  ctx.lineTo(gapStartX, topY)
  ctx.stroke()

  // Handrail
  const curveDown = 6
  const curveIn = 12
  const bob = Math.sin(t.bobPhase) * RAIL_GAP_BOB_AMPLITUDE
  const railTopY = topY + bob
  const railStartY = railTopY - RAIL_OFFSET

  ctx.strokeStyle = fg
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(gapStartX - curveIn, railStartY + curveDown)
  ctx.quadraticCurveTo(gapStartX - curveIn, railStartY, gapStartX, railStartY)

  let offsetX = 0
  let dropSoFar = 0
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      offsetX += seg.run.totalW
      dropSoFar += seg.run.totalH
      ctx.lineTo(gapStartX + offsetX, railTopY + dropSoFar - RAIL_OFFSET)
    } else {
      ctx.lineTo(gapStartX + offsetX, railTopY + dropSoFar - RAIL_OFFSET)
      offsetX += seg.width
      ctx.lineTo(gapStartX + offsetX, railTopY + dropSoFar - RAIL_OFFSET)
    }
  }

  const railEndX = gapStartX + offsetX
  const railEndY = railTopY + dropSoFar - RAIL_OFFSET
  ctx.quadraticCurveTo(
    railEndX + curveIn,
    railEndY,
    railEndX + curveIn,
    railEndY + curveDown,
  )
  ctx.stroke()
}

// --- Cone ---

function drawCone(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  h: number,
  fg: string,
  angle = 0,
) {
  const baseW = h * 0.5
  const tipW = h * 0.1

  ctx.save()
  if (angle !== 0) {
    ctx.translate(cx, baseY)
    ctx.rotate(angle)
    ctx.translate(-cx, -baseY)
  }

  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(cx - baseW / 2, baseY)
  ctx.lineTo(cx - tipW / 2, baseY - h)
  ctx.lineTo(cx + tipW / 2, baseY - h)
  ctx.lineTo(cx + baseW / 2, baseY)
  ctx.closePath()
  ctx.stroke()

  const stripes = [0.35, 0.6]
  for (const t of stripes) {
    const y = baseY - h * t
    const wAt = baseW / 2 - (baseW / 2 - tipW / 2) * t
    ctx.beginPath()
    ctx.moveTo(cx - wAt, y)
    ctx.lineTo(cx + wAt, y)
    ctx.stroke()
  }

  const baseH = h * 0.08
  const basePad = h * 0.15
  ctx.strokeRect(
    cx - baseW / 2 - basePad,
    baseY - baseH,
    baseW + basePad * 2,
    baseH,
  )

  ctx.restore()
}

function drawCones(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "spikes" },
  groundY: number,
  fg: string,
) {
  const cx = t.x + t.width / 2
  drawCone(ctx, cx, groundY, t.height, fg)
}

// --- Bump ---

function drawBump(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "bump" },
  groundY: number,
  fg: string,
  bg: string,
) {
  const steps = 60
  const stepW = t.width / steps

  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(t.x, groundY + 10)
  for (let i = 0; i <= steps; i++) {
    const localX = i * stepW
    const s = Math.sin((Math.PI * localX * t.count) / t.width)
    const y = groundY - t.height * s * s
    ctx.lineTo(t.x + localX, y)
  }
  ctx.lineTo(t.x + t.width, groundY + 10)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = fg
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const localX = i * stepW
    const s = Math.sin((Math.PI * localX * t.count) / t.width)
    const y = groundY - t.height * s * s
    if (i === 0) ctx.moveTo(t.x + localX, y)
    else ctx.lineTo(t.x + localX, y)
  }
  ctx.stroke()
}

// --- Trampoline ---

function drawTrampoline(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "trampoline" },
  groundY: number,
  fg: string,
) {
  const frameH = 12
  const legInset = 6
  const footSpread = 8
  const fullSpringH = 4
  const c = t.compression

  const springH = fullSpringH * (1 - c * 0.8)
  const currentFrameH = frameH * (1 - c * 0.4)
  const bedY = groundY - currentFrameH

  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  // Left leg
  ctx.beginPath()
  ctx.moveTo(t.x + legInset - footSpread, groundY)
  ctx.lineTo(t.x + legInset, bedY)
  ctx.stroke()

  // Right leg
  ctx.beginPath()
  ctx.moveTo(t.x + t.width - legInset + footSpread, groundY)
  ctx.lineTo(t.x + t.width - legInset, bedY)
  ctx.stroke()

  // Frame
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(t.x + legInset, bedY)
  ctx.lineTo(t.x + t.width - legInset, bedY)
  ctx.stroke()

  // Springs
  const springCount = 5
  const innerLeft = t.x + legInset + 4
  const innerRight = t.x + t.width - legInset - 4
  const springSpacing = (innerRight - innerLeft) / (springCount - 1)
  const zigW = 2 + c * 2
  ctx.lineWidth = 1
  for (let i = 0; i < springCount; i++) {
    const sx = innerLeft + i * springSpacing
    ctx.beginPath()
    ctx.moveTo(sx, bedY)
    ctx.lineTo(sx - zigW, bedY - springH * 0.33)
    ctx.lineTo(sx + zigW, bedY - springH * 0.66)
    ctx.lineTo(sx, bedY - springH)
    ctx.stroke()
  }

  // Bounce bed
  const bedCurve = TRAMPOLINE_H * (1 - c * 0.7)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(t.x + legInset, bedY - springH)
  ctx.quadraticCurveTo(
    t.x + t.width / 2,
    bedY - springH - bedCurve,
    t.x + t.width - legInset,
    bedY - springH,
  )
  ctx.stroke()
}

// --- Scooter Kid ---

function drawScooterKid(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "scooterKid" },
  surfaceY: number,
  fg: string,
  tilt = 0,
) {
  const cx = t.x + t.width / 2
  const footY = surfaceY
  const wheelR = 3
  const deckY = footY - wheelR - 2

  ctx.save()
  if (tilt !== 0) {
    ctx.translate(cx, footY)
    ctx.rotate(tilt)
    ctx.translate(-cx, -footY)
  }

  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  // Wheels
  ctx.beginPath()
  ctx.arc(cx - 8, footY - wheelR, wheelR, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx + 8, footY - wheelR, wheelR, 0, Math.PI * 2)
  ctx.stroke()

  // Deck
  ctx.beginPath()
  ctx.moveTo(cx - 10, deckY)
  ctx.lineTo(cx + 10, deckY)
  ctx.stroke()

  // Handlebar post
  ctx.beginPath()
  ctx.moveTo(cx - 8, deckY)
  ctx.lineTo(cx - 6, deckY - 16)
  ctx.stroke()

  // Handlebar
  ctx.beginPath()
  ctx.moveTo(cx - 10, deckY - 16)
  ctx.lineTo(cx - 2, deckY - 16)
  ctx.stroke()

  // Kid body
  const kidFootY = deckY
  const hipY = kidFootY - 8
  const shoulderY = hipY - 8
  const headY = shoulderY - 5

  // Legs
  ctx.beginPath()
  ctx.moveTo(cx + 2, kidFootY)
  ctx.lineTo(cx, hipY)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 2, kidFootY)
  ctx.lineTo(cx, hipY)
  ctx.stroke()

  // Torso
  ctx.beginPath()
  ctx.moveTo(cx, hipY)
  ctx.lineTo(cx - 2, shoulderY)
  ctx.stroke()

  // Arms
  ctx.beginPath()
  ctx.moveTo(cx - 2, shoulderY)
  ctx.lineTo(cx - 6, deckY - 14)
  ctx.stroke()

  // Head
  ctx.beginPath()
  ctx.arc(cx - 3, headY, 4, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

// --- Cloud ---

function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  const { x, y, width: w } = cloud
  const h = w * 0.4
  ctx.beginPath()
  ctx.ellipse(x + w * 0.3, y, w * 0.3, h * 0.5, 0, Math.PI, 0)
  ctx.ellipse(x + w * 0.65, y, w * 0.25, h * 0.35, 0, Math.PI, 0)
  ctx.stroke()
}

// --- UFO ---

function drawUfo(ctx: CanvasRenderingContext2D, ufo: Ufo, fg: string) {
  const { x, y } = ufo
  const bob = Math.sin(ufo.bobPhase) * 3
  const cy = y + bob

  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(x, cy - 2, 8, Math.PI, 0)
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(x, cy, 18, 5, 0, 0, Math.PI * 2)
  ctx.stroke()

  ctx.globalAlpha = 0.3
  ctx.beginPath()
  ctx.moveTo(x - 6, cy + 5)
  ctx.lineTo(x - 10, cy + 20)
  ctx.moveTo(x + 6, cy + 5)
  ctx.lineTo(x + 10, cy + 20)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// --- Lightning ---

function drawLightning(
  ctx: CanvasRenderingContext2D,
  bolt: LightningBolt,
  fg: string,
) {
  if (bolt.points.length < 2) return
  const opacity = bolt.life / bolt.maxLife

  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = fg
  ctx.strokeStyle = fg

  const topW = 5
  const botW = 1
  ctx.beginPath()
  for (let i = 0; i < bolt.points.length; i++) {
    const t = i / (bolt.points.length - 1)
    const halfW = topW + (botW - topW) * t
    const p = bolt.points[i]
    if (i === 0) ctx.moveTo(p.x - halfW, p.y)
    else ctx.lineTo(p.x - halfW, p.y)
  }
  for (let i = bolt.points.length - 1; i >= 0; i--) {
    const t = i / (bolt.points.length - 1)
    const halfW = topW + (botW - topW) * t
    const p = bolt.points[i]
    ctx.lineTo(p.x + halfW, p.y)
  }
  ctx.closePath()
  ctx.fill()
  ctx.lineWidth = 1
  ctx.lineJoin = "miter"
  ctx.stroke()

  if (bolt.branch) {
    ctx.lineWidth = 2
    ctx.lineJoin = "miter"
    ctx.beginPath()
    ctx.moveTo(bolt.branch[0].x, bolt.branch[0].y)
    for (let i = 1; i < bolt.branch.length; i++) {
      ctx.lineTo(bolt.branch[i].x, bolt.branch[i].y)
    }
    ctx.stroke()
  }

  ctx.restore()
}

// --- Ground ---

function drawGround(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  width: number,
  _offset: number,
  fg: string,
  _muted: string,
  terrain: TerrainPiece[],
) {
  const gaps: { start: number; end: number }[] = []
  for (const t of terrain) {
    switch (t.type) {
      case "gap": {
        gaps.push({ start: t.x, end: t.x + t.width })
        break
      }
      case "railGap": {
        gaps.push({ start: t.x, end: t.x + t.width })
        break
      }
      case "rail": {
        gaps.push({ start: t.x + t.rampW + t.platW, end: t.x + t.width })
        break
      }
      // No default
    }
  }
  gaps.sort((a, b) => a.start - b.start)

  ctx.strokeStyle = fg
  ctx.lineWidth = 2

  let x = 0
  for (const gap of gaps) {
    if (gap.start > x) {
      ctx.beginPath()
      ctx.moveTo(x, groundY)
      ctx.lineTo(gap.start, groundY)
      ctx.stroke()
    }
    x = Math.max(x, gap.end)
  }
  if (x < width) {
    ctx.beginPath()
    ctx.moveTo(x, groundY)
    ctx.lineTo(width, groundY)
    ctx.stroke()
  }
}

// --- Particles ---

function drawDustParticles(
  ctx: CanvasRenderingContext2D,
  particles: DustParticle[],
  fg: string,
) {
  for (const p of particles) {
    const opacity = p.life / DUST_LIFE
    ctx.save()
    ctx.globalAlpha = opacity * 0.6
    ctx.strokeStyle = fg
    ctx.lineWidth = 1
    const len = 3 + (1 - opacity) * 4
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x + p.vx * len * 0.5, p.y + p.vy * len * 0.5)
    ctx.stroke()
    ctx.restore()
  }
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  lines: SpeedLine[],
  muted: string,
) {
  ctx.strokeStyle = muted
  ctx.lineWidth = 1
  for (const line of lines) {
    ctx.beginPath()
    ctx.moveTo(line.x, line.y)
    ctx.lineTo(line.x + line.length, line.y)
    ctx.stroke()
  }
}

// --- Letter Collectible ---

function drawCollectibleLetter(
  ctx: CanvasRenderingContext2D,
  l: CollectibleLetter,
  fg: string,
  isNext: boolean,
) {
  const bobY = l.y + Math.sin(l.bobPhase) * LETTER_BOB_AMPLITUDE

  ctx.save()
  if (!isNext) ctx.globalAlpha = 0.3

  ctx.fillStyle = fg
  ctx.font = `bold ${LETTER_SIZE}px "Geist Mono Variable", monospace`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(l.letter, l.x, bobY)

  ctx.restore()
}

// --- HUD ---

function drawLetterHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  collectedLetters: boolean[],
  fg: string,
  muted: string,
) {
  const letterSpacing = 28
  const totalWidth = (LETTER_WORD.length - 1) * letterSpacing
  const startX = (w - totalWidth) / 2
  const y = 24

  for (const [i, element] of [...LETTER_WORD].entries()) {
    const x = startX + i * letterSpacing
    ctx.font = "14px 'Geist Mono Variable', monospace"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = collectedLetters[i] ? fg : muted
    ctx.fillText(element, x, y)
  }
}

// ============================================================
// Frame Renderer — orchestrates all drawing
// ============================================================

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  gs: GameState,
  w: number,
  h: number,
  baseGroundY: number,
  fg: string,
  bg: string,
  muted: string,
) {
  // Speed lines (behind everything)
  drawSpeedLines(ctx, gs.speedLines, muted)

  for (const cloud of gs.clouds) {
    drawCloud(ctx, cloud, muted)
  }

  for (const ufo of gs.ufos) {
    drawUfo(ctx, ufo, fg)
  }

  for (const bolt of gs.lightning) {
    drawLightning(ctx, bolt, fg)
  }

  drawGround(ctx, baseGroundY, w, gs.groundOffset, fg, muted, gs.terrain)

  // Terrain pieces
  for (const t of gs.terrain) {
    switch (t.type) {
      case "stairset": {
        drawStairset(ctx, t, baseGroundY, fg, bg, muted, gs.groundOffset)
        break
      }
      case "gap": {
        drawGap(ctx, t, baseGroundY, bg)
        break
      }
      case "railGap": {
        drawRailGap(ctx, t, baseGroundY, fg, bg)
        break
      }
      case "rail": {
        drawStandaloneRail(ctx, t, baseGroundY, fg, bg)
        break
      }
      case "bump": {
        drawBump(ctx, t, baseGroundY, fg, bg)
        break
      }
      case "trampoline": {
        drawTrampoline(ctx, t, baseGroundY, fg)
        break
      }
      case "scooterKid": {
        const kidSurfaceY = getSurfaceY(
          t.x + t.width / 2,
          baseGroundY,
          gs.terrain,
        )
        let kidTilt = 0
        if (t.grinding) {
          const kidCx = t.x + t.width / 2
          for (const other of gs.terrain) {
            if (
              other.type === "railGap" &&
              kidCx >= other.x &&
              kidCx <= other.x + other.width
            ) {
              const p = (kidCx - other.x) / other.width
              const slope = (other.width * 0.09 * 4 * (1 - 2 * p)) / other.width
              kidTilt = Math.atan(slope)
              break
            }
          }
        }
        drawScooterKid(ctx, t, kidSurfaceY + t.offsetY, fg, kidTilt)
        break
      }
      default: {
        drawCones(ctx, t, baseGroundY, fg)
      }
    }
  }

  // Collectible letters
  const nextLetterHudIdx = gs.collectedLetters.indexOf(false)
  for (const l of gs.letters) {
    drawCollectibleLetter(ctx, l, fg, l.index === nextLetterHudIdx)
  }

  // Dust particles
  drawDustParticles(ctx, gs.dustParticles, fg)

  // Player
  const playerDrawY = gs.status === "idle" ? baseGroundY - WHEEL_R : gs.playerY
  const lean = gs.status === "idle" ? 3 : computeLean(gs)
  const deathTilt =
    gs.status === "dead" && !gs.fallingInGap && !gs.hitWall
      ? Math.min(gs.deathTimer / DEATH_ANIM_FRAMES, 1) * (Math.PI / 3)
      : 0
  drawUnicyclist(
    ctx,
    PLAYER_X,
    playerDrawY,
    gs.wheelAngle,
    gs.pedalAngle,
    fg,
    gs.flatTire,
    gs.isGrinding,
    lean,
    deathTilt,
    gs.seatSpin,
    gs.backflipAngle,
  )

  // Score (pulses 3× on bonus collect, then shrinks back)
  const scoreScale =
    gs.bonusTimer > 0
      ? 1 + 2 * (gs.bonusTimer / LETTER_BONUS_DISPLAY_FRAMES) ** 3
      : 1
  const scoreSize = Math.round(14 * scoreScale)
  ctx.fillStyle = fg
  ctx.font = `${scoreSize}px 'Geist Mono Variable', monospace`
  ctx.textAlign = "right"
  ctx.textBaseline = "alphabetic"
  ctx.fillText(
    String(Math.floor(gs.score / 10)).padStart(5, "0"),
    w - 16,
    10 + scoreSize,
  )

  if (gs.highScore > 0) {
    ctx.fillStyle = muted
    ctx.font = "12px 'Geist Mono Variable', monospace"
    ctx.textAlign = "right"
    ctx.textBaseline = "alphabetic"
    ctx.fillText(
      `hi ${String(gs.highScore).padStart(5, "0")}`,
      w - 16,
      10 + scoreSize + 16,
    )
  }

  // Letter collection HUD
  drawLetterHUD(ctx, w, gs.collectedLetters, fg, muted)

  // Idle prompt
  if (gs.status === "idle") {
    ctx.fillStyle = fg
    ctx.font = "14px 'Geist Mono Variable', monospace"
    ctx.textAlign = "center"
    ctx.fillText("press space or tap to ride", w / 2, h / 2 + 20)
  }

  // Death overlay
  if (gs.status === "dead" && gs.deathTimer >= DEATH_ANIM_FRAMES) {
    ctx.fillStyle = fg
    ctx.textAlign = "center"

    ctx.font = "16px 'Geist Mono Variable', monospace"
    ctx.fillText("game over", w / 2, h / 2 - 50)

    const freezeThird = DEATH_FREEZE_FRAMES / 3
    if (gs.deathFreezeTimer < DEATH_FREEZE_FRAMES) {
      const countdown = 3 - Math.floor(gs.deathFreezeTimer / freezeThird)
      ctx.font = "12px 'Geist Mono Variable', monospace"
      ctx.fillText(String(countdown), w / 2, h / 2 - 20)
    } else {
      ctx.font = "12px 'Geist Mono Variable', monospace"
      ctx.fillText("press space or tap to retry", w / 2, h / 2 - 20)
    }
  }
}
