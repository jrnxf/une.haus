import {
  BACKFLIP_FRAMES,
  CONE_H,
  DEATH_ANIM_FRAMES,
  DEATH_FREEZE_FRAMES,
  GRAVITY,
  INITIAL_SPEED,
  LETTER_BOB_AMPLITUDE,
  LETTER_BOB_SPEED,
  LETTER_BONUS,
  LETTER_BONUS_DISPLAY_FRAMES,
  LETTER_COLLECT_RADIUS,
  LETTER_SIZE,
  LETTER_SPAWN_INTERVAL,
  LETTER_WORD,
  MAX_SPAWN_GAP,
  MAX_SPEED,
  MILESTONE_DISPLAY_FRAMES,
  MILESTONE_INTERVAL,
  MIN_SPAWN_GAP,
  PLAYER_X,
  RAIL_GAP_BOB_SPEED,
  RAIL_OFFSET,
  RAIL_TOLERANCE,
  RIDER_H,
  SCOOTER_KID_H,
  SCOOTER_KID_SPEED,
  SEAT_SPIN_SPEED,
  SPEED_INCREMENT,
  SPEED_LINE_THRESHOLD,
  TRAMPOLINE_JUMP_FORCE,
  WHEEL_R,
} from "./constants"
import {
  createCloud,
  randomBetween,
  spawnDust,
  spawnLightning,
} from "./helpers"
import {
  createTerrain,
  getDifficulty,
  getRailGapRailY,
  getStairsetRailY,
  getStandaloneRailY,
  getSurfaceY,
} from "./terrain"
import { type GameState } from "./types"

// ============================================================
// Sub-update: Dust Particles (always runs)
// ============================================================

function updateDustParticles(gs: GameState): void {
  for (const p of gs.dustParticles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1
    p.life--
  }
  gs.dustParticles = gs.dustParticles.filter((p) => p.life > 0)
}

// ============================================================
// Sub-update: Player Physics (grinding, airborne, on-ground)
// ============================================================

function updatePlayerPhysics(
  gs: GameState,
  baseGroundY: number,
  w: number,
): void {
  const surfaceY = getSurfaceY(PLAYER_X, baseGroundY, gs.terrain)

  if (gs.isGrinding) {
    updateGrinding(gs, baseGroundY, surfaceY)
  } else if (gs.isAirborne) {
    updateAirborne(gs, baseGroundY, surfaceY, w)
  } else {
    updateOnGround(gs, surfaceY)
  }
}

function updateGrinding(
  gs: GameState,
  baseGroundY: number,
  surfaceY: number,
): void {
  let onRail = false
  for (const t of gs.terrain) {
    let railY: number | null = null
    switch (t.type) {
      case "stairset": {
        railY = getStairsetRailY(PLAYER_X, baseGroundY, t)
        break
      }
      case "railGap": {
        railY = getRailGapRailY(PLAYER_X, baseGroundY, t)
        break
      }
      case "rail": {
        railY = getStandaloneRailY(PLAYER_X, baseGroundY, t)
        break
      }
    }
    if (railY !== null) {
      gs.playerY = railY
      onRail = true
      break
    }
  }
  if (!onRail) {
    gs.isGrinding = false
    gs.comboCount = 0
    gs.hasDoubleJump = true
    const overGap = gs.terrain.some(
      (t) =>
        ((t.type === "railGap" || t.type === "gap") &&
          PLAYER_X > t.x &&
          PLAYER_X < t.x + t.width) ||
        (t.type === "rail" &&
          PLAYER_X > t.x + t.rampW + t.platW &&
          PLAYER_X < t.x + t.width),
    )
    if (overGap || gs.playerY + WHEEL_R < surfaceY - 2) {
      gs.isAirborne = true
      gs.velocityY = 0
    } else {
      gs.isAirborne = false
      gs.playerY = surfaceY - WHEEL_R
    }
  }
}

