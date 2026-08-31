import {
  MAX_RAIL_HEIGHT,
  MAX_STEP_H,
  MELLOW_RAMP_SLOPE,
  MIN_STEP_PLAT_W,
  RAIL_GAP_BOB_AMPLITUDE,
  RAIL_OFFSET,
  RAMP_SLOPE,
  SCOOTER_KID_H,
  SCOOTER_KID_W,
  STEP_H,
  TRAMPOLINE_W,
} from "./constants"
import { randomBetween, randomInt } from "./helpers"
import {
  type RampSpike,
  type StairRun,
  type StairSegment,
  type TerrainPiece,
} from "./types"

// --- Stair Run ---

function createStairRun(
  count: number,
  slope: "steep" | "normal" | "mellow" = "normal",
): StairRun {
  let stepW: number
  if (slope === "steep") {
    stepW = randomBetween(12, 18)
  } else if (slope === "mellow") {
    stepW = randomBetween(36, 56)
  } else {
    stepW = randomBetween(20, 32)
  }
  return { count, totalW: count * stepW, totalH: count * STEP_H }
}

// --- Hazard Check ---

function lastHadHazard(prev: TerrainPiece | undefined): boolean {
  if (!prev) return false
  if (prev.type === "spikes") return true
  if (prev.type === "gap") return true
  if (prev.type === "railGap") return true
  if (prev.type === "rail") return true
  if (prev.type === "scooterKid") return true
  if (prev.type === "stairset" && prev.rampSpikes.length > 0) return true
  return false
}

// --- Difficulty Scaling ---

export function getDifficulty(score: number) {
  const displayScore = Math.floor(score / 10)
  const t = Math.min(displayScore / 3000, 1)
  return {
    stairsetMax: 0.65 - t * 0.15,
    rampSpikeChance: 0.25 + t * 0.2,
    minStairs: 5 + Math.floor(t * 5),
    maxStairs: 40 + Math.floor(t * 20),
    gapMultiplier: 1 - t * 0.3,
  }
}

// --- Landing Segments Builder ---

function buildSegmentsWithLandings(
  totalCount: number,
  slope: "steep" | "normal" | "mellow",
): { segments: StairSegment[]; stairTotalW: number; totalHeight: number } {
  const segments: StairSegment[] = []
  let stairTotalW = 0
  let totalHeight = 0

  const stairHeight = totalCount * STEP_H
  let maxLandings = 0
  if (stairHeight >= 56) maxLandings = 3
  else if (stairHeight >= 40) maxLandings = 2
  else if (stairHeight >= 24) maxLandings = 1

  const numLandings =
    totalCount >= 4 && maxLandings > 0 ? randomInt(0, maxLandings) : 0

  if (numLandings > 0) {
    const splits: number[] = []
    let remaining = totalCount
    for (let i = 0; i < numLandings; i++) {
      const minSteps = Math.max(2, Math.floor(remaining * 0.15))
      const maxSteps = Math.floor(remaining * (0.7 / (numLandings - i)))
      const count = randomInt(minSteps, Math.max(minSteps, maxSteps))
      splits.push(count)
      remaining -= count
    }
    splits.push(remaining)

    for (let i = 0; i < splits.length; i++) {
      const run = createStairRun(splits[i], slope)
      segments.push({ kind: "stairs", run })
      stairTotalW += run.totalW
      totalHeight += run.totalH
      if (i < splits.length - 1) {
        const landingW =
          slope === "mellow" ? randomBetween(80, 150) : randomBetween(50, 100)
        segments.push({ kind: "landing", width: landingW })
        stairTotalW += landingW
      }
    }
  } else {
    const run = createStairRun(totalCount, slope)
    segments.push({ kind: "stairs", run })
    stairTotalW = run.totalW
    totalHeight = run.totalH
  }

  return { segments, stairTotalW, totalHeight }
}

// --- Pick random slope ---

function pickSlope(): "steep" | "normal" | "mellow" {
  const roll = Math.random()
  return roll < 0.3 ? "steep" : roll < 0.65 ? "normal" : "mellow"
}

// --- Pick random stair count based on difficulty ---

function pickStairCount(diff: ReturnType<typeof getDifficulty>): number {
  const maxCount = Math.floor(MAX_RAIL_HEIGHT / STEP_H)
  const tierRoll = Math.random()
  if (tierRoll < 0.2) return randomInt(diff.minStairs, Math.min(8, maxCount))
  if (tierRoll < 0.45)
    return randomInt(
      Math.min(9, maxCount),
      Math.min(Math.max(15, diff.minStairs), maxCount),
    )
  return randomInt(Math.min(16, maxCount), maxCount)
}

