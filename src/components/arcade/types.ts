export type StairRun = { count: number; totalW: number; totalH: number }

export type StairSegment =
  | { kind: "stairs"; run: StairRun }
  | { kind: "landing"; width: number }

export type RampSpike = { offset: number; width: number }

export type StairsetInfo = {
  rampW: number
  platW: number
  segments: StairSegment[]
  stairTotalW: number
  rampSpikes: RampSpike[]
  ascent: "ramp" | "stairs" | "curve"
  ascentSteps: number
  ascentStepHeights: number[]
}

export type TerrainPiece = {
  x: number
  width: number
  height: number
} & (
  | ({ type: "stairset" } & StairsetInfo)
  | { type: "spikes" }
  | { type: "gap" }
  | { type: "railGap"; railHeight: number; bobPhase: number }
  | {
      type: "rail"
      railHeight: number
      rampW: number
      platW: number
      gapW: number
      segments: StairSegment[]
      bobPhase: number
    }
  | { type: "bump"; count: number }
  | { type: "trampoline"; compression: number }
  | {
      type: "scooterKid"
      airborne: boolean
      grinding: boolean
      velY: number
      offsetY: number
      lastSurfY: number
    }
)

export type Cloud = {
  x: number
  y: number
  width: number
}

export type DustParticle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

export type SpeedLine = {
  x: number
  y: number
  length: number
}

export type CollectibleLetter = {
  x: number
  y: number
  letter: string
  index: number
  bobPhase: number
}

export type LightningBolt = {
  points: { x: number; y: number }[]
  branch: { x: number; y: number }[] | null
  life: number
  maxLife: number
}

export type Ufo = {
  x: number
  y: number
  speed: number
  bobPhase: number
}

export type GameState = {
  status: "idle" | "running" | "dead"
  playerY: number
  velocityY: number
  isAirborne: boolean
  isGrinding: boolean
  hasDoubleJump: boolean
  speed: number
  score: number
  highScore: number
  comboCount: number
  terrain: TerrainPiece[]
  clouds: Cloud[]
  dustParticles: DustParticle[]
  speedLines: SpeedLine[]
  nextSpawnIn: number
  groundOffset: number
  wheelAngle: number
  pedalAngle: number
  flatTire: boolean
  grindFrozenAngle: number
  jumpHeld: boolean
  deathTimer: number
  deathFreezeTimer: number
  deathSpeed: number
  milestoneTimer: number
  lastMilestone: number
  seatSpin: number
  seatSpinning: boolean
  seatSpinDir: 1 | -1
  letters: CollectibleLetter[]
  collectedLetters: boolean[]
  letterSpawnTimer: number
  bonusTimer: number
  lightning: LightningBolt[]
  fallingInGap: boolean
  hitScooterKid: boolean
  hitWall: boolean
  backflipAngle: number
  backflipActive: boolean
  ufos: Ufo[]
}