function updateAirborne(
  gs: GameState,
  baseGroundY: number,
  surfaceY: number,
  w: number,
): void {
  gs.velocityY += GRAVITY
  gs.playerY += gs.velocityY

  // Check for rail landing
  if (gs.velocityY > 0) {
    for (const t of gs.terrain) {
      let railY: number | null = null
      switch (t.type) {
        case "stairset": {
          railY = getStairsetRailY(PLAYER_X, baseGroundY, t)
          break
        }
        case "railGap": {
          railY = getRailGapRailY(PLAYER_X, baseGroundY, t)
          break
        }
        case "rail": {
          railY = getStandaloneRailY(PLAYER_X, baseGroundY, t)
          break
        }
      }
      const prevY = gs.playerY - gs.velocityY
      if (
        railY !== null &&
        prevY <= railY &&
        gs.playerY >= railY - RAIL_TOLERANCE
      ) {
        gs.isGrinding = true
        gs.playerY = railY
        gs.velocityY = 0
        gs.grindFrozenAngle = gs.wheelAngle
        gs.comboCount++
        gs.hasDoubleJump = true
        gs.seatSpinning = false
        gs.seatSpin = 0
        gs.lightning.push(spawnLightning(w, baseGroundY))
        break
      }
    }
  }

  // Don't land on invisible ground over a gap
  const overAnyGap = gs.terrain.some(
    (t) =>
      ((t.type === "gap" || t.type === "railGap") &&
        PLAYER_X > t.x + 4 &&
        PLAYER_X < t.x + t.width - 4) ||
      (t.type === "rail" &&
        PLAYER_X > t.x + t.rampW + t.platW + 4 &&
        PLAYER_X < t.x + t.width - 4),
  )

  if (!gs.isGrinding && !overAnyGap && gs.playerY + WHEEL_R >= surfaceY) {
    // Check if landing on a trampoline
    const onTrampoline = gs.terrain.some(
      (t) =>
        t.type === "trampoline" && PLAYER_X >= t.x && PLAYER_X <= t.x + t.width,
    )

    if (onTrampoline) {
      const tramp = gs.terrain.find(
        (t) =>
          t.type === "trampoline" &&
          PLAYER_X >= t.x &&
          PLAYER_X <= t.x + t.width,
      )
      if (tramp && tramp.type === "trampoline") tramp.compression = 1
      gs.playerY = surfaceY - WHEEL_R
      gs.velocityY = TRAMPOLINE_JUMP_FORCE
      gs.isAirborne = true
      gs.hasDoubleJump = true
      gs.backflipActive = true
      gs.backflipAngle = 0
      gs.seatSpinning = false
      gs.seatSpin = 0
      gs.comboCount = 0
      gs.dustParticles.push(
        ...spawnDust(PLAYER_X, surfaceY - WHEEL_R),
        ...spawnDust(PLAYER_X, surfaceY - WHEEL_R),
      )
    } else {
      // Normal landing
      if (gs.isAirborne) {
        gs.dustParticles.push(...spawnDust(PLAYER_X, surfaceY - WHEEL_R))
        gs.comboCount = 0
      }
      gs.playerY = surfaceY - WHEEL_R
      gs.velocityY = 0
      gs.isAirborne = false
      gs.hasDoubleJump = true
      gs.seatSpinning = false
      gs.seatSpin = 0
      gs.backflipActive = false
      gs.backflipAngle = 0
    }
  }
}

function updateOnGround(gs: GameState, surfaceY: number): void {
  const newY = surfaceY - WHEEL_R
  if (newY - gs.playerY > 6) {
    gs.isAirborne = true
    gs.velocityY = 0
    gs.hasDoubleJump = true
  } else {
    gs.playerY = newY
  }
}

// ============================================================
// Sub-update: Animations
// ============================================================

function updateAnimations(gs: GameState): void {
  // Seat spin (unispin)
  if (gs.seatSpinning) {
    gs.seatSpin += SEAT_SPIN_SPEED * gs.seatSpinDir
    if (Math.abs(gs.seatSpin) >= Math.PI * 2) {
      gs.seatSpin = 0
      gs.seatSpinning = false
    }
  }

  // Backflip
  if (gs.backflipActive) {
    gs.backflipAngle += (Math.PI * 2) / BACKFLIP_FRAMES
    if (gs.backflipAngle >= Math.PI * 2) {
      gs.backflipActive = false
      gs.backflipAngle = 0
    }
  }

  // Wheel + pedal
  if (gs.isGrinding) {
    gs.wheelAngle = gs.grindFrozenAngle
    gs.pedalAngle = gs.grindFrozenAngle
  } else if (gs.isAirborne) {
    gs.wheelAngle += gs.speed * 0.08
  } else {
    gs.wheelAngle += gs.speed * 0.08
    gs.pedalAngle += gs.speed * 0.04
  }
}

