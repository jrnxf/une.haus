import { useCallback, useEffect, useRef, useState } from "react";

// --- Constants ---
const GROUND_Y_RATIO = 0.78;
const GRAVITY = 0.35;
const JUMP_FORCE = -8;
const INITIAL_SPEED = 4;
const MAX_SPEED = 8;
const SPEED_INCREMENT = 0.0005;
const MIN_SPAWN_GAP = 400;
const MAX_SPAWN_GAP = 700;
const PLAYER_X = 60;
const WHEEL_R = 10;
const RAIL_TOLERANCE = 10;
const RAIL_OFFSET = 8;

// --- Types ---
type StairRun = { count: number; totalW: number; totalH: number };

type StairSegment =
  | { kind: "stairs"; run: StairRun }
  | { kind: "landing"; width: number };

type RampSpike = { offset: number; width: number };

type StairsetInfo = {
  rampW: number;
  platW: number;
  segments: StairSegment[];
  stairTotalW: number;
  rampSpikes: RampSpike[];
};

type LedgeInfo = {
  wallW: number;
  platW: number;
  segments: StairSegment[];
  stairTotalW: number;
};

type TerrainPiece = {
  x: number;
  width: number;
  height: number;
} & (
    | ({ type: "stairset" } & StairsetInfo)
    | { type: "spikes" }
    | ({ type: "ledge" } & LedgeInfo)
  );

type Cloud = {
  x: number;
  y: number;
  width: number;
};

type GameState = {
  status: "idle" | "running" | "dead";
  playerY: number;
  velocityY: number;
  isAirborne: boolean;
  isGrinding: boolean;
  speed: number;
  score: number;
  highScore: number;
  terrain: TerrainPiece[];
  clouds: Cloud[];
  nextSpawnIn: number;
  groundOffset: number;
  wheelAngle: number;
  pedalAngle: number;
  flatTire: boolean;
  grindFrozenAngle: number;
};

// --- Helpers ---
function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

// Fixed step dimensions — height is always proportional to count
const STEP_W = 24;
const STEP_H = 8;
// Ramp rises 1px for every 2.5px of width (consistent ~22° angle)
const RAMP_SLOPE = 2.5;
const SPIKE_H = 8;

function createStairRun(count: number): StairRun {
  return { count, totalW: count * STEP_W, totalH: count * STEP_H };
}

function lastHadSpikes(prev: TerrainPiece | undefined): boolean {
  if (!prev) return false;
  if (prev.type === "spikes") return true;
  if (prev.type === "ledge") return true;
  if (prev.type === "stairset" && prev.rampSpikes.length > 0) return true;
  return false;
}

