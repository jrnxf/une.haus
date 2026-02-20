import { useCallback, useEffect, useRef, useState } from "react";

const GRAVITY = 0.3;
const JUMP_FORCE = -3;
const JUMP_HOLD_BOOST = -0.3;
const MAX_HOLD_FRAMES = 16;
const INITIAL_SPEED = 3.5;
const MAX_SPEED = 7;
const SPEED_INC = 0.0003;
const NEUTRAL_SLOPE = 0.12;
const SLOPE_SPEED_SCALE = 20;
const PLAYER_X = 100;
const WHEEL_R = 10;
const RAIL_TOLERANCE = 20;
const RAIL_ABOVE = 10;
const STEP_W = 20;
const COYOTE_FRAMES = 6;
const LS_KEY = "arcade-staircase-hi";

type RailType = "staircase" | "flat" | "ramp";

type Rail = {
  x: number;
  y: number;
  width: number;
  slope: number;
  type: RailType;
};

type GameState = {
  status: "idle" | "running" | "dead";
  playerY: number;
  velocityY: number;
  isGrinding: boolean;
  speed: number;
  score: number;
  highScore: number;
  rails: Rail[];
  cameraY: number;
  wheelAngle: number;
  deathTimer: number;
  flatTire: boolean;
  lastSlope: number;
  lastRailY: number;
  coyoteTimer: number;
  jumpHeld: boolean;
  jumpHeldFrames: number;
};

function randomBetween(a: number, b: number) {
  return Math.random() * (b - a) + a;
}