// ============================================================
// Sub-update: Speed Lines
// ============================================================

function updateSpeedLines(gs: GameState, w: number, baseGroundY: number): void {
  if (gs.speed > SPEED_LINE_THRESHOLD) {
    const intensity =
      (gs.speed - SPEED_LINE_THRESHOLD) / (MAX_SPEED - SPEED_LINE_THRESHOLD)
    if (Math.random() < intensity * 0.4) {
      gs.speedLines.push({
        x: w + 10,
        y: randomBetween(20, baseGroundY - 10),
        length: randomBetween(20, 50) * intensity + 10,
      })
    }
  }
  for (const line of gs.speedLines) {
    line.x -= gs.speed * 1.5
  }
  gs.speedLines = gs.speedLines.filter((l) => l.x + l.length > 0)
}

// ============================================================
// Sub-update: Collision Detection
// ============================================================

function checkCollisions(gs: GameState, baseGroundY: number): void {
  const playerLeft = PLAYER_X - 8
  const playerRight = PLAYER_X + 8
  const playerBottom = gs.playerY + WHEEL_R

  // Scooter kid collisions always apply (even while grinding)
  for (const t of gs.terrain) {
    if (t.type === "scooterKid") {
      const kidGroundY = getSurfaceY(t.x + t.width / 2, baseGroundY, gs.terrain)
      const kidTop = kidGroundY + t.offsetY - SCOOTER_KID_H
      if (
        playerRight > t.x + 2 &&
        playerLeft < t.x + t.width - 2 &&
        playerBottom > kidTop
      ) {
        console.debug("death: scooter kid collision")
        triggerDeath(gs, true, false, true)
        return
      }
    }
  }

  // Skip remaining collision checks while grinding
  if (gs.isGrinding) return

  for (const t of gs.terrain) {
    if (t.type === "spikes") {
      if (
        playerRight > t.x + 2 &&
        playerLeft < t.x + t.width - 2 &&
        playerBottom >= baseGroundY - 2
      ) {
        console.debug("death: ground spikes")
        triggerDeath(gs, true, false, false)
        break
      }
    } else if (t.type === "stairset" && t.ascent === "stairs") {
      // Wall collision for 90-degree step faces
      const stepW = t.rampW / t.ascentSteps
      let cumH = 0
      for (let i = 0; i < t.ascentSteps; i++) {
        cumH += t.ascentStepHeights[i]
        const stepWallX = t.x + i * stepW
        const stepWallTop = baseGroundY - cumH
        if (
          playerRight > stepWallX - 2 &&
          playerLeft < stepWallX + 4 &&
          playerBottom > stepWallTop &&
          !gs.isAirborne
        ) {
          // Push terrain so rider's full visual body stops at the wall
          const visualRight = PLAYER_X + 16
          const overlap = visualRight - stepWallX
          if (overlap > 0) {
            for (const tp of gs.terrain) {
              tp.x += overlap
            }
          }
          console.debug("death: stair wall collision")
          gs.status = "dead"
          gs.hitWall = true
          gs.deathTimer = 0
          gs.deathSpeed = gs.speed
          gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10))
          break
        }
      }
      if (gs.status === "dead") break
    } else if (t.type === "stairset" && t.rampSpikes.length > 0) {
      // Ramp spikes collision
      for (const spike of t.rampSpikes) {
        const spikeLeft = t.x + spike.offset
        const spikeRight = t.x + spike.offset + spike.width
        if (playerRight > spikeLeft + 2 && playerLeft < spikeRight - 2) {
          const progress = (PLAYER_X - t.x) / t.rampW
          if (progress >= 0 && progress <= 1) {
            const rampSurfaceY =
              t.ascent === "curve"
                ? baseGroundY - Math.sin(progress * Math.PI * 0.5) * t.height
                : baseGroundY - progress * t.height
            if (
              playerBottom >= rampSurfaceY - CONE_H &&
              playerBottom <= rampSurfaceY + 2
            ) {
              console.debug("death: ramp spikes")
              triggerDeath(gs, true, false, false)
              break
            }
          }
        }
      }
      if (gs.status === "dead") break
    } else if (t.type === "rail") {
      // Rail gap portion
      const gapLeft = t.x + t.rampW + t.platW
      const gapRight = t.x + t.width
      if (
        playerRight > gapLeft + 4 &&
        playerLeft < gapRight - 4 &&
        !gs.isAirborne &&
        !gs.isGrinding &&
        playerBottom >= baseGroundY - 2
      ) {
        gs.isAirborne = true
        gs.velocityY = 0
        gs.hasDoubleJump = true
      }
      if (
        playerRight > gapLeft + 4 &&
        playerLeft < gapRight - 4 &&
        gs.isAirborne &&
        playerBottom > baseGroundY + 4
      ) {
        console.debug("death: fell in rail gap")
        triggerDeath(gs, false, true, false)
        break
      }
    } else if (t.type === "gap" || t.type === "railGap") {
      if (
        playerRight > t.x + 4 &&
        playerLeft < t.x + t.width - 4 &&
        !gs.isAirborne &&
        !gs.isGrinding &&
        playerBottom >= baseGroundY - 2
      ) {
        gs.isAirborne = true
        gs.velocityY = 0
        gs.hasDoubleJump = true
      }
      if (
        playerRight > t.x + 4 &&
        playerLeft < t.x + t.width - 4 &&
        gs.isAirborne &&
        playerBottom > baseGroundY + 4
      ) {
        console.debug(`death: fell in ${t.type}`)
        triggerDeath(gs, false, true, false)
        break
      }
    }
  }
}

