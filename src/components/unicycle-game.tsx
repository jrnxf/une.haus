import { useCallback, useEffect, useRef, useState } from "react";

// --- Constants ---
const GROUND_Y_RATIO = 0.78;
const GRAVITY = 0.25;
const JUMP_FORCE = -9;
const DOUBLE_JUMP_FORCE = -7;
const JUMP_CUT = 0.4;
const INITIAL_SPEED = 4;
const MAX_SPEED = 8;
const SPEED_INCREMENT = 0.0005;
const MIN_SPAWN_GAP = 400;
const MAX_SPAWN_GAP = 700;
const PLAYER_X = 60;
const WHEEL_R = 10;
const RAIL_TOLERANCE = 10;
const RAIL_OFFSET = 8;
const GRIND_SCORE_MULTIPLIER = 3;
const COMBO_BONUS = 1;
const MILESTONE_INTERVAL = 500;
const MILESTONE_DISPLAY_FRAMES = 60;
const DEATH_ANIM_FRAMES = 40;
const DUST_COUNT = 7;
const DUST_LIFE = 16;
const SPEED_LINE_THRESHOLD = 5;
const SEAT_SPIN_FRAMES = 45;
const SEAT_SPIN_SPEED = (Math.PI * 2) / SEAT_SPIN_FRAMES;
const LS_HIGH_SCORE_KEY = "unicycle-high-score";
const LETTER_WORD = "UNEHAUS";
const LETTER_SIZE = 16;
const LETTER_BOB_SPEED = 0.05;
const LETTER_BOB_AMPLITUDE = 6;
const LETTER_SPAWN_INTERVAL = 180;
const LETTER_COLLECT_RADIUS = 20;
const LETTER_BONUS = 77770;
const LETTER_BONUS_DISPLAY_FRAMES = 120;

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
  | { type: "bump"; count: number }
);

type Cloud = {
  x: number;
  y: number;
  width: number;
};

type DustParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

type SpeedLine = {
  x: number;
  y: number;
  length: number;
};

type CollectibleLetter = {
  x: number;
  y: number;
  letter: string;
  index: number;
  bobPhase: number;
};

type GameState = {
  status: "idle" | "running" | "dead";
  playerY: number;
  velocityY: number;
  isAirborne: boolean;
  isGrinding: boolean;
  hasDoubleJump: boolean;
  speed: number;
  score: number;
  highScore: number;
  comboCount: number;
  terrain: TerrainPiece[];
  clouds: Cloud[];
  dustParticles: DustParticle[];
  speedLines: SpeedLine[];
  nextSpawnIn: number;
  groundOffset: number;
  wheelAngle: number;
  pedalAngle: number;
  flatTire: boolean;
  grindFrozenAngle: number;
  jumpHeld: boolean;
  deathTimer: number;
  deathSpeed: number;
  milestoneTimer: number;
  lastMilestone: number;
  seatSpin: number;
  seatSpinning: boolean;
  seatSpinDir: 1 | -1;
  letters: CollectibleLetter[];
  collectedLetters: boolean[];
  letterSpawnTimer: number;
  bonusTimer: number;
};

// --- Helpers ---
function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(LS_HIGH_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(LS_HIGH_SCORE_KEY, String(score));
  } catch {
    /* ignore */
  }
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

// --- Difficulty scaling ---
function getDifficulty(score: number) {
  const displayScore = Math.floor(score / 10);
  const t = Math.min(displayScore / 3000, 1);
  return {
    stairsetMax: 0.65 - t * 0.15,
    ledgeMax: 0.85 - t * 0.05,
    rampSpikeChance: 0.25 + t * 0.2,
    minStairs: 5 + Math.floor(t * 5),
    maxStairs: 40 + Math.floor(t * 20),
    gapMultiplier: 1 - t * 0.3,
  };
}