// --- Stairset Terrain ---

function createStairsetTerrain(
  x: number,
  prev: TerrainPiece | undefined,
  diff: ReturnType<typeof getDifficulty>,
): TerrainPiece {
  const platW = randomBetween(40, 150)

  // 35% stairs, 35% ramp, 30% curve
  const ascentRoll = Math.random()
  const ascent: "ramp" | "stairs" | "curve" =
    ascentRoll < 0.35 ? "stairs" : ascentRoll < 0.7 ? "ramp" : "curve"

  if (ascent === "stairs") {
    return createStairAscentTerrain(x, platW)
  }

  // --- Ramp / Curve ascent ---
  const totalCount = pickStairCount(diff)
  const slope = pickSlope()
  const { segments, stairTotalW, totalHeight } = buildSegmentsWithLandings(
    totalCount,
    slope,
  )

  // Curves use a wider ramp for a smoother rise
  const baseSlope = slope === "mellow" ? MELLOW_RAMP_SLOPE : RAMP_SLOPE
  const rampW = totalHeight * (ascent === "curve" ? baseSlope * 1.5 : baseSlope)

  const rampSpikes: RampSpike[] = []
  if (
    rampW > 60 &&
    !lastHadHazard(prev) &&
    Math.random() < diff.rampSpikeChance
  ) {
    const spikeW = randomBetween(24, 48)
    const minOffset = rampW * 0.2
    const maxOffset = rampW * 0.8 - spikeW
    if (maxOffset > minOffset) {
      rampSpikes.push({
        offset: randomBetween(minOffset, maxOffset),
        width: spikeW,
      })
    }
  }

  return {
    x,
    width: rampW + platW + stairTotalW,
    height: totalHeight,
    type: "stairset",
    rampW,
    platW,
    segments,
    stairTotalW,
    rampSpikes,
    ascent,
    ascentSteps: 0,
    ascentStepHeights: [],
  }
}

function createStairAscentTerrain(x: number, platW: number): TerrainPiece {
  const ascentSteps = randomInt(2, 5)
  const stepW = randomBetween(MIN_STEP_PLAT_W, MIN_STEP_PLAT_W + 80)
  const rampW = ascentSteps * stepW

  // Each step gets a random height between 30px and MAX_STEP_H
  const ascentStepHeights: number[] = []
  let totalHeight = 0
  for (let i = 0; i < ascentSteps; i++) {
    const h = Math.round(randomBetween(30, MAX_STEP_H))
    ascentStepHeights.push(h)
    totalHeight += h
  }

  // Cap height then snap to exact multiple of STEP_H so descending stairs match
  totalHeight = Math.min(totalHeight, MAX_RAIL_HEIGHT)
  const totalCount = Math.max(1, Math.round(totalHeight / STEP_H))
  totalHeight = totalCount * STEP_H

  // Redistribute the snapped height back across ascending steps proportionally
  const rawSum = ascentStepHeights.reduce((a, b) => a + b, 0)
  let assigned = 0
  for (let i = 0; i < ascentSteps - 1; i++) {
    ascentStepHeights[i] = Math.round(
      (ascentStepHeights[i] / rawSum) * totalHeight,
    )
    assigned += ascentStepHeights[i]
  }
  ascentStepHeights[ascentSteps - 1] = totalHeight - assigned

  // Generate descent segments with landings
  const slope = pickSlope()
  const { segments, stairTotalW } = buildDescentSegments(totalCount, slope)

  return {
    x,
    width: rampW + platW + stairTotalW,
    height: totalHeight,
    type: "stairset",
    rampW,
    platW,
    segments,
    stairTotalW,
    rampSpikes: [],
    ascent: "stairs",
    ascentSteps,
    ascentStepHeights,
  }
}