function triggerDeath(
  gs: GameState,
  flatTire: boolean,
  fallingInGap: boolean,
  hitScooterKid: boolean,
): void {
  gs.status = "dead"
  gs.flatTire = flatTire
  gs.fallingInGap = fallingInGap
  gs.hitScooterKid = hitScooterKid
  gs.deathTimer = 0
  gs.deathSpeed = gs.speed
  gs.highScore = Math.max(gs.highScore, Math.floor(gs.score / 10))
}

// ============================================================
// Sub-update: Terrain Spawning & Movement
// ============================================================

function spawnAndMoveTerrain(gs: GameState, w: number): void {
  // Spawn
  const diff = getDifficulty(gs.score)
  gs.nextSpawnIn -= gs.speed
  if (gs.nextSpawnIn <= 0) {
    const last = gs.terrain.at(-1)
    let rightmostEdge = 0
    for (const t of gs.terrain) {
      rightmostEdge = Math.max(rightmostEdge, t.x + t.width)
    }
    const minX = rightmostEdge > 0 ? rightmostEdge + 80 : w + 20
    const spawnX = Math.max(w + 20, minX)
    gs.terrain.push(createTerrain(spawnX, last, gs.score))
    gs.nextSpawnIn =
      randomBetween(MIN_SPAWN_GAP, MAX_SPAWN_GAP) *
      diff.gapMultiplier *
      (INITIAL_SPEED / gs.speed)
  }

  // Move
  for (const t of gs.terrain) {
    t.x -= gs.speed
    if (t.type === "scooterKid") t.x -= SCOOTER_KID_SPEED
    if (t.type === "railGap") t.bobPhase += RAIL_GAP_BOB_SPEED
    if (t.type === "rail") t.bobPhase += RAIL_GAP_BOB_SPEED
    if (t.type === "trampoline" && t.compression > 0) {
      t.compression = Math.max(0, t.compression - 0.08)
    }
  }
}

// ============================================================
// Sub-update: Scooter Kid AI
// ============================================================