function createTerrain(
  x: number,
  prev: TerrainPiece | undefined,
): TerrainPiece {
  // Force stairset if previous piece had spikes to keep them spaced out
  const roll = Math.random();
  if (roll < 0.65 || lastHadSpikes(prev)) {
    // Stairset
    const platW = randomBetween(60, 120);

    // Decide stair count tier (minimum 5 stairs)
    const tierRoll = Math.random();
    let totalCount: number;
    if (tierRoll < 0.3) totalCount = randomInt(5, 8);
    else if (tierRoll < 0.55) totalCount = randomInt(9, 15);
    else if (tierRoll < 0.8) totalCount = randomInt(16, 25);
    else totalCount = randomInt(26, 40);

    const segments: StairSegment[] = [];
    let stairTotalW = 0;
    let totalHeight = 0;

    // Kinked set: split into two runs with a landing (30% chance, only if enough stairs)
    const kinked = totalCount >= 4 && Math.random() < 0.3;
    if (kinked) {
      const split = randomInt(
        Math.max(1, Math.floor(totalCount * 0.3)),
        Math.floor(totalCount * 0.7),
      );
      const run1 = createStairRun(split);
      const landingW = randomBetween(50, 100);
      const run2 = createStairRun(totalCount - split);
      segments.push({ kind: "stairs", run: run1 }, { kind: "landing", width: landingW }, { kind: "stairs", run: run2 });
      stairTotalW = run1.totalW + landingW + run2.totalW;
      totalHeight = run1.totalH + run2.totalH;
    } else {
      const run = createStairRun(totalCount);
      segments.push({ kind: "stairs", run });
      stairTotalW = run.totalW;
      totalHeight = run.totalH;
    }

    // Ramp width derived from height at consistent angle
    const rampW = totalHeight * RAMP_SLOPE;

    // Occasionally place spikes on the ramp (~25% chance, only if ramp is long enough and prev had no spikes)
    const rampSpikes: RampSpike[] = [];
    if (rampW > 60 && !lastHadSpikes(prev) && Math.random() < 0.25) {
      const spikeW = randomBetween(24, 48);
      // Place spike somewhere in the middle 60% of the ramp
      const minOffset = rampW * 0.2;
      const maxOffset = rampW * 0.8 - spikeW;
      if (maxOffset > minOffset) {
        rampSpikes.push({
          offset: randomBetween(minOffset, maxOffset),
          width: spikeW,
        });
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
    };
  }
  // Ledge (~15% chance, but not after spikes)
  if (roll < 0.85 && !lastHadSpikes(prev)) {
    const stairCount = randomInt(4, 6);
    const run = createStairRun(stairCount);
    const totalHeight = run.totalH;
    const wallW = 12;
    const platW = randomBetween(60, 100);
    const segments: StairSegment[] = [{ kind: "stairs", run }];
    return {
      x,
      width: wallW + platW + run.totalW,
      height: totalHeight,
      type: "ledge",
      wallW,
      platW,
      segments,
      stairTotalW: run.totalW,
    };
  }

  return { x, width: randomBetween(40, 80), height: SPIKE_H, type: "spikes" };
}

function createCloud(canvasWidth: number, offscreen = false): Cloud {
  return {
    x: offscreen
      ? canvasWidth + randomBetween(20, 200)
      : randomBetween(0, canvasWidth),
    y: randomBetween(20, 80),
    width: randomBetween(40, 80),
  };
}

// --- Stairset geometry helpers ---

/** Walk segments and return the surface Y and rail Y at a local offset within the stair area */
function getSegmentYs(
  localX: number,
  topY: number,
  _baseGroundY: number,
  segments: StairSegment[],
): { surfaceY: number; railY: number } | null {
  let offsetX = 0;
  let dropSoFar = 0;

  for (const seg of segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      if (localX >= offsetX && localX <= offsetX + run.totalW) {
        const stairLocal = localX - offsetX;
        const stepW = run.totalW / run.count;
        const stepH = run.totalH / run.count;
        const stepIndex = Math.min(
          Math.floor(stairLocal / stepW),
          run.count - 1,
        );
        const surfaceY = topY + dropSoFar + (stepIndex + 1) * stepH;
        // Rail: linear across this run
        const progress = stairLocal / run.totalW;
        const railStartY = topY + dropSoFar - RAIL_OFFSET;
        const railEndY = topY + dropSoFar + run.totalH - RAIL_OFFSET;
        const railY = railStartY + progress * (railEndY - railStartY);
        return { surfaceY, railY };
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      // Landing
      if (localX >= offsetX && localX <= offsetX + seg.width) {
        const surfaceY = topY + dropSoFar;
        const railY = topY + dropSoFar - RAIL_OFFSET;
        return { surfaceY, railY };
      }
      offsetX += seg.width;
    }
  }
  return null;
}

function getStairsetSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "stairset" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null;
  const local = worldX - t.x;
  const topY = baseGroundY - t.height;

  if (local <= t.rampW) {
    const progress = local / t.rampW;
    return baseGroundY - progress * t.height;
  } else if (local <= t.rampW + t.platW) {
    return topY;
  } else {
    const stairLocal = local - t.rampW - t.platW;
    const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments);
    return result ? result.surfaceY : baseGroundY;
  }
}

function getStairsetRailY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "stairset" },
): number | null {
  const stairStartX = t.x + t.rampW + t.platW;
  const stairEndX = t.x + t.width;
  if (worldX < stairStartX || worldX > stairEndX) return null;
  const stairLocal = worldX - stairStartX;
  const topY = baseGroundY - t.height;
  const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments);
  return result ? result.railY : null;
}

function getLedgeSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "ledge" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null;
  const local = worldX - t.x;
  const topY = baseGroundY - t.height;

  if (local <= t.wallW) {
    // Wall zone — ground level (wall blocks, collision handles death)
    return baseGroundY;
  } else if (local <= t.wallW + t.platW) {
    return topY;
  } else {
    const stairLocal = local - t.wallW - t.platW;
    const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments);
    return result ? result.surfaceY : baseGroundY;
  }
}

function getLedgeRailY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "ledge" },
): number | null {
  const stairStartX = t.x + t.wallW + t.platW;
  const stairEndX = t.x + t.width;
  if (worldX < stairStartX || worldX > stairEndX) return null;
  const stairLocal = worldX - stairStartX;
  const topY = baseGroundY - t.height;
  const result = getSegmentYs(stairLocal, topY, baseGroundY, t.segments);
  return result ? result.railY : null;
}