function buildDescentSegments(
  totalCount: number,
  slope: "steep" | "normal" | "mellow",
): { segments: StairSegment[]; stairTotalW: number } {
  const segments: StairSegment[] = []
  let stairTotalW = 0

  const stairHeight = totalCount * STEP_H
  let maxLandings = 0
  if (stairHeight >= 56) maxLandings = 3
  else if (stairHeight >= 40) maxLandings = 2
  else if (stairHeight >= 24) maxLandings = 1

  const numLandings =
    totalCount >= 4 && maxLandings > 0 ? randomInt(0, maxLandings) : 0

  if (numLandings > 0) {
    const splits: number[] = []
    let remaining = totalCount
    for (let i = 0; i < numLandings; i++) {
      const minSteps = Math.max(2, Math.floor(remaining * 0.15))
      const maxSteps = Math.floor(remaining * (0.7 / (numLandings - i)))
      const count = randomInt(minSteps, Math.max(minSteps, maxSteps))
      splits.push(count)
      remaining -= count
    }
    splits.push(remaining)

    for (let i = 0; i < splits.length; i++) {
      const run = createStairRun(splits[i], slope)
      segments.push({ kind: "stairs", run })
      stairTotalW += run.totalW
      if (i < splits.length - 1) {
        const landingW = randomBetween(50, 100)
        segments.push({ kind: "landing", width: landingW })
        stairTotalW += landingW
      }
    }
  } else {
    const run = createStairRun(totalCount, slope)
    segments.push({ kind: "stairs", run })
    stairTotalW = run.totalW
  }

  return { segments, stairTotalW }
}

// --- Terrain Factory ---

export function createTerrain(
  x: number,
  prev: TerrainPiece | undefined,
  score: number,
): TerrainPiece {
  const diff = getDifficulty(score)

  // After hazard, always generate a safe terrain
  if (lastHadHazard(prev)) {
    if (Math.random() < 0.4) {
      const width = randomBetween(400, 600)
      const amplitude = randomBetween(35, 60)
      return { x, width, height: amplitude, type: "bump", count: 1 }
    }
    return createStairsetTerrain(x, prev, diff)
  }

  const roll = Math.random()

  // Scooter kid: ~15%
  if (roll < 0.15) {
    return {
      x,
      width: SCOOTER_KID_W,
      height: SCOOTER_KID_H,
      type: "scooterKid",
      airborne: false,
      grinding: false,
      velY: 0,
      offsetY: 0,
      lastSurfY: 0,
    }
  }

  // Trampoline: ~10%
  if (roll < 0.25) {
    return {
      x,
      width: TRAMPOLINE_W,
      height: 0,
      type: "trampoline",
      compression: 0,
    }
  }

  // Bump: ~10%
  if (roll < 0.35) {
    const width = randomBetween(400, 600)
    const amplitude = randomBetween(35, 60)
    return { x, width, height: amplitude, type: "bump", count: 1 }
  }

  // Rail gap: ~15%
  if (roll < 0.5) {
    const tierRoll = Math.random()
    let gapWidth: number
    if (tierRoll < 0.2) {
      gapWidth = randomBetween(280, 500) // short
    } else if (tierRoll < 0.55) {
      gapWidth = randomBetween(500, 800) // medium
    } else if (tierRoll < 0.82) {
      gapWidth = randomBetween(800, 1080) // long
    } else {
      gapWidth = randomBetween(1080, 1380) // epic
    }
    const railHeight = randomBetween(30, 50)
    return {
      x,
      width: gapWidth,
      height: 0,
      type: "railGap",
      railHeight,
      bobPhase: randomBetween(0, Math.PI * 2),
    }
  }

  // Standalone rail: ~15%
  if (roll < 0.65) {
    return createStandaloneRailTerrain(x)
  }

  // Stairset: ~15%
  if (roll < 0.8) {
    return createStairsetTerrain(x, prev, diff)
  }

  // Gap: ~12%
  if (roll < 0.92) {
    const gapWidth = randomBetween(60, 240)
    return { x, width: gapWidth, height: 0, type: "gap" }
  }

  // Cone: ~8%
  return { x, width: 20, height: 24, type: "spikes" }
}

// --- Floating Rail Segments (kink up, kink down, or flat) ---

