import {
  DUST_COUNT,
  DUST_LIFE,
  INITIAL_SPEED,
  LETTER_SPAWN_INTERVAL,
  LETTER_WORD,
  LS_HIGH_SCORE_KEY,
  WHEEL_R,
} from "./constants"
import {
  type Cloud,
  type DustParticle,
  type GameState,
  type LightningBolt,
} from "./types"

// --- Random ---

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

export function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1))
}

// --- High Score Persistence ---

function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(LS_HIGH_SCORE_KEY)) || 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number) {
  try {
    localStorage.setItem(LS_HIGH_SCORE_KEY, String(score))
  } catch {
    /* ignore */
  }
}

// --- Particle Spawning ---

export function spawnDust(x: number, groundY: number): DustParticle[] {
  return Array.from({ length: DUST_COUNT }, () => ({
    x: x + randomBetween(-8, 8),
    y: groundY + WHEEL_R,
    vx: randomBetween(-2, 2),
    vy: randomBetween(-2.5, -0.5),
    life: DUST_LIFE,
  }))
}

export function spawnDoubleJumpPuff(
  x: number,
  playerY: number,
): DustParticle[] {
  return Array.from({ length: 4 }, () => ({
    x: x + randomBetween(-4, 4),
    y: playerY + WHEEL_R,
    vx: randomBetween(-1.5, 1.5),
    vy: randomBetween(1, 3),
    life: 10,
  }))
}

// --- Cloud ---

export function createCloud(canvasWidth: number, offscreen = false): Cloud {
  return {
    x: offscreen
      ? canvasWidth + randomBetween(20, 200)
      : randomBetween(0, canvasWidth),
    y: randomBetween(20, 80),
    width: randomBetween(40, 80),
  }
}

// --- Lightning ---

export function spawnLightning(
  canvasWidth: number,
  groundY: number,
): LightningBolt {
  const startX = randomBetween(40, canvasWidth - 40)
  const startY = randomBetween(5, 25)
  const endY = randomBetween(groundY * 0.25, groundY * 0.55)
  const points: { x: number; y: number }[] = [{ x: startX, y: startY }]
  const segments = randomInt(3, 5)
  const segmentH = (endY - startY) / segments

  let currentX = startX
  let dir = Math.random() < 0.5 ? -1 : 1
  for (let i = 1; i <= segments; i++) {
    currentX += dir * randomBetween(18, 50)
    currentX = Math.max(20, Math.min(canvasWidth - 20, currentX))
    points.push({ x: currentX, y: startY + segmentH * i })
    dir *= -1
  }

  let branch: { x: number; y: number }[] | null = null
  if (points.length > 2) {
    const branchIdx = randomInt(1, Math.min(points.length - 2, 2))
    const bp = points[branchIdx]
    const branchDir =
      branchIdx < points.length - 1
        ? points[branchIdx + 1].x > bp.x
          ? -1
          : 1
        : Math.random() < 0.5
          ? -1
          : 1
    branch = [
      { x: bp.x, y: bp.y },
      {
        x: bp.x + branchDir * randomBetween(10, 25),
        y: bp.y + randomBetween(10, 20),
      },
      {
        x: bp.x + branchDir * randomBetween(20, 40),
        y: bp.y + randomBetween(22, 38),
      },
    ]
  }

  const life = randomInt(4, 10)
  return { points, branch, life, maxLife: life }
}

// --- Player Lean ---

export function computeLean(gs: GameState): number {
  if (gs.isGrinding) return 5
  if (gs.isAirborne) {
    if (gs.velocityY < -3) return 1
    if (gs.velocityY < 0) return 2
    if (gs.velocityY > 3) return 5
    return 4
  }
  return 3
}

// --- State Factories ---

export function createInitialState(serverHighScore?: number): GameState {
  const localHighScore = loadHighScore()
  return {
    status: "idle",
    playerY: 0,
    velocityY: 0,
    isAirborne: false,
    isGrinding: false,
    hasDoubleJump: true,
    speed: INITIAL_SPEED,
    score: 0,
    highScore: Math.max(localHighScore, serverHighScore ?? 0),
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
    deathFreezeTimer: 0,
    deathSpeed: 0,
    milestoneTimer: 0,
    lastMilestone: 0,
    seatSpin: 0,
    seatSpinning: false,
    seatSpinDir: 1,
    letters: [],
    collectedLetters: Array.from({ length: LETTER_WORD.length }).fill(
      false,
    ) as boolean[],
    letterSpawnTimer: LETTER_SPAWN_INTERVAL,
    bonusTimer: 0,
    lightning: [],
    fallingInGap: false,
    hitScooterKid: false,
    hitWall: false,
    backflipAngle: 0,
    backflipActive: false,
    ufos: [],
  }
}

export function resetGameState(gs: GameState, groundY: number): void {
  gs.status = "running"
  gs.playerY = groundY - WHEEL_R
  gs.velocityY = 0
  gs.isAirborne = false
  gs.isGrinding = false
  gs.hasDoubleJump = true
  gs.speed = INITIAL_SPEED
  gs.score = 0
  gs.comboCount = 0
  gs.terrain = []
  gs.dustParticles = []
  gs.speedLines = []
  gs.nextSpawnIn = 200
  gs.groundOffset = 0
  gs.wheelAngle = 0
  gs.pedalAngle = 0
  gs.flatTire = false
  gs.grindFrozenAngle = 0
  gs.jumpHeld = false
  gs.deathTimer = 0
  gs.deathFreezeTimer = 0
  gs.deathSpeed = 0
  gs.milestoneTimer = 0
  gs.lastMilestone = 0
  gs.seatSpin = 0
  gs.seatSpinning = false
  gs.seatSpinDir = 1
  gs.letters = []
  gs.collectedLetters = Array.from({ length: LETTER_WORD.length }).fill(
    false,
  ) as boolean[]
  gs.letterSpawnTimer = LETTER_SPAWN_INTERVAL
  gs.bonusTimer = 0
  gs.lightning = []
  gs.fallingInGap = false
  gs.hitScooterKid = false
  gs.hitWall = false
  gs.backflipAngle = 0
  gs.backflipActive = false
}