function getSurfaceY(
  worldX: number,
  baseGroundY: number,
  terrain: TerrainPiece[],
): number {
  for (const t of terrain) {
    if (t.type === "stairset") {
      const y = getStairsetSurfaceY(worldX, baseGroundY, t);
      if (y !== null) return y;
    } else if (t.type === "ledge") {
      const y = getLedgeSurfaceY(worldX, baseGroundY, t);
      if (y !== null) return y;
    }
  }
  return baseGroundY;
}

// --- Drawing ---
function drawUnicyclist(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wheelAngle: number,
  pedalAngle: number,
  fg: string,
  flatTire: boolean,
  grinding: boolean,
) {
  const wheelR = WHEEL_R;
  const wheelCenterY = y;

  // Tire
  ctx.strokeStyle = fg;
  ctx.lineWidth = flatTire ? 2 : 3.5;
  ctx.beginPath();
  if (flatTire) {
    ctx.ellipse(x, wheelCenterY + 2, wheelR + 3, wheelR - 3, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(x, wheelCenterY, wheelR, 0, Math.PI * 2);
  }
  ctx.stroke();

  // Spokes
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const angle = wheelAngle + (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 2, wheelCenterY + Math.sin(angle) * 2);
    ctx.lineTo(
      x + Math.cos(angle) * (wheelR - 2),
      wheelCenterY + Math.sin(angle) * (wheelR - 2),
    );
    ctx.stroke();
  }

  // Lean: body offset forward
  const lean = 4;

  // Seat post
  ctx.lineWidth = 2;
  const seatY = wheelCenterY - wheelR - 16;
  ctx.beginPath();
  ctx.moveTo(x, wheelCenterY - wheelR);
  ctx.lineTo(x + lean, seatY);
  ctx.stroke();

  // Curved seat (quadratic curve, dips in the middle)
  ctx.beginPath();
  ctx.moveTo(x + lean - 4, seatY - 1);
  ctx.quadraticCurveTo(x + lean + 1, seatY + 2, x + lean + 7, seatY - 1);
  ctx.stroke();

  // Pedal
  const pedalLen = 6;
  const px1 = x + Math.cos(pedalAngle) * pedalLen;
  const py1 = wheelCenterY + Math.sin(pedalAngle) * pedalLen;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px1 - 3, py1);
  ctx.lineTo(px1 + 3, py1);
  ctx.stroke();
  ctx.lineWidth = 2;

  // Body
  const hipX = x + lean;
  const hipY = seatY;
  const torsoLen = 14;
  const shoulderX = hipX + 3;
  const shoulderY = hipY - torsoLen;
  const headR = 5;
  const headX = shoulderX + 2;
  const headY = shoulderY - headR - 1;

  // Torso
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(shoulderX, shoulderY);
  ctx.stroke();

  // Head (profile — flat back, rounded front)
  ctx.beginPath();
  ctx.arc(headX, headY, headR, 0, Math.PI * 2);
  ctx.stroke();

  // Side profile face
  // Eye (dot)
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(headX + 2.5, headY - 1, 1.2, 0, Math.PI * 2);
  ctx.fill();
  // Nose (small bump)
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headX + headR - 0.5, headY - 0.5);
  ctx.lineTo(headX + headR + 1.5, headY + 1);
  ctx.lineTo(headX + headR - 0.5, headY + 1.5);
  ctx.stroke();

  ctx.lineWidth = 2;

  // Single arm
  if (grinding) {
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + 12, shoulderY - 4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + 6, shoulderY + 7);
    ctx.stroke();
  }

  // Single leg
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(px1, py1);
  ctx.stroke();

  // Grinding sparks — shower of sparks shooting up-left at ~45°
  if (grinding) {
    ctx.strokeStyle = fg;
    const sparkBase = wheelCenterY + wheelR;
    // Spark lines
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const sx = x + randomBetween(-4, 4);
      const len = randomBetween(6, 22);
      const angle = Math.PI * 1.25 + randomBetween(-0.35, 0.35);
      ctx.beginPath();
      ctx.moveTo(sx, sparkBase);
      ctx.lineTo(sx + Math.cos(angle) * len, sparkBase + Math.sin(angle) * len);
      ctx.stroke();
    }
    // Spark dots scattered up-left
    for (let i = 0; i < 8; i++) {
      const dx = randomBetween(-28, -4);
      const dy = randomBetween(-22, -2);
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x + dx, sparkBase + dy, randomBetween(0.5, 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStairset(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "stairset" },
  groundY: number,
  fg: string,
  bg: string,
  muted: string,
) {
  const topY = groundY - t.height;
  ctx.fillStyle = bg;

  // Ramp fill
  ctx.beginPath();
  ctx.moveTo(t.x, groundY);
  ctx.lineTo(t.x + t.rampW, topY);
  ctx.lineTo(t.x + t.rampW, groundY);
  ctx.closePath();
  ctx.fill();

  // Platform fill
  ctx.fillRect(t.x + t.rampW, topY, t.platW, t.height);

  // Stair segments fill
  let offsetX = t.x + t.rampW + t.platW;
  let dropSoFar = 0;
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepW = run.totalW / run.count;
      const stepH = run.totalH / run.count;
      for (let i = 0; i < run.count; i++) {
        const sx = offsetX + i * stepW;
        const sy = topY + dropSoFar + i * stepH;
        ctx.fillRect(sx, sy, stepW + 1, groundY - sy);
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      // Landing fill
      const landY = topY + dropSoFar;
      ctx.fillRect(offsetX, landY, seg.width, groundY - landY);
      offsetX += seg.width;
    }
  }

  // --- Outlines ---
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;

  // Ramp
  ctx.beginPath();
  ctx.moveTo(t.x, groundY);
  ctx.lineTo(t.x + t.rampW, topY);
  ctx.stroke();

  // Platform top
  ctx.beginPath();
  ctx.moveTo(t.x + t.rampW, topY);
  ctx.lineTo(t.x + t.rampW + t.platW, topY);
  ctx.stroke();

  // Stair outlines
  offsetX = t.x + t.rampW + t.platW;
  dropSoFar = 0;
  ctx.beginPath();
  ctx.moveTo(offsetX, topY);
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepW = run.totalW / run.count;
      const stepH = run.totalH / run.count;
      for (let i = 0; i < run.count; i++) {
        const sy = topY + dropSoFar + i * stepH;
        ctx.lineTo(offsetX + i * stepW, sy + stepH);
        ctx.lineTo(offsetX + (i + 1) * stepW, sy + stepH);
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      // Landing: flat line
      const landY = topY + dropSoFar;
      ctx.lineTo(offsetX, landY);
      ctx.lineTo(offsetX + seg.width, landY);
      offsetX += seg.width;
    }
  }
  ctx.stroke();

  // Ramp spikes
  if (t.rampSpikes.length > 0) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    const rampLen = Math.hypot(t.rampW, t.height);
    const dx = t.rampW / rampLen;
    const dy = -t.height / rampLen;
    // Normal pointing away from ground (up from ramp surface)
    const nx = dy;
    const ny = -dx;
    const spikeTriW = 8;
    for (const spike of t.rampSpikes) {
      const count = Math.floor(spike.width / spikeTriW);
      for (let i = 0; i < count; i++) {
        const off = spike.offset + i * spikeTriW;
        const p0 = off / t.rampW;
        const p1 = (off + spikeTriW) / t.rampW;
        const pMid = (off + spikeTriW / 2) / t.rampW;
        const bx0 = t.x + off;
        const by0 = groundY - p0 * t.height;
        const bx1 = t.x + off + spikeTriW;
        const by1 = groundY - p1 * t.height;
        const mx = t.x + off + spikeTriW / 2;
        const my = groundY - pMid * t.height;
        ctx.beginPath();
        ctx.moveTo(bx0, by0);
        ctx.lineTo(mx + nx * SPIKE_H, my + ny * SPIKE_H);
        ctx.lineTo(bx1, by1);
        ctx.stroke();
      }
    }
  }

  // --- Handrail (follows stair profile with kinks) ---
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  const railStartX = t.x + t.rampW + t.platW;
  ctx.beginPath();
  offsetX = 0;
  dropSoFar = 0;
  ctx.moveTo(railStartX, topY - RAIL_OFFSET);
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      offsetX += seg.run.totalW;
      dropSoFar += seg.run.totalH;
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
    } else {
      // Landing: rail goes flat
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
      offsetX += seg.width;
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
    }
  }
  ctx.stroke();

  // Rail supports
  ctx.lineWidth = 2;
  ctx.strokeStyle = fg;
  offsetX = 0;
  dropSoFar = 0;
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepH = run.totalH / run.count;
      const postInterval = Math.max(1, Math.floor(run.count / 4));
      for (let i = 0; i <= run.count; i += postInterval) {
        const progress = Math.min(i / run.count, 1);
        const px = railStartX + offsetX + progress * run.totalW;
        const railY = topY + dropSoFar + progress * run.totalH - RAIL_OFFSET;
        const stepIndex = Math.min(i, run.count - 1);
        const stairSurfY = topY + dropSoFar + (stepIndex + 1) * stepH;
        ctx.beginPath();
        ctx.moveTo(px, railY);
        ctx.lineTo(px, Math.min(stairSurfY, groundY));
        ctx.stroke();
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      const midX = railStartX + offsetX + seg.width / 2;
      const railY = topY + dropSoFar - RAIL_OFFSET;
      ctx.beginPath();
      ctx.moveTo(midX, railY);
      ctx.lineTo(midX, topY + dropSoFar);
      ctx.stroke();
      offsetX += seg.width;
    }
  }
}