function createStairsetTerrain(
  x: number,
  prev: TerrainPiece | undefined,
  diff: ReturnType<typeof getDifficulty>,
): TerrainPiece {
  const platW = randomBetween(60, 120);

  // Decide stair count tier
  const tierRoll = Math.random();
  let totalCount: number;
  if (tierRoll < 0.3) totalCount = randomInt(diff.minStairs, 8);
  else if (tierRoll < 0.55)
    totalCount = randomInt(9, Math.max(15, diff.minStairs));
  else if (tierRoll < 0.8) totalCount = randomInt(16, 25);
  else totalCount = randomInt(26, diff.maxStairs);

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
    segments.push(
      { kind: "stairs", run: run1 },
      { kind: "landing", width: landingW },
      { kind: "stairs", run: run2 },
    );
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

  // Occasionally place spikes on the ramp
  const rampSpikes: RampSpike[] = [];
  if (
    rampW > 60 &&
    !lastHadSpikes(prev) &&
    Math.random() < diff.rampSpikeChance
  ) {
    const spikeW = randomBetween(24, 48);
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

function createTerrain(
  x: number,
  prev: TerrainPiece | undefined,
  score: number,
): TerrainPiece {
  const diff = getDifficulty(score);

  // After spikes/ledge, always generate a safe terrain
  if (lastHadSpikes(prev)) {
    // 40% bump, 60% stairset
    if (Math.random() < 0.4) {
      const width = randomBetween(80, 160);
      const amplitude = randomBetween(8, 20);
      const count = randomInt(1, 3);
      return { x, width, height: amplitude, type: "bump", count };
    }
    return createStairsetTerrain(x, prev, diff);
  }

  const roll = Math.random();

  // Bump: ~15%
  if (roll < 0.15) {
    const width = randomBetween(80, 160);
    const amplitude = randomBetween(8, 20);
    const count = randomInt(1, 3);
    return { x, width, height: amplitude, type: "bump", count };
  }

  // Stairset
  if (roll < 0.15 + (diff.stairsetMax - 0.15) * 0.6) {
    return createStairsetTerrain(x, prev, diff);
  }

  // Ledge
  if (roll < 0.75) {
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

  // Spikes: remainder
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

function spawnDust(x: number, groundY: number): DustParticle[] {
  return Array.from({ length: DUST_COUNT }, () => ({
    x: x + randomBetween(-8, 8),
    y: groundY + WHEEL_R,
    vx: randomBetween(-2, 2),
    vy: randomBetween(-2.5, -0.5),
    life: DUST_LIFE,
  }));
}

function spawnDoubleJumpPuff(x: number, playerY: number): DustParticle[] {
  return Array.from({ length: 4 }, () => ({
    x: x + randomBetween(-4, 4),
    y: playerY + WHEEL_R,
    vx: randomBetween(-1.5, 1.5),
    vy: randomBetween(1, 3),
    life: 10,
  }));
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

function getBumpSurfaceY(
  worldX: number,
  baseGroundY: number,
  t: TerrainPiece & { type: "bump" },
): number | null {
  if (worldX < t.x || worldX > t.x + t.width) return null;
  const localX = worldX - t.x;
  const amplitude = t.height;
  const s = Math.sin((Math.PI * localX * t.count) / t.width);
  return baseGroundY - amplitude * s * s;
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
    } else if (t.type === "bump") {
      const y = getBumpSurfaceY(worldX, baseGroundY, t);
      if (y !== null) return y;
    }
  }
  return baseGroundY;
}

// --- Dynamic lean ---
function computeLean(gs: GameState): number {
  if (gs.isGrinding) return 5;
  if (gs.isAirborne) {
    if (gs.velocityY < -3) return 1;
    if (gs.velocityY < 0) return 2;
    if (gs.velocityY > 3) return 7;
    return 5;
  }
  return 3;
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
  lean: number,
  deathTilt: number,
  seatSpin: number,
) {
  const wheelR = WHEEL_R;
  const wheelCenterY = y;

  ctx.save();
  if (deathTilt > 0) {
    const pivotX = x;
    const pivotY = y + wheelR;
    ctx.translate(pivotX, pivotY);
    ctx.rotate(deathTilt);
    ctx.translate(-pivotX, -pivotY);
  }

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

  // Seat post, seat, and pedal — rotate around wheel center during unispin
  const seatY = wheelCenterY - wheelR - 16;
  const pedalLen = 6;
  const px1 = x + Math.cos(pedalAngle) * pedalLen;
  const py1 = wheelCenterY + Math.sin(pedalAngle) * pedalLen;

  if (seatSpin !== 0) {
    ctx.save();
    ctx.translate(x, wheelCenterY);
    ctx.rotate(seatSpin);
    ctx.translate(-x, -wheelCenterY);
  }

  // Seat post
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, wheelCenterY - wheelR);
  ctx.lineTo(x + lean, seatY);
  ctx.stroke();

  // Curved seat
  ctx.beginPath();
  ctx.moveTo(x + lean - 4, seatY - 1);
  ctx.quadraticCurveTo(x + lean + 1, seatY + 2, x + lean + 7, seatY - 1);
  ctx.stroke();

  // Pedal
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px1 - 3, py1);
  ctx.lineTo(px1 + 3, py1);
  ctx.stroke();
  ctx.lineWidth = 2;

  if (seatSpin !== 0) {
    ctx.restore();
  }

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
  if (seatSpin !== 0) {
    // During unispin, leg tucks (not connected to spinning pedal)
    ctx.lineTo(hipX - 2, hipY + 10);
  } else {
    ctx.lineTo(px1, py1);
  }
  ctx.stroke();

  ctx.restore();

  // Grinding sparks — drawn outside transform so they stay world-aligned
  if (grinding && deathTilt === 0) {
    ctx.strokeStyle = fg;
    const sparkBase = wheelCenterY + wheelR;
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
  _muted: string,
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

function drawBump(
  ctx: CanvasRenderingContext2D,
  t: TerrainPiece & { type: "bump" },
  groundY: number,
  fg: string,
  bg: string,
) {
  const steps = 40;
  const stepW = t.width / steps;

  // Fill under the sine² curve (smooth rounded bottoms)
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(t.x, groundY);
  for (let i = 0; i <= steps; i++) {
    const localX = i * stepW;
    const s = Math.sin((Math.PI * localX * t.count) / t.width);
    const y = groundY - t.height * s * s;
    ctx.lineTo(t.x + localX, y);
  }
  ctx.lineTo(t.x + t.width, groundY);
  ctx.closePath();
  ctx.fill();

  // Stroke the curve
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const localX = i * stepW;
    const s = Math.sin((Math.PI * localX * t.count) / t.width);
    const y = groundY - t.height * s * s;
    if (i === 0) ctx.moveTo(t.x + localX, y);
    else ctx.lineTo(t.x + localX, y);
  }
  ctx.stroke();
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

function drawDustParticles(
  ctx: CanvasRenderingContext2D,
  particles: DustParticle[],
  fg: string,
) {
  for (const p of particles) {
    const opacity = p.life / DUST_LIFE;
    ctx.save();
    ctx.globalAlpha = opacity * 0.6;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    const len = 3 + (1 - opacity) * 4;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * len * 0.5, p.y + p.vy * len * 0.5);
    ctx.stroke();
    ctx.restore();
  }
}

function drawSpeedLines(
  ctx: CanvasRenderingContext2D,
  lines: SpeedLine[],
  muted: string,
) {
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1;
  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x + line.length, line.y);
    ctx.stroke();
  }
}