function updateScooterKids(gs: GameState, baseGroundY: number): void {
  for (const kid of gs.terrain) {
    if (kid.type !== "scooterKid") continue
    const kidCx = kid.x + kid.width / 2
    const surfY = getSurfaceY(kidCx, baseGroundY, gs.terrain)
    const LOOKAHEAD = 50

    let railY: number | null = null
    let overGap = false
    let jumpForce = 0
    for (const other of gs.terrain) {
      if (other === kid) continue

      switch (other.type) {
        case "railGap": {
          const rightEdge = other.x + other.width
          if (kidCx > other.x && kidCx < rightEdge) {
            overGap = true
            railY = getRailGapRailY(kidCx, baseGroundY, other)
          }
          if (kidCx < rightEdge + LOOKAHEAD && kidCx > rightEdge - 5) {
            const targetRailY = baseGroundY - other.railHeight - RAIL_OFFSET
            const heightNeeded = baseGroundY - targetRailY
            jumpForce = -Math.sqrt(2 * GRAVITY * heightNeeded) * 1.1
          }
          break
        }
        case "gap": {
          const rightEdge = other.x + other.width
          if (kidCx > other.x && kidCx < rightEdge) {
            overGap = true
          }
          if (kidCx < rightEdge + LOOKAHEAD && kidCx > rightEdge - 5) {
            const kidSpeed = gs.speed + SCOOTER_KID_SPEED
            const approachDist = kidCx - rightEdge
            const totalDist = other.width + Math.max(0, approachDist)
            const crossTime = totalDist / kidSpeed
            jumpForce = (-(GRAVITY * crossTime) / 2) * 1.3
            jumpForce = Math.min(jumpForce, -4)
          }
          break
        }
        case "spikes": {
          const rightEdge = other.x + other.width
          if (kidCx < rightEdge + LOOKAHEAD && kidCx > other.x - 10) {
            const spikeJump = -6
            if (spikeJump < jumpForce) jumpForce = spikeJump
          }
          break
        }
        case "rail": {
          const gapStartX = other.x + other.rampW + other.platW
          const gapEndX = other.x + other.width
          if (kidCx > gapStartX && kidCx < gapEndX) {
            overGap = true
          }
          const standaloneRailY = getStandaloneRailY(kidCx, baseGroundY, other)
          if (standaloneRailY !== null) {
            railY = standaloneRailY
          }
          if (kidCx < gapEndX + LOOKAHEAD && kidCx > gapEndX - 5) {
            const targetRailY = baseGroundY - RAIL_OFFSET
            const heightNeeded = baseGroundY - targetRailY
            jumpForce = -Math.sqrt(2 * GRAVITY * heightNeeded) * 1.3
          }
          break
        }
        case "stairset": {
          const stairRailY = getStairsetRailY(kidCx, baseGroundY, other)
          if (stairRailY !== null) railY = stairRailY

          if (other.rampSpikes.length > 0 && !kid.grinding && !kid.airborne) {
            const rampEndX = other.x + other.rampW
            if (kidCx < rampEndX + LOOKAHEAD && kidCx > other.x - 10) {
              const spikeJump = -6
              if (spikeJump < jumpForce) jumpForce = spikeJump
            }
          }

          const stairEndX = other.x + other.width
          if (
            kidCx < stairEndX + LOOKAHEAD &&
            kidCx > stairEndX - 5 &&
            !kid.grinding &&
            !kid.airborne
          ) {
            const bottomRailY = baseGroundY - RAIL_OFFSET
            const heightNeeded = baseGroundY - bottomRailY
            jumpForce = -Math.sqrt(2 * GRAVITY * heightNeeded) * 1.3
          }
          break
        }
        // No default
      }
    }

    if (kid.grinding) {
      if (railY === null) {
        kid.grinding = false
        kid.airborne = true
        kid.velY = 0
      } else {
        kid.offsetY = railY - surfY
      }
    } else if (kid.airborne) {
      kid.velY += GRAVITY
      kid.offsetY += kid.velY

      if (railY !== null) {
        const kidY = surfY + kid.offsetY
        if (kidY >= railY - 10 && kidY <= railY + 10) {
          kid.grinding = true
          kid.velY = 0
          kid.offsetY = railY - surfY
        }
      }

      if (overGap && kid.offsetY > 60) {
        kid.x = -9999
      }

      if (!overGap && kid.offsetY >= 0) {
        kid.airborne = false
        kid.velY = 0
        kid.offsetY = 0
      }
    } else {
      if (kid.lastSurfY > 0 && surfY - kid.lastSurfY > 6) {
        kid.airborne = true
        kid.velY = 0
        kid.offsetY = kid.lastSurfY - surfY
      } else {
        kid.offsetY = 0
      }

      if (jumpForce < 0 && !kid.airborne) {
        kid.airborne = true
        kid.velY = jumpForce
      } else if (overGap && !kid.airborne) {
        kid.airborne = true
        kid.velY = 0
      }
    }

    kid.lastSurfY = surfY
  }
}