function drawLedge(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "ledge" },
  groundY: number,
  fg: string,
  bg: string,
  muted: string,
) {
  const topY = groundY - t.height;

  // Wall fill
  ctx.fillStyle = bg;
  ctx.fillRect(t.x, topY, t.wallW, t.height);

  // Platform fill
  ctx.fillRect(t.x + t.wallW, topY, t.platW, t.height);

  // Stair segments fill
  let offsetX = t.x + t.wallW + t.platW;
  let dropSoFar = 0;
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepW = run.totalW / run.count;
      const stepH = run.totalH / run.count;
      for (let i = 0; i < run.count; i++) {
        const sx = offsetX + i * stepW;
        const sy = topY + dropSoFar + i * stepH;
        ctx.fillRect(sx, sy, stepW + 1, groundY - sy);
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      const landY = topY + dropSoFar;
      ctx.fillRect(offsetX, landY, seg.width, groundY - landY);
      offsetX += seg.width;
    }
  }

  // --- Outlines ---
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;

  // Wall face (left side)
  ctx.beginPath();
  ctx.moveTo(t.x, groundY);
  ctx.lineTo(t.x, topY);
  ctx.stroke();

  // Wall top + platform top
  ctx.beginPath();
  ctx.moveTo(t.x, topY);
  ctx.lineTo(t.x + t.wallW + t.platW, topY);
  ctx.stroke();

  // Wall spikes (pointing left, toward approaching rider)
  const spikeW = 8;
  const spikeDepth = 6;
  const spikeCount = Math.floor(t.height / spikeW);
  const spikeStartY = topY + (t.height - spikeCount * spikeW) / 2;
  for (let i = 0; i < spikeCount; i++) {
    const sy = spikeStartY + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(t.x, sy);
    ctx.lineTo(t.x - spikeDepth, sy + spikeW / 2);
    ctx.lineTo(t.x, sy + spikeW);
    ctx.stroke();
  }

  // Stair outlines
  offsetX = t.x + t.wallW + t.platW;
  dropSoFar = 0;
  ctx.beginPath();
  ctx.moveTo(offsetX, topY);
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepW = run.totalW / run.count;
      const stepH = run.totalH / run.count;
      for (let i = 0; i < run.count; i++) {
        const sy = topY + dropSoFar + i * stepH;
        ctx.lineTo(offsetX + i * stepW, sy + stepH);
        ctx.lineTo(offsetX + (i + 1) * stepW, sy + stepH);
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      const landY = topY + dropSoFar;
      ctx.lineTo(offsetX, landY);
      ctx.lineTo(offsetX + seg.width, landY);
      offsetX += seg.width;
    }
  }
  ctx.stroke();

  // Wall cross-hatch
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  for (let ly = topY + 10; ly < groundY; ly += 14) {
    ctx.beginPath();
    ctx.moveTo(t.x + 2, ly);
    ctx.lineTo(t.x + t.wallW - 2, ly);
    ctx.stroke();
  }

  // --- Handrail ---
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  const railStartX = t.x + t.wallW + t.platW;
  ctx.beginPath();
  offsetX = 0;
  dropSoFar = 0;
  ctx.moveTo(railStartX, topY - RAIL_OFFSET);
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      offsetX += seg.run.totalW;
      dropSoFar += seg.run.totalH;
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
    } else {
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
      offsetX += seg.width;
      ctx.lineTo(railStartX + offsetX, topY + dropSoFar - RAIL_OFFSET);
    }
  }
  ctx.stroke();

  // Rail supports
  ctx.lineWidth = 2;
  ctx.strokeStyle = fg;
  offsetX = 0;
  dropSoFar = 0;
  for (const seg of t.segments) {
    if (seg.kind === "stairs") {
      const { run } = seg;
      const stepH = run.totalH / run.count;
      const postInterval = Math.max(1, Math.floor(run.count / 4));
      for (let i = 0; i <= run.count; i += postInterval) {
        const progress = Math.min(i / run.count, 1);
        const px = railStartX + offsetX + progress * run.totalW;
        const railY = topY + dropSoFar + progress * run.totalH - RAIL_OFFSET;
        const stepIndex = Math.min(i, run.count - 1);
        const stairSurfY = topY + dropSoFar + (stepIndex + 1) * stepH;
        ctx.beginPath();
        ctx.moveTo(px, railY);
        ctx.lineTo(px, Math.min(stairSurfY, groundY));
        ctx.stroke();
      }
      offsetX += run.totalW;
      dropSoFar += run.totalH;
    } else {
      const midX = railStartX + offsetX + seg.width / 2;
      const railY = topY + dropSoFar - RAIL_OFFSET;
      ctx.beginPath();
      ctx.moveTo(midX, railY);
      ctx.lineTo(midX, topY + dropSoFar);
      ctx.stroke();
      offsetX += seg.width;
    }
  }
}