function buildFloatingRailSegments(
  slope: "steep" | "normal" | "mellow",
  maxNetDrop: number,
): {
  segments: StairSegment[]
  totalW: number
} {
  const numSections = randomInt(2, 5)
  // At least 50% of sections must be kinks (up or down)
  const minKinks = Math.ceil(numSections / 2)

  const types: Array<"kink-down" | "kink-up" | "flat"> = []
  for (let i = 0; i < numSections; i++) {
    const kinksSoFar = types.filter((t) => t !== "flat").length
    const remaining = numSections - i
    const kinksNeeded = minKinks - kinksSoFar
    if (kinksNeeded >= remaining) {
      types.push(Math.random() < 0.5 ? "kink-down" : "kink-up")
    } else {
      const roll = Math.random()
      if (roll < 0.3) types.push("flat")
      else if (roll < 0.65) types.push("kink-down")
      else types.push("kink-up")
    }
  }

  // Shuffle so kinks aren't always front-loaded
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = types[i]
    types[i] = types[j]
    types[j] = tmp
  }

  const segments: StairSegment[] = []
  let totalW = 0
  // Track net vertical displacement: positive = lower, negative = higher than start
  let heightAccum = 0
  const maxRise = 60 // cap on how high above the starting point the rail can go

  for (const type of types) {
    if (type === "flat") {
      const w =
        slope === "mellow" ? randomBetween(150, 280) : randomBetween(100, 200)
      segments.push({ kind: "landing", width: w })
      totalW += w
    } else if (type === "kink-down") {
      const remaining = maxNetDrop - heightAccum
      if (remaining < STEP_H) {
        // Drop budget exhausted — use flat instead
        const w =
          slope === "mellow" ? randomBetween(150, 280) : randomBetween(100, 200)
        segments.push({ kind: "landing", width: w })
        totalW += w
      } else {
        const count = randomInt(5, 12)
        const run = createStairRun(count, slope)
        const clampedH =
          Math.floor(Math.min(run.totalH, remaining) / STEP_H) * STEP_H
        const clampedCount = Math.max(1, clampedH / STEP_H)
        const clampedRun: StairRun = {
          count: clampedCount,
          totalW: run.totalW * (clampedCount / count),
          totalH: clampedH,
        }
        segments.push({ kind: "stairs", run: clampedRun })
        totalW += clampedRun.totalW
        heightAccum += clampedRun.totalH
      }
    } else {
      // kink-up: negative totalH makes the rail rise
      const count = randomInt(5, 12)
      const run = createStairRun(count, slope)
      const headroom = maxRise + heightAccum // how much more we can rise
      if (headroom < STEP_H) {
        // Already near the height cap — use flat instead
        const w =
          slope === "mellow" ? randomBetween(150, 280) : randomBetween(100, 200)
        segments.push({ kind: "landing", width: w })
        totalW += w
      } else {
        const rise =
          Math.round(Math.min(run.totalH, headroom) / STEP_H) * STEP_H
        const snappedRise = Math.max(STEP_H, rise)
        const upRun: StairRun = {
          count: Math.round(snappedRise / STEP_H),
          totalW: run.totalW,
          totalH: -snappedRise,
        }
        segments.push({ kind: "stairs", run: upRun })
        totalW += run.totalW
        heightAccum -= snappedRise
      }
    }
  }

  return { segments, totalW }
}

function createStandaloneRailTerrain(x: number): TerrainPiece {
  const railSlope = pickSlope()
  const railHeight = Math.round(randomBetween(40, 100))
  const rampW =
    railHeight * (railSlope === "mellow" ? MELLOW_RAMP_SLOPE : RAMP_SLOPE)
  const platW = randomBetween(60, 120)

  // Keep rail at least 30px above ground regardless of how many kinks descend
  const maxNetDrop = railHeight + RAIL_OFFSET - 30
  const { segments, totalW: gapW } = buildFloatingRailSegments(
    railSlope,
    maxNetDrop,
  )

  return {
    x,
    width: rampW + platW + gapW,
    height: railHeight,
    type: "rail",
    railHeight,
    rampW,
    platW,
    gapW,
    segments,
    bobPhase: randomBetween(0, Math.PI * 2),
  }
}

// ============================================================
// Geometry Helpers — surface Y and rail Y queries
// ============================================================