// ============================================================
// Sub-update: Environment (clouds, UFOs, lightning)
// ============================================================

function updateEnvironment(
  gs: GameState,
  w: number,
  _baseGroundY: number,
): void {
  // Clouds
  for (const cloud of gs.clouds) {
    cloud.x -= gs.speed * 0.3
  }
  gs.clouds = gs.clouds.filter((c) => c.x + c.width > -20)
  if (gs.clouds.length < 4 && Math.random() < 0.01) {
    gs.clouds.push(createCloud(w, true))
  }

  // UFOs
  for (const ufo of gs.ufos) {
    ufo.x += ufo.speed
    ufo.bobPhase += 0.08
  }
  gs.ufos = gs.ufos.filter((u) => u.x > -40 && u.x < w + 40)
  if (gs.ufos.length === 0 && Math.random() < 0.0001) {
    const goingRight = Math.random() < 0.5
    gs.ufos.push({
      x: goingRight ? -30 : w + 30,
      y: randomBetween(15, 60),
      speed: goingRight ? randomBetween(3, 5) : -randomBetween(3, 5),
      bobPhase: randomBetween(0, Math.PI * 2),
    })
  }

  // Lightning
  for (const bolt of gs.lightning) {
    bolt.life--
  }
  gs.lightning = gs.lightning.filter((b) => b.life > 0)
}

// ============================================================
// Sub-update: Letter Collectibles
// ============================================================

function updateLetterCollectibles(
  gs: GameState,
  baseGroundY: number,
  w: number,
): void {
  // Spawn
  gs.letterSpawnTimer -= 1
  if (gs.letterSpawnTimer <= 0) {
    const nextIdx = gs.collectedLetters.indexOf(false)
    if (nextIdx !== -1 && gs.letters.length === 0) {
      const spawnX = w + 20
      const minWallClearance = RIDER_H
      let tooCloseToWall = false
      for (const t of gs.terrain) {
        if (t.type === "stairset" && t.ascent === "stairs") {
          const stepW = t.rampW / t.ascentSteps
          for (let i = 0; i < t.ascentSteps; i++) {
            const wallX = t.x + i * stepW
            if (Math.abs(spawnX - wallX) < minWallClearance) {
              tooCloseToWall = true
              break
            }
          }
        }
      }
      if (!tooCloseToWall) {
        gs.letters.push({
          x: spawnX,
          y: baseGroundY - randomBetween(40, 100),
          letter: LETTER_WORD[nextIdx],
          index: nextIdx,
          bobPhase: Math.random() * Math.PI * 2,
        })
      }
    }
    gs.letterSpawnTimer = LETTER_SPAWN_INTERVAL
  }

  // Move & constrain
  for (const l of gs.letters) {
    l.x -= gs.speed
    l.bobPhase += LETTER_BOB_SPEED
    const surfaceAtLetter = getSurfaceY(l.x, baseGroundY, gs.terrain)
    const minAboveSurface = LETTER_BOB_AMPLITUDE + LETTER_SIZE / 2 + 4
    l.y = Math.min(l.y, surfaceAtLetter - minAboveSurface)
    l.y = Math.min(l.y, baseGroundY - minAboveSurface)

    for (const t of gs.terrain) {
      if (t.type === "railGap") {
        const railY = getRailGapRailY(l.x, baseGroundY, t)
        if (railY !== null) {
          l.y = Math.min(l.y, railY - minAboveSurface)
        }
      } else if (t.type === "rail") {
        const railY = getStandaloneRailY(l.x, baseGroundY, t)
        if (railY !== null) {
          l.y = Math.min(l.y, railY - minAboveSurface)
        }
      }
    }
  }
  gs.letters = gs.letters.filter((l) => l.x > -30)

  // Collect
  const nextLetterIdx = gs.collectedLetters.indexOf(false)
  const riderTop = gs.playerY - WHEEL_R - 16 - 14 - 5 - 1
  const riderBottom = gs.playerY + WHEEL_R
  for (let i = gs.letters.length - 1; i >= 0; i--) {
    const l = gs.letters[i]
    const bobY = l.y + Math.sin(l.bobPhase) * LETTER_BOB_AMPLITUDE
    const clampedY = Math.max(riderTop, Math.min(riderBottom, bobY))
    const dx = PLAYER_X - l.x
    const dy = clampedY - bobY
    const dist = Math.hypot(dx, dy)
    if (dist < LETTER_COLLECT_RADIUS && l.index === nextLetterIdx) {
      gs.collectedLetters[l.index] = true
      gs.letters.splice(i, 1)
      gs.dustParticles.push(...spawnDust(l.x, bobY))
      if (gs.collectedLetters.every(Boolean)) {
        gs.score += LETTER_BONUS
        gs.bonusTimer = LETTER_BONUS_DISPLAY_FRAMES
        gs.collectedLetters = Array.from({
          length: LETTER_WORD.length,
        }).fill(false) as boolean[]
        gs.letters = []
      }
    }
  }
}