function loadHi() {
  try {
    return Number(localStorage.getItem(LS_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveHi(s: number) {
  try {
    localStorage.setItem(LS_KEY, String(s));
  } catch {
    /* */
  }
}

function getRailY(rail: Rail): number | null {
  if (PLAYER_X < rail.x || PLAYER_X > rail.x + rail.width) return null;
  return rail.y + rail.slope * (PLAYER_X - rail.x);
}

function generateSingleRail(prev: Rail | null, score: number): Rail {
  if (!prev)
    return {
      x: PLAYER_X - 60,
      y: 200,
      width: 500,
      slope: 0.18,
      type: "staircase",
    };

  const endY = prev.y + prev.slope * prev.width;
  const endX = prev.x + prev.width;
  const t = Math.min(score / 30_000, 1);
  const wasStep = prev.slope > 0.25;

  // After a steep downhill, always generate a climb or flat to regulate speed
  if (wasStep) {
    const roll = Math.random();

    if (roll < 0.55) {
      // Uphill climb — ascending staircase that eats speed
      const gap = randomBetween(10, 40);
      const width = randomBetween(150, 350);
      const slope = randomBetween(-0.25, -0.08);
      return {
        x: endX + gap,
        y: endY + randomBetween(-5, 10),
        width,
        slope,
        type: "staircase",
      };
    }

    // Flat bridge — coasts off speed
    const gap = randomBetween(0, 10);
    const width = randomBetween(120, 280);
    const slope = randomBetween(-0.03, 0.03);
    return {
      x: endX + gap,
      y: endY + randomBetween(-3, 3),
      width,
      slope,
      type: "flat",
    };
  }

  const roll = Math.random();

  // Flat connector — speed trap: long enough to stall slow players
  if (roll < 0.15) {
    const gap = randomBetween(0, 10);
    const width = randomBetween(100 + t * 80, 250 + t * 150);
    const slope = randomBetween(-0.03, 0.03);
    return {
      x: endX + gap,
      y: endY + randomBetween(-3, 3),
      width,
      slope,
      type: "flat",
    };
  }

  // Ramp — launches player upward (don't chain ramps)
  if (roll < 0.28 && prev.type !== "ramp") {
    const gap = randomBetween(40, 70);
    const width = randomBetween(100, 200);
    const slope = randomBetween(-0.4, -0.15);
    const yOff = randomBetween(15, 40);
    return { x: endX + gap, y: endY + yOff, width, slope, type: "ramp" };
  }

  // Standard downhill staircase
  const gap = randomBetween(50 + t * 20, 90 + t * 40);

  const lengthRoll = Math.random();
  let width: number;
  if (lengthRoll < 0.2) {
    width = randomBetween(80, 150);
  } else if (lengthRoll < 0.65) {
    width = randomBetween(150, 400);
  } else {
    width = randomBetween(400, 650 - t * 100);
  }

  const steepRoll = Math.random();
  let slope: number;
  if (steepRoll < 0.25) {
    slope = randomBetween(0.08, 0.15);
  } else if (steepRoll < 0.65) {
    slope = randomBetween(0.15, 0.3 + t * 0.05);
  } else {
    slope = randomBetween(0.3, 0.45 + t * 0.08);
  }

  const yOff = randomBetween(-10 - t * 8, 15 + t * 5);
  return { x: endX + gap, y: endY + yOff, width, slope, type: "staircase" };
}

function generateKinked(endX: number, endY: number, t: number): Rail[] {
  const gap = randomBetween(40, 70);
  const numSegs = Math.random() < 0.4 ? 5 : 3;
  const rails: Rail[] = [];
  let x = endX + gap;
  let y = endY + randomBetween(-5, 10);

  for (let i = 0; i < numSegs; i++) {
    const isFlat = i % 2 === 1;
    const width = isFlat ? randomBetween(40, 100) : randomBetween(60, 160);
    const slope = isFlat
      ? randomBetween(-0.02, 0.02)
      : randomBetween(0.12, 0.3 + t * 0.05);
    const type: RailType = isFlat ? "flat" : "staircase";
    rails.push({ x, y, width, slope, type });
    y += slope * width;
    x += width;
  }
  return rails;
}

function generateCurveUp(endX: number, endY: number, _t: number): Rail[] {
  const gap = randomBetween(30, 60);
  const numSegs = 4 + Math.floor(Math.random() * 3);
  const startSlope = randomBetween(0.1, 0.25);
  const endSlope = randomBetween(-0.25, -0.1);
  const rails: Rail[] = [];
  let x = endX + gap;
  let y = endY + randomBetween(-5, 10);

  for (let i = 0; i < numSegs; i++) {
    const p = i / (numSegs - 1);
    const slope = startSlope + (endSlope - startSlope) * p;
    const width = randomBetween(40, 80);
    rails.push({ x, y, width, slope, type: "flat" });
    y += slope * width;
    x += width;
  }
  return rails;
}

function generateValley(endX: number, endY: number, _t: number): Rail[] {
  const gap = randomBetween(40, 70);
  let x = endX + gap;
  let y = endY + randomBetween(-5, 10);

  const downWidth = randomBetween(80, 180);
  const downSlope = randomBetween(0.15, 0.35);
  const down: Rail = {
    x,
    y,
    width: downWidth,
    slope: downSlope,
    type: "staircase",
  };
  x += downWidth;
  y += downSlope * downWidth;

  const upWidth = randomBetween(80, 160);
  const upSlope = randomBetween(-0.3, -0.1);
  const up: Rail = { x, y, width: upWidth, slope: upSlope, type: "staircase" };

  return [down, up];
}

function generateRailBatch(prev: Rail | null, score: number): Rail[] {
  if (!prev) return [generateSingleRail(null, 0)];

  const wasStep = prev.slope > 0.25;
  if (wasStep) return [generateSingleRail(prev, score)];

  const endX = prev.x + prev.width;
  const endY = prev.y + prev.slope * prev.width;
  const t = Math.min(score / 30_000, 1);

  const roll = Math.random();
  if (roll < 0.25) {
    const typeRoll = Math.random();
    if (typeRoll < 0.45) return generateKinked(endX, endY, t);
    if (typeRoll < 0.75) return generateCurveUp(endX, endY, t);
    return generateValley(endX, endY, t);
  }

  return [generateSingleRail(prev, score)];
}

function toSY(worldY: number, camY: number) {
  return worldY - camY;
}

function drawRider(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wheelAngle: number,
  fg: string,
  grinding: boolean,
  flatTire: boolean,
  tilt: number,
) {
  const r = WHEEL_R;
  ctx.save();
  if (tilt > 0) {
    ctx.translate(x, y + r);
    ctx.rotate(tilt);
    ctx.translate(-x, -(y + r));
  }
  ctx.strokeStyle = fg;
  ctx.lineWidth = flatTire ? 2 : 3;
  ctx.beginPath();
  if (flatTire) {
    ctx.ellipse(x, y + 2, r + 2, r - 3, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = wheelAngle + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2);
    ctx.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  const seatY = y - r - 14;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + 3, seatY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, seatY - 1);
  ctx.lineTo(x + 8, seatY - 1);
  ctx.stroke();
  const shY = seatY - 12;
  ctx.beginPath();
  ctx.moveTo(x + 3, seatY);
  ctx.lineTo(x + 5, shY);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + 6, shY - 5, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(x + 8, shY - 6, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x + 5, shY);
  if (grinding) ctx.lineTo(x + 14, shY - 4);
  else ctx.lineTo(x + 10, shY + 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 3, seatY);
  ctx.lineTo(x + 1, y - 2);
  ctx.stroke();
  ctx.restore();
  if (grinding && tilt === 0) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const sx = x + randomBetween(-3, 3);
      const len = randomBetween(4, 16);
      const angle = Math.PI * 1.25 + randomBetween(-0.3, 0.3);
      ctx.beginPath();
      ctx.moveTo(sx, y + r);
      ctx.lineTo(sx + Math.cos(angle) * len, y + r + Math.sin(angle) * len);
      ctx.stroke();
    }
  }
}

function drawStaircase(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  startSY: number,
  endSY: number,
  fg: string,
  bg: string,
) {
  const numSteps = Math.max(1, Math.floor(rail.width / STEP_W));
  const stepW = rail.width / numSteps;

  // Stair fill
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY + RAIL_ABOVE);
  for (let i = 0; i < numSteps; i++) {
    const stepY =
      startSY + RAIL_ABOVE + ((endSY - startSY) * (i + 1)) / numSteps;
    ctx.lineTo(rail.x + i * stepW, stepY);
    ctx.lineTo(rail.x + (i + 1) * stepW, stepY);
  }
  ctx.lineTo(rail.x + rail.width, endSY + RAIL_ABOVE + 200);
  ctx.lineTo(rail.x, startSY + RAIL_ABOVE + 200);
  ctx.closePath();
  ctx.fill();

  // Stair outlines
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY + RAIL_ABOVE);
  for (let i = 0; i < numSteps; i++) {
    const stepY =
      startSY + RAIL_ABOVE + ((endSY - startSY) * (i + 1)) / numSteps;
    ctx.lineTo(rail.x + i * stepW, stepY);
    ctx.lineTo(rail.x + (i + 1) * stepW, stepY);
  }
  ctx.stroke();

  // Handrail
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY);
  ctx.lineTo(rail.x + rail.width, endSY);
  ctx.stroke();

  // Rail supports
  ctx.lineWidth = 1.5;
  const supportCount = Math.max(2, Math.floor(numSteps / 3));
  for (let i = 0; i <= supportCount; i++) {
    const p = i / supportCount;
    const px = rail.x + p * rail.width;
    const railSY = startSY + p * (endSY - startSY);
    ctx.beginPath();
    ctx.moveTo(px, railSY);
    ctx.lineTo(px, railSY + RAIL_ABOVE);
    ctx.stroke();
  }
}