/** Walk segments and return the surface Y and rail Y at a local offset within the stair area */
function getSegmentYs(
  localX: number,
  topY: number,
  _baseGroundY: number,
  segments: StairSegment[],
): { surfaceY: number; railY: number } | null {
  let offsetX = 0
  let dropSoFar = 0

  for (const seg of segments) {
    if (seg.kind === "stairs") {
      const { run } = seg
      if (localX >= offsetX && localX <= offsetX + run.totalW) {
        const stairLocal = localX - offsetX
        const stepW = run.totalW / run.count
        const stepH = run.totalH / run.count
        const stepIndex = Math.min(
          Math.floor(stairLocal / stepW),
          run.count - 1,
        )
        const surfaceY = topY + dropSoFar + (stepIndex + 1) * stepH
        // Rail: linear slope across this run
        const progress = stairLocal / run.totalW
        const railStartY = topY + dropSoFar - RAIL_OFFSET
        const railEndY = topY + dropSoFar + run.totalH - RAIL_OFFSET
        const railY = railStartY + progress * (railEndY - railStartY)
        return { surfaceY, railY }
      }
      offsetX += run.totalW
      dropSoFar += run.totalH
    } else {
      // Landing
      if (localX >= offsetX && localX <= offsetX + seg.width) {
        const surfaceY = topY + dropSoFar
        const railY = topY + dropSoFar - RAIL_OFFSET
        return { surfaceY, railY }
      }
      offsetX += seg.width
    }
  }
  return null
}

function getStairsetSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "stairset" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null
  const local = worldX - t.x
  const topY = baseGroundY - t.height

  if (local <= t.rampW) {
    if (t.ascent === "stairs") {
      const stepW = t.rampW / t.ascentSteps
      const stepIndex = Math.min(Math.floor(local / stepW), t.ascentSteps - 1)
      let cumH = 0
      for (let i = 0; i <= stepIndex; i++) cumH += t.ascentStepHeights[i]
      return baseGroundY - cumH
    }
    if (t.ascent === "curve") {
      const p = local / t.rampW
      return baseGroundY - Math.sin(p * Math.PI * 0.5) * t.height
    }
    const progress = local / t.rampW
    return baseGroundY - progress * t.height
  } else if (local <= t.rampW + t.platW) {
    return topY
  } else {
    const stairLocal = local - t.rampW - t.platW
    const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments)
    return result ? result.surfaceY : baseGroundY
  }
}

export function getStairsetRailY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "stairset" },
): number | null {
  const stairStartX = t.x + t.rampW + t.platW
  const stairEndX = t.x + t.width
  if (worldX < stairStartX || worldX > stairEndX) return null
  const stairLocal = worldX - stairStartX
  const topY = baseGroundY - t.height
  const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments)
  return result ? result.railY : null
}

function getBumpSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "bump" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null
  const localX = worldX - t.x
  const amplitude = t.height
  const s = Math.sin((Math.PI * localX * t.count) / t.width)
  return baseGroundY - amplitude * s * s
}

export function getRailGapRailY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "railGap" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null
  const bob = Math.sin(t.bobPhase) * RAIL_GAP_BOB_AMPLITUDE
  const baseRailY = baseGroundY - t.railHeight - RAIL_OFFSET + bob
  const progress = (worldX - t.x) / t.width
  const sag = 4 * progress * (1 - progress)
  // Cap sag so the rail never dips below ground level (prevents false gap-death)
  const maxSag = Math.max(
    0,
    t.railHeight + RAIL_OFFSET - RAIL_GAP_BOB_AMPLITUDE - 10,
  )
  const sagDepth = Math.min(t.width * 0.09, maxSag)
  return baseRailY + sag * sagDepth
}

export function getStandaloneRailY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "rail" },
): number | null {
  const gapStartX = t.x + t.rampW + t.platW
  const gapEndX = t.x + t.width
  if (worldX < gapStartX || worldX > gapEndX) return null
  const localX = worldX - gapStartX
  const bob = Math.sin(t.bobPhase) * RAIL_GAP_BOB_AMPLITUDE
  const topY = baseGroundY - t.railHeight + bob
  const result = getSegmentYs(localX, topY, baseGroundY, t.segments)
  return result ? result.railY : null
}

function getRailSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "rail" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.rampW + t.platW) return null
  const local = worldX - t.x
  if (local <= t.rampW) {
    const progress = local / t.rampW
    return baseGroundY - progress * t.railHeight
  }
  return baseGroundY - t.railHeight
}

export function getSurfaceY(
  worldX: number,
  baseGroundY: number,
  terrain: TerrainPiece[],
): number {
  for (const t of terrain) {
    switch (t.type) {
      case "stairset": {
        const y = getStairsetSurfaceY(worldX, baseGroundY, t)
        if (y !== null) return y
        break
      }
      case "bump": {
        const y = getBumpSurfaceY(worldX, baseGroundY, t)
        if (y !== null) return y
        break
      }
      case "rail": {
        const y = getRailSurfaceY(worldX, baseGroundY, t)
        if (y !== null) return y
        break
      }
      // No default
    }
  }
  return baseGroundY
}