function drawCollectibleLetter(
  ctx: CanvasRenderingContext2D,
  l: CollectibleLetter,
  fg: string,
  isNext: boolean,
) {
  const bobY = l.y + Math.sin(l.bobPhase) * LETTER_BOB_AMPLITUDE;
  const radius = LETTER_SIZE;

  ctx.save();
  if (!isNext) ctx.globalAlpha = 0.3;

  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(l.x, bobY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = fg;
  ctx.font = `bold ${LETTER_SIZE}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(l.letter, l.x, bobY);

  ctx.restore();
}

function drawLetterHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  collectedLetters: boolean[],
  fg: string,
  muted: string,
  bonusTimer: number,
) {
  const letterSpacing = 28;
  const totalWidth = (LETTER_WORD.length - 1) * letterSpacing;
  const startX = (w - totalWidth) / 2;
  const y = 24;

  for (let i = 0; i < LETTER_WORD.length; i++) {
    const x = startX + i * letterSpacing;
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = collectedLetters[i] ? fg : muted;
    ctx.fillText(LETTER_WORD[i], x, y);
  }

  if (bonusTimer > 0) {
    const opacity = bonusTimer / LETTER_BONUS_DISPLAY_FRAMES;
    const scale = 1 + (1 - opacity) * 0.5;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = fg;
    ctx.font = `bold ${Math.floor(24 * scale)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("UNEHAUS! +7777", w / 2, 60 - (1 - opacity) * 15);
    ctx.restore();
  }
}

function drawMilestone(
  ctx: CanvasRenderingContext2D,
  w: number,
  milestone: number,
  timer: number,
  fg: string,
) {
  if (timer <= 0) return;
  const opacity = timer / MILESTONE_DISPLAY_FRAMES;
  const scale = 1 + (1 - opacity) * 0.3;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = fg;
  ctx.font = `${Math.floor(18 * scale)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(`${milestone}!`, w / 2, 50 - (1 - opacity) * 10);
  ctx.restore();
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
    hasDoubleJump: true,
    speed: INITIAL_SPEED,
    score: 0,
    highScore: loadHighScore(),
    comboCount: 0,
    terrain: [],
    clouds: [],
    dustParticles: [],
    speedLines: [],
    nextSpawnIn: 100,
    groundOffset: 0,
    wheelAngle: 0,
    pedalAngle: 0,
    flatTire: false,
    grindFrozenAngle: 0,
    jumpHeld: false,
    deathTimer: 0,
    deathSpeed: 0,
    milestoneTimer: 0,
    lastMilestone: 0,
    seatSpin: 0,
    seatSpinning: false,
    seatSpinDir: 1,
    letters: [],
    collectedLetters: Array(LETTER_WORD.length).fill(false) as boolean[],
    letterSpawnTimer: LETTER_SPAWN_INTERVAL,
    bonusTimer: 0,
  });
  const animRef = useRef<number>(0);
  const colorsRef = useRef({
    fg: "#000",
    bg: "#fff",
    muted: "rgba(0,0,0,0.3)",
    frame: 0,
  });

  const getGroundY = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    return (canvas.height / dpr) * GROUND_Y_RATIO;
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
    gs.hasDoubleJump = true;
    gs.speed = INITIAL_SPEED;
    gs.score = 0;
    gs.comboCount = 0;
    gs.terrain = [];
    gs.dustParticles = [];
    gs.speedLines = [];
    gs.nextSpawnIn = 200;
    gs.groundOffset = 0;
    gs.wheelAngle = 0;
    gs.pedalAngle = 0;
    gs.flatTire = false;
    gs.grindFrozenAngle = 0;
    gs.jumpHeld = false;
    gs.deathTimer = 0;
    gs.deathSpeed = 0;
    gs.milestoneTimer = 0;
    gs.lastMilestone = 0;
    gs.seatSpin = 0;
    gs.seatSpinning = false;
    gs.seatSpinDir = 1;
    gs.letters = [];
    gs.collectedLetters = Array(LETTER_WORD.length).fill(false) as boolean[];
    gs.letterSpawnTimer = LETTER_SPAWN_INTERVAL;
    gs.bonusTimer = 0;
  }, [getGroundY]);

  const jump = useCallback(() => {
    const gs = stateRef.current;
    if (!canvasRef.current) return;

    if (gs.status === "idle" || gs.status === "dead") {
      resetGame();
      return;
    }

    if (gs.isGrinding) {
      // Jump off grind
      gs.velocityY = JUMP_FORCE;
      gs.isAirborne = true;
      gs.isGrinding = false;
      gs.jumpHeld = true;
    } else if (!gs.isAirborne) {
      // Ground jump
      gs.velocityY = JUMP_FORCE;
      gs.isAirborne = true;
      gs.jumpHeld = true;
    } else if (gs.hasDoubleJump) {
      // Double jump
      gs.velocityY = DOUBLE_JUMP_FORCE;
      gs.hasDoubleJump = false;
      gs.jumpHeld = true;
      gs.seatSpinning = true;
      gs.seatSpin = 0;
      gs.seatSpinDir = Math.random() < 0.5 ? 1 : -1;
      gs.dustParticles.push(...spawnDoubleJumpPuff(PLAYER_X, gs.playerY));
    }
  }, [resetGame]);

  const releaseJump = useCallback(() => {
    const gs = stateRef.current;
    if (gs.jumpHeld && gs.isAirborne && gs.velocityY < 0) {
      gs.velocityY *= JUMP_CUT;
    }
    gs.jumpHeld = false;
  }, []);

  /* eslint-disable react-hooks/immutability -- game loop intentionally mutates ref state each frame and self-references via requestAnimationFrame */
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gs = stateRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const baseGroundY = h * GROUND_Y_RATIO;

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

    // --- Update dust particles (always, even during death) ---
    for (const p of gs.dustParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life--;
    }
    gs.dustParticles = gs.dustParticles.filter((p) => p.life > 0);

    // --- Update ---
    if (gs.status === "running") {
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INCREMENT);

      // Score: base 1 per frame, multiplied during grind
      const grindMultiplier = gs.isGrinding
        ? GRIND_SCORE_MULTIPLIER + (gs.comboCount - 1) * COMBO_BONUS
        : 1;
      gs.score += grindMultiplier;
      gs.groundOffset += gs.speed;

      // Milestone check
      const displayScore = Math.floor(gs.score / 10);
      const nextMilestone =
        Math.floor(displayScore / MILESTONE_INTERVAL) * MILESTONE_INTERVAL;
      if (nextMilestone > gs.lastMilestone && nextMilestone > 0) {
        gs.lastMilestone = nextMilestone;
        gs.milestoneTimer = MILESTONE_DISPLAY_FRAMES;
      }
      if (gs.milestoneTimer > 0) gs.milestoneTimer--;

      const surfaceY = getSurfaceY(PLAYER_X, baseGroundY, gs.terrain);

      if (gs.isGrinding) {
        let onRail = false;
        for (const t of gs.terrain) {
          let railY: number | null = null;
          if (t.type === "stairset")
            railY = getStairsetRailY(PLAYER_X, baseGroundY, t);
          else if (t.type === "ledge")
            railY = getLedgeRailY(PLAYER_X, baseGroundY, t);
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
          gs.comboCount = 0;
          gs.hasDoubleJump = true;
        }
      } else if (gs.isAirborne) {
        gs.velocityY += GRAVITY;
        gs.playerY += gs.velocityY;

        // Check for rail landing
        if (gs.velocityY > 0) {
          for (const t of gs.terrain) {
            let railY: number | null = null;
            if (t.type === "stairset")
              railY = getStairsetRailY(PLAYER_X, baseGroundY, t);
            else if (t.type === "ledge")
              railY = getLedgeRailY(PLAYER_X, baseGroundY, t);
            if (
              railY !== null &&
              Math.abs(gs.playerY - railY) < RAIL_TOLERANCE &&
              gs.playerY <= railY
            ) {
              gs.isGrinding = true;
              gs.playerY = railY;
              gs.velocityY = 0;
              gs.grindFrozenAngle = gs.wheelAngle;
              gs.comboCount++;
              gs.hasDoubleJump = true;
              gs.seatSpinning = false;
              gs.seatSpin = 0;
              break;
            }
          }
        }

        if (!gs.isGrinding && gs.playerY >= surfaceY) {
          // Landing — spawn dust
          if (gs.isAirborne) {
            gs.dustParticles.push(...spawnDust(PLAYER_X, surfaceY));
            gs.comboCount = 0;
          }
          gs.playerY = surfaceY;
          gs.velocityY = 0;
          gs.isAirborne = false;
          gs.hasDoubleJump = true;
          gs.seatSpinning = false;
          gs.seatSpin = 0;
        }
      } else {
        // On ground — follow surface
        gs.playerY = surfaceY;
      }

      // Update seat spin (unispin animation)
      if (gs.seatSpinning) {
        gs.seatSpin += SEAT_SPIN_SPEED * gs.seatSpinDir;
        if (Math.abs(gs.seatSpin) >= Math.PI * 2) {
          gs.seatSpin = 0;
          gs.seatSpinning = false;
        }
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

      // Speed lines
      if (gs.speed > SPEED_LINE_THRESHOLD) {
        const intensity =
          (gs.speed - SPEED_LINE_THRESHOLD) /
          (MAX_SPEED - SPEED_LINE_THRESHOLD);
        if (Math.random() < intensity * 0.4) {
          gs.speedLines.push({
            x: w + 10,
            y: randomBetween(20, baseGroundY - 10),
            length: randomBetween(20, 50) * intensity + 10,
          });
        }
      }
      for (const line of gs.speedLines) {
        line.x -= gs.speed * 1.5;
      }
      gs.speedLines = gs.speedLines.filter((l) => l.x + l.length > 0);

      // Spike collision (before terrain moves so positions match playerY)
      if (!gs.isGrinding) {
        const playerLeft = PLAYER_X - 8;
        const playerRight = PLAYER_X + 8;
        const playerBottom = gs.playerY + WHEEL_R;

        for (const t of gs.terrain) {
          if (t.type === "spikes") {
            if (
              playerRight > t.x + 2 &&
              playerLeft < t.x + t.width - 2 &&
              playerBottom >= baseGroundY - 2
            ) {
              gs.status = "dead";
              gs.flatTire = true;
              gs.deathTimer = 0;
              gs.deathSpeed = gs.speed;
              gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10));
              saveHighScore(gs.highScore);
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
                    gs.deathTimer = 0;
                    gs.deathSpeed = gs.speed;
                    gs.highScore = Math.max(
                      gs.highScore,
                      Math.floor(gs.score / 10),
                    );
                    saveHighScore(gs.highScore);
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
                gs.deathTimer = 0;
                gs.deathSpeed = gs.speed;
                gs.highScore = Math.max(
                  gs.highScore,
                  Math.floor(gs.score / 10),
                );
                saveHighScore(gs.highScore);
                break;
              }
            }
          }
        }
      }

      // Stop seat spin on death
      if (gs.status === "dead") {
        gs.seatSpinning = false;
        gs.seatSpin = 0;
      }

      // Spawn terrain (ensure no overlap)
      const diff = getDifficulty(gs.score);
      gs.nextSpawnIn -= gs.speed;
      if (gs.nextSpawnIn <= 0) {
        const last = gs.terrain.at(-1);
        const minX = last ? last.x + last.width + 80 : w + 20;
        const spawnX = Math.max(w + 20, minX);
        gs.terrain.push(createTerrain(spawnX, last, gs.score));
        gs.nextSpawnIn =
          randomBetween(MIN_SPAWN_GAP, MAX_SPAWN_GAP) *
          diff.gapMultiplier *
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

      // --- Letter collectibles ---
      gs.letterSpawnTimer -= 1;
      if (gs.letterSpawnTimer <= 0) {
        const nextIdx = gs.collectedLetters.indexOf(false);
        if (nextIdx !== -1 && gs.letters.length === 0) {
          gs.letters.push({
            x: w + 20,
            y: baseGroundY - randomBetween(40, 100),
            letter: LETTER_WORD[nextIdx],
            index: nextIdx,
            bobPhase: Math.random() * Math.PI * 2,
          });
        }
        gs.letterSpawnTimer = LETTER_SPAWN_INTERVAL;
      }

      for (const l of gs.letters) {
        l.x -= gs.speed;
        l.bobPhase += LETTER_BOB_SPEED;
        // Keep letter above terrain (accounts for bob + circle radius)
        const surfaceAtLetter = getSurfaceY(l.x, baseGroundY, gs.terrain);
        l.y = Math.min(l.y, surfaceAtLetter - 25);
      }
      gs.letters = gs.letters.filter((l) => l.x > -30);

      const nextLetterIdx = gs.collectedLetters.indexOf(false);
      for (let i = gs.letters.length - 1; i >= 0; i--) {
        const l = gs.letters[i];
        const bobY = l.y + Math.sin(l.bobPhase) * LETTER_BOB_AMPLITUDE;
        const dx = PLAYER_X - l.x;
        const dy = gs.playerY - bobY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LETTER_COLLECT_RADIUS && l.index === nextLetterIdx) {
          gs.collectedLetters[l.index] = true;
          gs.letters.splice(i, 1);
          gs.dustParticles.push(...spawnDust(l.x, bobY));
          if (gs.collectedLetters.every(Boolean)) {
            gs.score += LETTER_BONUS;
            gs.bonusTimer = LETTER_BONUS_DISPLAY_FRAMES;
            gs.collectedLetters = Array(LETTER_WORD.length).fill(
              false,
            ) as boolean[];
            gs.letters = [];
          }
        }
      }

      if (gs.bonusTimer > 0) gs.bonusTimer--;
    } else if (gs.status === "dead" && gs.deathTimer < DEATH_ANIM_FRAMES) {
      // Death animation: decelerate and tumble
      gs.deathTimer++;
      const progress = gs.deathTimer / DEATH_ANIM_FRAMES;
      const currentSpeed = gs.deathSpeed * (1 - progress);
      gs.groundOffset += currentSpeed;

      // Still move terrain during death
      for (const t of gs.terrain) {
        t.x -= currentSpeed;
      }
      gs.terrain = gs.terrain.filter((t) => t.x + t.width > -50);

      // Move letters during death
      for (const l of gs.letters) {
        l.x -= currentSpeed;
        l.bobPhase += LETTER_BOB_SPEED;
        const surfaceAtLetter = getSurfaceY(l.x, baseGroundY, gs.terrain);
        l.y = Math.min(l.y, surfaceAtLetter - 25);
      }
      gs.letters = gs.letters.filter((l) => l.x > -30);

      // Move clouds
      for (const cloud of gs.clouds) {
        cloud.x -= currentSpeed * 0.3;
      }

      // Speed lines fade out
      for (const line of gs.speedLines) {
        line.x -= currentSpeed * 1.5;
      }
      gs.speedLines = gs.speedLines.filter((l) => l.x + l.length > 0);

      if (gs.milestoneTimer > 0) gs.milestoneTimer--;
      if (gs.bonusTimer > 0) gs.bonusTimer--;

      if (gs.deathTimer >= DEATH_ANIM_FRAMES) {
        setIsDead(true);
      }
    } else if (gs.status === "dead") {
      // Fully dead — milestone can still tick down
      if (gs.milestoneTimer > 0) gs.milestoneTimer--;
      if (gs.bonusTimer > 0) gs.bonusTimer--;
    }

    // --- Draw ---
    // Speed lines (behind everything)
    drawSpeedLines(ctx, gs.speedLines, muted);

    for (const cloud of gs.clouds) {
      drawCloud(ctx, cloud, muted);
    }

    drawGround(ctx, baseGroundY, w, gs.groundOffset, fg, muted);

    for (const t of gs.terrain) {
      if (t.type === "stairset") {
        drawStairset(ctx, t, baseGroundY, fg, bg, muted);
      } else if (t.type === "ledge") {
        drawLedge(ctx, t, baseGroundY, fg, bg, muted);
      } else if (t.type === "bump") {
        drawBump(ctx, t, baseGroundY, fg, bg);
      } else {
        drawSpikes(ctx, t, baseGroundY, fg);
      }
    }

    // Collectible letters
    const nextLetterHudIdx = gs.collectedLetters.indexOf(false);
    for (const l of gs.letters) {
      drawCollectibleLetter(ctx, l, fg, l.index === nextLetterHudIdx);
    }

    // Dust particles
    drawDustParticles(ctx, gs.dustParticles, fg);

    // Player
    const playerDrawY = gs.status === "idle" ? baseGroundY : gs.playerY;
    const lean = gs.status === "idle" ? 3 : computeLean(gs);
    const deathTilt =
      gs.status === "dead"
        ? Math.min(gs.deathTimer / DEATH_ANIM_FRAMES, 1) * (Math.PI / 3)
        : 0;
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

    // Grind + combo indicator
    if (gs.isGrinding) {
      ctx.fillStyle = fg;
      ctx.font = "12px monospace";
      ctx.textAlign = "left";
      if (gs.comboCount > 1) {
        ctx.fillText(`grind x${gs.comboCount}!`, 16, 24);
      } else {
        ctx.fillText("grind!", 16, 24);
      }
    }

    // Milestone flash
    drawMilestone(ctx, w, gs.lastMilestone, gs.milestoneTimer, fg);

    // Letter collection HUD
    drawLetterHUD(ctx, w, gs.collectedLetters, fg, muted, gs.bonusTimer);

    if (gs.status === "idle") {
      ctx.fillStyle = fg;
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("press space or tap to ride", w / 2, h / 2 + 20);
    }

    if (gs.status === "dead" && gs.deathTimer >= DEATH_ANIM_FRAMES) {
      ctx.fillStyle = fg;
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("flat tire!", w / 2, h / 2 - 10);
      ctx.font = "12px monospace";
      ctx.fillText("press space or tap to retry", w / 2, h / 2 + 10);
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, [getGroundY]);
  /* eslint-enable react-hooks/immutability */

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const gs = stateRef.current;
    if (gs.status === "idle") {
      gs.playerY = getGroundY(canvas);
    }
  }, [getGroundY]);

  useEffect(() => {
    resizeCanvas();
    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const logicalWidth = canvas.width / dpr;
      stateRef.current.clouds = Array.from({ length: 3 }, () =>
        createCloud(logicalWidth),
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
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        releaseJump();
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("keyup", handleKeyUp);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", handleResize);
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameLoop, getGroundY, jump, releaseJump, resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 cursor-pointer items-center justify-center select-none"
      onPointerDown={jump}
      onPointerUp={releaseJump}
      onPointerCancel={releaseJump}
    >
      <canvas
        ref={canvasRef}
        className="text-foreground bg-background h-full w-full"
      />
      {!isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground font-mono text-xs">
            <span className="md:hidden">
              tap to jump · double tap for air jump
            </span>
            <span className="hidden md:inline">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space</kbd> to
              jump · press again mid-air for double jump
            </span>
          </p>
        </div>
      )}
      {isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground text-center font-mono text-xs">
            this game sucks. play{" "}
            <a
              href="https://store.steampowered.com/app/2204900/STREET_UNI_X/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline"
              onPointerDown={(e) => e.stopPropagation()}
            >
              street uni x
            </a>{" "}
            instead.
          </p>
        </div>
      )}
    </div>
  );
}