// ============================================================
// Main Update — orchestrates all sub-updates per frame
// ============================================================

export function updateGameState(
  gs: GameState,
  baseGroundY: number,
  w: number,
  onDeathComplete: () => void,
): void {
  // Dust always updates
  updateDustParticles(gs)

  if (gs.status === "running") {
    // Speed & score
    gs.speed = Math.min(MAX_SPEED, gs.speed + SPEED_INCREMENT)
    gs.score += 1
    gs.groundOffset += gs.speed

    // Milestone check
    const displayScore = Math.floor(gs.score / 10)
    const nextMilestone =
      Math.floor(displayScore / MILESTONE_INTERVAL) * MILESTONE_INTERVAL
    if (nextMilestone > gs.lastMilestone && nextMilestone > 0) {
      gs.lastMilestone = nextMilestone
      gs.milestoneTimer = MILESTONE_DISPLAY_FRAMES
    }
    if (gs.milestoneTimer > 0) gs.milestoneTimer--

    updatePlayerPhysics(gs, baseGroundY, w)
    updateAnimations(gs)
    updateSpeedLines(gs, w, baseGroundY)
    checkCollisions(gs, baseGroundY)

    // Stop animations if collision killed the player
    // (checkCollisions mutates gs.status, TS can't track this)
    if ((gs.status as string) === "dead") {
      gs.seatSpinning = false
      gs.seatSpin = 0
      gs.backflipActive = false
      gs.backflipAngle = 0
    }

    spawnAndMoveTerrain(gs, w)
    updateScooterKids(gs, baseGroundY)
    gs.terrain = gs.terrain.filter((t) => t.x + t.width > -50)
    updateEnvironment(gs, w, baseGroundY)
    updateLetterCollectibles(gs, baseGroundY, w)
    if (gs.bonusTimer > 0) gs.bonusTimer--
  } else if (gs.status === "dead" && gs.deathTimer < DEATH_ANIM_FRAMES) {
    // Death animation
    gs.deathTimer++

    if (gs.fallingInGap) {
      gs.velocityY += GRAVITY
      gs.playerY += gs.velocityY
      for (const t of gs.terrain) {
        t.x -= gs.deathSpeed
      }
      for (const l of gs.letters) {
        l.x -= gs.deathSpeed
      }
    }

    if (gs.milestoneTimer > 0) gs.milestoneTimer--
    if (gs.bonusTimer > 0) gs.bonusTimer--
  } else if (gs.status === "dead") {
    // Freeze phase
    gs.deathFreezeTimer++
    if (gs.deathFreezeTimer >= DEATH_FREEZE_FRAMES) {
      onDeathComplete()
    }
  }
}