function drawSpikes(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "spikes" },
  groundY: number,
  fg: string,
) {
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  const spikeW = 8;
  const count = Math.floor(t.width / spikeW);
  for (let i = 0; i < count; i++) {
    const sx = t.x + i * spikeW;
    ctx.beginPath();
    ctx.moveTo(sx, groundY);
    ctx.lineTo(sx + spikeW / 2, groundY - t.height);
    ctx.lineTo(sx + spikeW, groundY);
    ctx.stroke();
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  const { x, y, width: w } = cloud;
  const h = w * 0.4;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.3, y, w * 0.3, h * 0.5, 0, Math.PI, 0);
  ctx.ellipse(x + w * 0.65, y, w * 0.25, h * 0.35, 0, Math.PI, 0);
  ctx.stroke();
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  groundY: number,
  width: number,
  offset: number,
  fg: string,
  muted: string,
) {
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(width, groundY);
  ctx.stroke();

  ctx.strokeStyle = muted;
  const spacing = 20;
  for (let i = 0; i < width + spacing; i += spacing) {
    const drawX = (i - (offset % spacing) + spacing) % (width + spacing);
    if (drawX < width) {
      const tickH = i % 40 === 0 ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(drawX, groundY + 2);
      ctx.lineTo(drawX, groundY + 2 + tickH);
      ctx.stroke();
    }
  }
}