function drawFlat(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  startSY: number,
  endSY: number,
  fg: string,
) {
  // Thick flat rail bar
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY);
  ctx.lineTo(rail.x + rail.width, endSY);
  ctx.stroke();

  // Hash marks along the bar
  ctx.lineWidth = 1;
  const count = Math.max(2, Math.floor(rail.width / 25));
  for (let i = 0; i <= count; i++) {
    const p = i / count;
    const px = rail.x + p * rail.width;
    const py = startSY + p * (endSY - startSY);
    ctx.beginPath();
    ctx.moveTo(px, py - 4);
    ctx.lineTo(px, py + 4);
    ctx.stroke();
  }

  // Two supports at ends
  ctx.lineWidth = 1.5;
  for (const p of [0, 1]) {
    const px = rail.x + p * rail.width;
    const py = startSY + p * (endSY - startSY);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py + 30);
    ctx.stroke();
  }
}

function drawRamp(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  startSY: number,
  endSY: number,
  fg: string,
) {
  // Curved ramp — quadratic bezier that scoops upward
  const cpX = rail.x + rail.width * 0.6;
  const cpY = startSY + (endSY - startSY) * 0.15;

  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY);
  ctx.quadraticCurveTo(cpX, cpY, rail.x + rail.width, endSY);
  ctx.stroke();

  // Lip at the end — small upward tick
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rail.x + rail.width, endSY);
  ctx.lineTo(rail.x + rail.width + 4, endSY - 8);
  ctx.stroke();

  // Supports
  ctx.lineWidth = 1.5;
  for (const p of [0, 0.4, 0.8]) {
    const px = rail.x + p * rail.width;
    // Approximate curve Y at this point
    const t = p;
    const curveY =
      (1 - t) * (1 - t) * startSY + 2 * (1 - t) * t * cpY + t * t * endSY;
    ctx.beginPath();
    ctx.moveTo(px, curveY);
    ctx.lineTo(px, curveY + 25);
    ctx.stroke();
  }

  // Arrow indicators on the ramp surface
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const t = 0.25 + i * 0.2;
    const px = rail.x + t * rail.width;
    const curveY =
      (1 - t) * (1 - t) * startSY + 2 * (1 - t) * t * cpY + t * t * endSY;
    ctx.beginPath();
    ctx.moveTo(px - 4, curveY + 3);
    ctx.lineTo(px, curveY - 2);
    ctx.lineTo(px + 4, curveY + 3);
    ctx.stroke();
  }
}

