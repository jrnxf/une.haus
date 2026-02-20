import { useCallback, useEffect, useRef, useState } from "react";

const GRAVITY = 0.35;
const JUMP_FORCE = -7.5;
const INITIAL_SPEED = 3;
const MAX_SPEED = 6;
const SPEED_INC = 0.0003;
const PLAYER_X = 100;
const WHEEL_R = 10;
const RAIL_TOLERANCE = 15;
const SPIKE_H = 8;
const LS_KEY = "arcade-rail-plat-hi";

type RailObstacle = { offset: number; width: number };

type Rail = {
  x: number;
  y: number;
  width: number;
  slope: number;
  obstacles: RailObstacle[];
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

function generateRail(prev: Rail | null, score: number): Rail {
  if (!prev)
    return { x: PLAYER_X - 60, y: 250, width: 400, slope: 0, obstacles: [] };
  const endX = prev.x + prev.width;
  const t = Math.min(score / 25000, 1);
  const gap = randomBetween(60 + t * 20, 130 + t * 30);
  const width = Math.max(100, randomBetween(120, 300 - t * 60));
  const slope = randomBetween(-0.02, 0.06);
  // Big height changes — sometimes way up, sometimes down
  const yOff = randomBetween(-50 - t * 20, 30 + t * 10);
  const prevEndY = prev.y + prev.slope * prev.width;

  const obstacles: RailObstacle[] = [];
  // ~30% chance of obstacles on rails longer than 150
  if (width > 150 && Math.random() < 0.3 + t * 0.15) {
    const ow = randomBetween(20, 40);
    const minOff = width * 0.25;
    const maxOff = width * 0.75 - ow;
    if (maxOff > minOff) {
      obstacles.push({ offset: randomBetween(minOff, maxOff), width: ow });
    }
  }

  return { x: endX + gap, y: prevEndY + yOff, width, slope, obstacles };
}

function toSY(worldY: number, camY: number, h: number) {
  return worldY - camY + h * 0.45;
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

function drawRail(
  ctx: CanvasRenderingContext2D,
  rail: Rail,
  camY: number,
  h: number,
  fg: string,
  muted: string,
) {
  const sy = (wy: number) => toSY(wy, camY, h);
  const startSY = sy(rail.y);
  const endSY = sy(rail.y + rail.slope * rail.width);

  // Rail line
  ctx.strokeStyle = fg;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rail.x, startSY);
  ctx.lineTo(rail.x + rail.width, endSY);
  ctx.stroke();

  // Supports
  ctx.strokeStyle = muted;
  ctx.lineWidth = 1.5;
  const supportCount = Math.max(2, Math.floor(rail.width / 60));
  for (let i = 0; i <= supportCount; i++) {
    const p = i / supportCount;
    const px = rail.x + p * rail.width;
    const railSY = startSY + p * (endSY - startSY);
    ctx.beginPath();
    ctx.moveTo(px, railSY);
    ctx.lineTo(px, railSY + 30);
    ctx.stroke();
  }

  // Obstacles (spikes on rail)
  ctx.strokeStyle = fg;
  ctx.lineWidth = 2;
  for (const obs of rail.obstacles) {
    const spikeW = 8;
    const count = Math.floor(obs.width / spikeW);
    for (let i = 0; i < count; i++) {
      const ox = rail.x + obs.offset + i * spikeW;
      const p = (obs.offset + i * spikeW) / rail.width;
      const baseY = startSY + p * (endSY - startSY);
      ctx.beginPath();
      ctx.moveTo(ox, baseY);
      ctx.lineTo(ox + spikeW / 2, baseY - SPIKE_H);
      ctx.lineTo(ox + spikeW, baseY);
      ctx.stroke();
    }
  }
}

export function RailPlatformer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDead, setIsDead] = useState(false);
  const stateRef = useRef<GameState>({
    status: "idle",
    playerY: 250,
    velocityY: 0,
    isGrinding: false,
    speed: INITIAL_SPEED,
    score: 0,
    highScore: loadHi(),
    rails: [],
    cameraY: 150,
    wheelAngle: 0,
    deathTimer: 0,
    flatTire: false,
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
    gs.rails = [generateRail(null, 0)];
    for (let i = 0; i < 8; i++)
      gs.rails.push(generateRail(gs.rails.at(-1)!, 0));
    gs.playerY = gs.rails[0].y;
    gs.cameraY = gs.playerY - 120;
  }, []);

  const resetGame = useCallback(() => {
    setIsDead(false);
    const gs = stateRef.current;
    gs.status = "running";
    gs.velocityY = 0;
    gs.isGrinding = true;
    gs.speed = INITIAL_SPEED;
    gs.score = 0;
    gs.wheelAngle = 0;
    gs.deathTimer = 0;
    gs.flatTire = false;
    initRails();
  }, [initRails]);

  const jump = useCallback(() => {
    const gs = stateRef.current;
    if (gs.status === "idle" || gs.status === "dead") {
      resetGame();
      return;
    }
    if (gs.isGrinding) {
      gs.velocityY = JUMP_FORCE;
      gs.isGrinding = false;
    }
  }, [resetGame]);

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

    if (gs.status === "running") {
      gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INC);
      gs.score += 1;

      for (const rail of gs.rails) rail.x -= gs.speed;

      if (gs.isGrinding) {
        let onRail = false;
        for (const rail of gs.rails) {
          const ry = getRailY(rail);
          if (ry !== null) {
            gs.playerY = ry;
            gs.wheelAngle += gs.speed * 0.08;
            onRail = true;

            // Obstacle collision
            for (const obs of rail.obstacles) {
              const obsLeft = rail.x + obs.offset;
              const obsRight = obsLeft + obs.width;
              if (PLAYER_X + 8 > obsLeft && PLAYER_X - 8 < obsRight) {
                gs.status = "dead";
                gs.flatTire = true;
                gs.deathTimer = 0;
                gs.highScore = Math.max(
                  gs.highScore,
                  Math.floor(gs.score / 10),
                );
                saveHi(gs.highScore);
              }
            }
            break;
          }
        }
        if (!onRail) {
          gs.isGrinding = false;
          gs.velocityY = 1;
        }
      }

      if (!gs.isGrinding && gs.status === "running") {
        gs.velocityY += GRAVITY;
        gs.playerY += gs.velocityY;
        gs.wheelAngle += gs.speed * 0.06;

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
              break;
            }
          }
        }

        const screenPY = toSY(gs.playerY, gs.cameraY, h);
        if (screenPY > h + 80 || screenPY < -80) {
          gs.status = "dead";
          gs.flatTire = true;
          gs.deathTimer = 0;
          gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10));
          saveHi(gs.highScore);
        }
      }

      // Camera
      const targetCamY = gs.playerY - h * 0.45;
      const lerpRate = gs.isGrinding ? 0.08 : 0.04;
      gs.cameraY += (targetCamY - gs.cameraY) * lerpRate;

      const lastRail = gs.rails.at(-1);
      if (lastRail && lastRail.x + lastRail.width < w + 300) {
        gs.rails.push(generateRail(lastRail, gs.score));
      }
      gs.rails = gs.rails.filter((r) => r.x + r.width > -100);
    } else if (gs.status === "dead") {
      gs.deathTimer++;
      const fade = Math.max(0, 1 - gs.deathTimer / 30);
      for (const rail of gs.rails) rail.x -= gs.speed * fade;
      if (gs.deathTimer >= 30) setIsDead(true);
    }

    // --- Draw ---
    for (const rail of gs.rails) drawRail(ctx, rail, gs.cameraY, h, fg, muted);

    const psy = toSY(gs.playerY, gs.cameraY, h);
    const tilt =
      gs.status === "dead"
        ? Math.min(gs.deathTimer / 30, 1) * (Math.PI / 3)
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
    if (gs.status === "dead" && gs.deathTimer >= 30) {
      ctx.fillStyle = fg;
      ctx.font = "16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("flat tire!", w / 2, h / 2 - 10);
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
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    globalThis.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resizeCanvas);
      globalThis.removeEventListener("keydown", handleKey);
    };
  }, [gameLoop, initRails, jump, resizeCanvas]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 cursor-pointer select-none"
      onPointerDown={jump}
    >
      <canvas
        ref={canvasRef}
        className="text-foreground bg-background h-full w-full"
      />
      {!isDead && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-muted-foreground font-mono text-xs">
            <span className="md:hidden">
              tap to jump · hop obstacles · reach the next rail
            </span>
            <span className="hidden md:inline">
              <kbd className="bg-muted rounded px-1.5 py-0.5">space</kbd> to
              jump · hop obstacles · reach the next rail
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