// --- Component ---
export function UnicycleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDead, setIsDead] = useState(false);
  const stateRef = useRef<GameState>({
    status: "idle",
    playerY: 0,
    velocityY: 0,
    isAirborne: false,
    isGrinding: false,
    speed: INITIAL_SPEED,
    score: 0,
    highScore: 0,
    terrain: [],
    clouds: [],
    nextSpawnIn: 100,
    groundOffset: 0,
    wheelAngle: 0,
    pedalAngle: 0,
    flatTire: false,
    grindFrozenAngle: 0,
  });
  const animRef = useRef<number>(0);
  const colorsRef = useRef({
    fg: "#000",
    bg: "#fff",
    muted: "rgba(0,0,0,0.3)",
    frame: 0,
  });

  const getGroundY = useCallback((canvas: HTMLCanvasElement) => {
    return canvas.height * GROUND_Y_RATIO;
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDead(false);
    const gs = stateRef.current;
    gs.status = "running";
    gs.playerY = getGroundY(canvas);
    gs.velocityY = 0;
    gs.isAirborne = false;
    gs.isGrinding = false;
    gs.speed = INITIAL_SPEED;
    gs.score = 0;
    gs.terrain = [];
    gs.nextSpawnIn = 200;
    gs.groundOffset = 0;
    gs.wheelAngle = 0;
    gs.pedalAngle = 0;
    gs.flatTire = false;
    gs.grindFrozenAngle = 0;
  }, [getGroundY]);

  const jump = useCallback(() => {
    const gs = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (gs.status === "idle" || gs.status === "dead") {
      resetGame();
      return;
    }

    if (!gs.isAirborne || gs.isGrinding) {
      gs.velocityY = JUMP_FORCE;
      gs.isAirborne = true;
      gs.isGrinding = false;
    }
  }, [resetGame]);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = stateRef.current;
    const w = canvas.width;
    const h = canvas.height;
    const baseGroundY = getGroundY(canvas);

    // Recompute colors every 60 frames
    const colors = colorsRef.current;
    colors.frame++;
    if (colors.frame % 60 === 1) {
      const styles = getComputedStyle(canvas);
      colors.fg = styles.getPropertyValue("color") || "#000";
      colors.bg = styles.getPropertyValue("background-color") || "#fff";
      const tmp = document.createElement("canvas");
      tmp.width = 1;
      tmp.height = 1;
      const tmpCtx = tmp.getContext("2d")!;
      tmpCtx.fillStyle = colors.fg;
      tmpCtx.fillRect(0, 0, 1, 1);
      const [r, g, b] = tmpCtx.getImageData(0, 0, 1, 1).data;
      colors.muted = `rgba(${r},${g},${b},0.3)`;
    }
    const { fg, bg, muted } = colors;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // --- Update ---
    if (gs.status === "running") {
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INCREMENT);
      gs.score += 1;
      gs.groundOffset += gs.speed;

      const surfaceY = getSurfaceY(PLAYER_X, baseGroundY, gs.terrain);

      if (gs.isGrinding) {
        let onRail = false;
        for (const t of gs.terrain) {
          let railY: number | null = null;
          if (t.type === "stairset") railY = getStairsetRailY(PLAYER_X, baseGroundY, t);
          else if (t.type === "ledge") railY = getLedgeRailY(PLAYER_X, baseGroundY, t);
          if (railY !== null) {
            gs.playerY = railY;
            onRail = true;
            break;
          }
        }
        if (!onRail) {
          gs.isGrinding = false;
          gs.isAirborne = false;
          gs.playerY = surfaceY;
        }
      } else if (gs.isAirborne) {
        gs.velocityY += GRAVITY;
        gs.playerY += gs.velocityY;

        // Check for rail landing
        if (gs.velocityY > 0) {
          for (const t of gs.terrain) {
            let railY: number | null = null;
            if (t.type === "stairset") railY = getStairsetRailY(PLAYER_X, baseGroundY, t);
            else if (t.type === "ledge") railY = getLedgeRailY(PLAYER_X, baseGroundY, t);
            if (
              railY !== null &&
              Math.abs(gs.playerY - railY) < RAIL_TOLERANCE &&
              gs.playerY <= railY
            ) {
              gs.isGrinding = true;
              gs.playerY = railY;
              gs.velocityY = 0;
              gs.grindFrozenAngle = gs.wheelAngle;
              break;
            }
          }
        }

        if (!gs.isGrinding && gs.playerY >= surfaceY) {
          gs.playerY = surfaceY;
          gs.velocityY = 0;
          gs.isAirborne = false;
        }
      } else {
        gs.playerY = surfaceY;
      }

      // Animate wheel
      if (gs.isGrinding) {
        gs.wheelAngle = gs.grindFrozenAngle;
        gs.pedalAngle = gs.grindFrozenAngle;
      } else if (gs.isAirborne) {
        gs.wheelAngle += gs.speed * 0.08;
      } else {
        gs.wheelAngle += gs.speed * 0.08;
        gs.pedalAngle += gs.speed * 0.04;
      }

      // Spike collision (before terrain moves so positions match playerY)
      if (!gs.isGrinding) {
        const playerLeft = PLAYER_X - 8;
        const playerRight = PLAYER_X + 8;
        const playerBottom = gs.playerY + WHEEL_R;

        for (const t of gs.terrain) {
          if (t.type === "spikes") {
            if (playerRight > t.x + 2 && playerLeft < t.x + t.width - 2 && playerBottom >= baseGroundY - 2) {
              gs.status = "dead";
              gs.flatTire = true;
              gs.highScore = Math.max(
                gs.highScore,
                Math.floor(gs.score / 10),
              );
              break;
            }
          } else if (t.type === "stairset" && t.rampSpikes.length > 0) {
            for (const spike of t.rampSpikes) {
              const spikeLeft = t.x + spike.offset;
              const spikeRight = t.x + spike.offset + spike.width;
              if (playerRight > spikeLeft + 2 && playerLeft < spikeRight - 2) {
                const progress = (PLAYER_X - t.x) / t.rampW;
                if (progress >= 0 && progress <= 1) {
                  const rampSurfaceY = baseGroundY - progress * t.height;
                  if (
                    gs.playerY >= rampSurfaceY - SPIKE_H &&
                    gs.playerY <= rampSurfaceY
                  ) {
                    gs.status = "dead";
                    gs.flatTire = true;
                    gs.highScore = Math.max(
                      gs.highScore,
                      Math.floor(gs.score / 10),
                    );
                    break;
                  }
                }
              }
            }
            if (gs.status === "dead") break;
          } else if (t.type === "ledge") {
            // Wall collision: if player overlaps wall and hasn't cleared the top
            const wallRight = t.x + t.wallW;
            if (playerRight > t.x && playerLeft < wallRight) {
              const topY = baseGroundY - t.height;
              if (gs.playerY > topY) {
                gs.status = "dead";
                gs.flatTire = true;
                gs.highScore = Math.max(
                  gs.highScore,
                  Math.floor(gs.score / 10),
                );
                break;
              }
            }
          }
        }
      }

      // Spawn terrain (ensure no overlap)
      gs.nextSpawnIn -= gs.speed;
      if (gs.nextSpawnIn <= 0) {
        const last = gs.terrain.at(-1);
        const minX = last ? last.x + last.width + 80 : w + 20;
        const spawnX = Math.max(w + 20, minX);
        gs.terrain.push(createTerrain(spawnX, last));
        gs.nextSpawnIn =
          randomBetween(MIN_SPAWN_GAP, MAX_SPAWN_GAP) *
          (INITIAL_SPEED / gs.speed);
      }

      // Move terrain
      for (const t of gs.terrain) {
        t.x -= gs.speed;
      }
      gs.terrain = gs.terrain.filter((t) => t.x + t.width > -50);

      // Move clouds
      for (const cloud of gs.clouds) {
        cloud.x -= gs.speed * 0.3;
      }
      gs.clouds = gs.clouds.filter((c) => c.x + c.width > -20);
      if (gs.clouds.length < 4 && Math.random() < 0.01) {
        gs.clouds.push(createCloud(w, true));
      }
    }

    // --- Draw ---
    for (const cloud of gs.clouds) {
      drawCloud(ctx, cloud, muted);
    }

    drawGround(ctx, baseGroundY, w, gs.groundOffset, fg, muted);

    for (const t of gs.terrain) {
      if (t.type === "stairset") {
        drawStairset(ctx, t, baseGroundY, fg, bg, muted);
      } else if (t.type === "ledge") {
        drawLedge(ctx, t, baseGroundY, fg, bg, muted);
      } else {
        drawSpikes(ctx, t, baseGroundY, fg);
      }
    }

    const playerDrawY = gs.status === "idle" ? baseGroundY : gs.playerY;
    drawUnicyclist(
      ctx,
      PLAYER_X,
      playerDrawY,
      gs.wheelAngle,
      gs.pedalAngle,
      fg,
      gs.flatTire,
      gs.isGrinding,
    );

    // Score
    ctx.fillStyle = fg;
    ctx.font = "14px monospace";
    ctx.textAlign = "right";
    ctx.fillText(
      String(Math.floor(gs.score / 10)).padStart(5, "0"),
      w - 16,
      24,
    );

    if (gs.highScore > 0) {
      ctx.fillStyle = muted;
      ctx.font = "12px monospace";
      ctx.fillText(`hi ${String(gs.highScore).padStart(5, "0")}`, w - 16, 40);
    }

    if (gs.isGrinding) {
      ctx.fillStyle = fg;
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      ctx.fillText("grinding!", 16, 24);
    }

    if (gs.status === "idle") {
      ctx.fillStyle = fg;
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("press space or tap to ride", w / 2, h / 2 + 20);
    }

    if (gs.status === "dead") {
      setIsDead(true);
      ctx.fillStyle = fg;
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("flat tire!", w / 2, h / 2 - 10);
      ctx.font = "12px monospace";
      ctx.fillText("press space or tap to retry", w / 2, h / 2 + 10);
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [getGroundY]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const gs = stateRef.current;
    if (gs.status === "idle") {
      gs.playerY = getGroundY(canvas);
    }
  }, [getGroundY]);

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (canvas) {
      stateRef.current.clouds = Array.from({ length: 3 }, () =>
        createCloud(canvas.width),
      );
      stateRef.current.playerY = getGroundY(canvas);
    }

    animRef.current = requestAnimationFrame(gameLoop);
    const handleResize = () => resizeCanvas();
    window.addEventListener("resize", handleResize);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
      globalThis.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameLoop, getGroundY, jump, resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 cursor-pointer items-center justify-center select-none"
      onPointerDown={jump}
    >
      <canvas
        ref={canvasRef}
        className="text-foreground bg-background h-full w-full"
      />
      {!isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground font-mono text-xs">
            <span className="md:hidden">tap to jump</span>
            <span className="hidden md:inline">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space</kbd> to
              jump
            </span>
          </p>
        </div>
      )}
      {isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground text-center font-mono text-xs">
            this game sucks. play {" "}
            <a
              href="https://store.steampowered.com/app/2204900/STREET_UNI_X/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline"
              onPointerDown={(e) => e.stopPropagation()}
            >
              street uni x
            </a>
            {" "}instead.
          </p>
        </div>
      )}
    </div>
  );
}