function drawRail(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  camY: number,
  fg: string,
  bg: string,
) {
  const sy = (wy: number) => toSY(wy, camY);
  const startSY = sy(rail.y);
  const endSY = sy(rail.y + rail.slope * rail.width);

  if (rail.type === "flat") {
    drawFlat(ctx, rail, startSY, endSY, fg);
  } else if (rail.type === "ramp") {
    drawRamp(ctx, rail, startSY, endSY, fg);
  } else {
    drawStaircase(ctx, rail, startSY, endSY, fg, bg);
  }
}

export function EternalStaircase() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDead, setIsDead] = useState(false);
  const stateRef = useRef<GameState>({
    status: "idle",
    playerY: 200,
    velocityY: 0,
    isGrinding: false,
    speed: INITIAL_SPEED,
    score: 0,
    highScore: loadHi(),
    rails: [],
    cameraY: 100,
    wheelAngle: 0,
    deathTimer: 0,
    flatTire: false,
    lastSlope: 0.15,
    lastRailY: 200,
    coyoteTimer: 999,
    jumpHeld: false,
    jumpHeldFrames: 0,
  });
  const animRef = useRef(0);
  const colorsRef = useRef({
    fg: "#000",
    bg: "#fff",
    muted: "rgba(0,0,0,0.3)",
    frame: 0,
  });

  const initRails = useCallback(() => {
    const gs = stateRef.current;
    gs.rails = [generateSingleRail(null, 0)];
    for (let i = 0; i < 8; i++)
      gs.rails.push(...generateRailBatch(gs.rails.at(-1)!, 0));
    gs.playerY = gs.rails[0].y;
    gs.cameraY = gs.playerY - 100;
  }, []);

  const startRunning = useCallback(() => {
    const gs = stateRef.current;
    gs.status = "running";
    gs.velocityY = 0;
    gs.isGrinding = true;
    gs.speed = INITIAL_SPEED;
    gs.score = 0;
    gs.wheelAngle = 0;
    gs.deathTimer = 0;
    gs.flatTire = false;
    gs.lastSlope = 0.15;
    gs.lastRailY = gs.playerY;
    gs.coyoteTimer = 999;
    gs.jumpHeld = false;
    gs.jumpHeldFrames = 0;
  }, []);

  const resetGame = useCallback(() => {
    setIsDead(false);
    initRails();
    startRunning();
  }, [initRails, startRunning]);

  const jump = useCallback(() => {
    const gs = stateRef.current;
    if (gs.status === "idle") {
      // Keep same rails, just start running
      startRunning();
      return;
    }
    if (gs.status === "dead") {
      resetGame();
      return;
    }
    if (gs.isGrinding || gs.coyoteTimer < COYOTE_FRAMES) {
      gs.velocityY = JUMP_FORCE;
      gs.isGrinding = false;
      gs.coyoteTimer = 999;
      gs.jumpHeld = true;
      gs.jumpHeldFrames = 0;
    }
  }, [resetGame, startRunning]);

  const releaseJump = useCallback(() => {
    stateRef.current.jumpHeld = false;
  }, []);

  /* eslint-disable react-hooks/immutability */
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

    const colors = colorsRef.current;
    colors.frame++;
    if (colors.frame % 60 === 1) {
      const s = getComputedStyle(canvas);
      colors.fg = s.getPropertyValue("color") || "#000";
      colors.bg = s.getPropertyValue("background-color") || "#fff";
      const tmp = document.createElement("canvas");
      tmp.width = 1;
      tmp.height = 1;
      const tc = tmp.getContext("2d")!;
      tc.fillStyle = colors.fg;
      tc.fillRect(0, 0, 1, 1);
      const [r, g, b] = tc.getImageData(0, 0, 1, 1).data;
      colors.muted = `rgba(${r},${g},${b},0.3)`;
    }
    const { fg, bg, muted } = colors;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Keep camera centered on player even in idle/dead
    if (gs.status === "idle") {
      const targetCamY = gs.playerY - h * 0.5;
      if (Math.abs(targetCamY - gs.cameraY) > h * 0.3) {
        gs.cameraY = targetCamY;
      }
    }

    if (gs.status === "running") {
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INC);
      gs.score += 1;

      // Move rails left
      for (const rail of gs.rails) rail.x -= gs.speed;

      if (gs.isGrinding) {
        let onRail = false;
        for (const rail of gs.rails) {
          const ry = getRailY(rail);
          if (ry !== null) {
            gs.playerY = ry;
            gs.lastSlope = rail.slope;
            gs.lastRailY = ry;
            gs.wheelAngle += gs.speed * 0.08;
            // Steep slopes speed you up, mellow/flat/uphill slopes drain speed
            const slopeAccel =
              (rail.slope - NEUTRAL_SLOPE) * SLOPE_SPEED_SCALE * 0.01;
            gs.speed = Math.min(MAX_SPEED, gs.speed + slopeAccel);

            // Stalled out — not enough speed to keep going
            if (gs.speed <= 0.2) {
              gs.speed = 0;
              gs.status = "dead";
              gs.flatTire = true;
              gs.deathTimer = 0;
              gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10));
              saveHi(gs.highScore);
            }
            onRail = true;
            break;
          }
        }
        if (!onRail) {
          // Left the rail — enter airborne with slope velocity
          gs.isGrinding = false;
          gs.velocityY = gs.speed * gs.lastSlope;
          gs.coyoteTimer = 0;
        }
      }

      if (!gs.isGrinding) {
        gs.coyoteTimer++;

        // Variable jump height — holding extends the jump
        if (gs.jumpHeld && gs.jumpHeldFrames < MAX_HOLD_FRAMES) {
          gs.velocityY += JUMP_HOLD_BOOST;
          gs.jumpHeldFrames++;
        }

        gs.velocityY += GRAVITY;
        gs.playerY += gs.velocityY;
        gs.wheelAngle += gs.speed * 0.06;

        // Check for rail landing
        if (gs.velocityY > 0) {
          for (const rail of gs.rails) {
            const ry = getRailY(rail);
            if (
              ry !== null &&
              gs.playerY >= ry - RAIL_TOLERANCE &&
              gs.playerY <= ry + RAIL_TOLERANCE
            ) {
              gs.isGrinding = true;
              gs.playerY = ry;
              gs.velocityY = 0;
              gs.lastSlope = rail.slope;
              gs.lastRailY = ry;
              gs.coyoteTimer = 999;
              gs.jumpHeldFrames = 0;
              break;
            }
          }
        }

        // Death: fallen too far below the last rail
        if (gs.playerY > gs.lastRailY + 120) {
          gs.status = "dead";
          gs.flatTire = true;
          gs.deathTimer = 0;
          gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10));
          saveHi(gs.highScore);
        }
      }

      // Camera: snap when far off (game start), otherwise smooth lerp
      const targetCamY = gs.playerY - h * 0.5;
      const camDist = Math.abs(targetCamY - gs.cameraY);
      if (camDist > h * 0.3) {
        gs.cameraY = targetCamY;
      } else {
        const lerpRate = gs.isGrinding ? 0.08 : 0.025;
        gs.cameraY += (targetCamY - gs.cameraY) * lerpRate;
      }

      // Spawn rails ahead
      const lastRail = gs.rails.at(-1);
      if (lastRail && lastRail.x + lastRail.width < w + 300) {
        gs.rails.push(...generateRailBatch(lastRail, gs.score));
      }
      gs.rails = gs.rails.filter((r) => r.x + r.width > -100);
    } else if (gs.status === "dead") {
      gs.deathTimer++;
      const fade = Math.max(0, 1 - gs.deathTimer / 15);
      for (const rail of gs.rails) rail.x -= gs.speed * fade;
      if (gs.deathTimer >= 15) setIsDead(true);
    }

    // --- Draw ---
    for (const rail of gs.rails) drawRail(ctx, rail, gs.cameraY, fg, bg);

    const psy = toSY(gs.playerY, gs.cameraY);
    const tilt =
      gs.status === "dead"
        ? Math.min(gs.deathTimer / 15, 1) * (Math.PI / 3)
        : 0;
    drawRider(
      ctx,
      PLAYER_X,
      psy,
      gs.wheelAngle,
      fg,
      gs.isGrinding,
      gs.flatTire,
      tilt,
    );

    // HUD
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
      ctx.fillText("press space or tap to ride", w / 2, h / 2);
    }
    if (gs.status === "dead" && gs.deathTimer >= 15) {
      ctx.fillStyle = fg;
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText(gs.speed <= 0 ? "stalled!" : "fell off!", w / 2, h / 2 - 10);
      ctx.font = "12px monospace";
      ctx.fillText("tap or press space to retry", w / 2, h / 2 + 10);
    }

    animRef.current = requestAnimationFrame(gameLoop);
  }, []);
  /* eslint-enable react-hooks/immutability */

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
  }, []);

  useEffect(() => {
    resizeCanvas();
    initRails();
    animRef.current = requestAnimationFrame(gameLoop);
    window.addEventListener("resize", resizeCanvas);
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
      window.removeEventListener("resize", resizeCanvas);
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameLoop, initRails, jump, releaseJump, resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 cursor-pointer select-none"
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
            <span className="md:hidden">tap to hop, hold for big jump</span>
            <span className="hidden md:inline">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space</kbd> tap to
              hop, hold for big jump
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
