import { useCallback, useEffect, useRef, useState } from "react"

import {
  DEATH_FREEZE_FRAMES,
  DOUBLE_JUMP_FORCE,
  GROUND_Y_RATIO,
  JUMP_CUT,
  JUMP_FORCE,
  PLAYER_X,
  WHEEL_R,
} from "./constants"
import { drawFrame } from "./draw"
import {
  createCloud,
  createInitialState,
  resetGameState,
  spawnDoubleJumpPuff,
} from "./helpers"
import { type GameState } from "./types"
import { updateGameState } from "./update"

export function UnicycleGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDead, setIsDead] = useState(false)
  const stateRef = useRef<GameState>(createInitialState())
  const animRef = useRef<number>(0)
  const colorsRef = useRef({
    fg: "#000",
    bg: "#fff",
    muted: "rgba(0,0,0,0.3)",
    frame: 0,
  })

  const getGroundY = useCallback((canvas: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1
    return (canvas.height / dpr) * GROUND_Y_RATIO
  }, [])

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDead(false)
    resetGameState(stateRef.current, getGroundY(canvas))
  }, [getGroundY])

  const jump = useCallback(() => {
    const gs = stateRef.current
    if (!canvasRef.current) return

    if (gs.status === "idle") {
      resetGame()
      return
    }

    // Block input during death freeze countdown
    if (gs.status === "dead") {
      if (gs.deathFreezeTimer >= DEATH_FREEZE_FRAMES) {
        resetGame()
      }
      return
    }

    if (gs.isGrinding) {
      gs.velocityY = JUMP_FORCE
      gs.isAirborne = true
      gs.isGrinding = false
      gs.jumpHeld = true
    } else if (!gs.isAirborne) {
      gs.velocityY = JUMP_FORCE
      gs.isAirborne = true
      gs.jumpHeld = true
    } else if (gs.hasDoubleJump) {
      gs.velocityY = DOUBLE_JUMP_FORCE
      gs.hasDoubleJump = false
      gs.jumpHeld = true
      gs.seatSpinning = true
      gs.seatSpin = 0
      gs.seatSpinDir = Math.random() < 0.5 ? 1 : -1
      gs.dustParticles.push(...spawnDoubleJumpPuff(PLAYER_X, gs.playerY))
    }
  }, [resetGame])

  const releaseJump = useCallback(() => {
    const gs = stateRef.current
    if (gs.jumpHeld && gs.isAirborne && gs.velocityY < 0) {
      gs.velocityY *= JUMP_CUT
    }
    gs.jumpHeld = false
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const gs = stateRef.current
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const w = canvas.width / dpr
    const h = canvas.height / dpr
    const baseGroundY = h * GROUND_Y_RATIO

    // Recompute colors every 60 frames
    const colors = colorsRef.current
    colors.frame++
    if (colors.frame % 60 === 1) {
      const styles = getComputedStyle(canvas)
      colors.fg = styles.getPropertyValue("color") || "#000"
      colors.bg = styles.getPropertyValue("background-color") || "#fff"
      const tmp = document.createElement("canvas")
      tmp.width = 1
      tmp.height = 1
      const tmpCtx = tmp.getContext("2d")!
      tmpCtx.fillStyle = colors.fg
      tmpCtx.fillRect(0, 0, 1, 1)
      const [r, g, b] = tmpCtx.getImageData(0, 0, 1, 1).data
      colors.muted = `rgba(${r},${g},${b},0.3)`
    }
    const { fg, bg, muted } = colors

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, w, h)

    updateGameState(gs, baseGroundY, w, () => setIsDead(true))
    drawFrame(ctx, gs, w, h, baseGroundY, fg, bg, muted)

    animRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const gs = stateRef.current
    if (gs.status === "idle") {
      gs.playerY = getGroundY(canvas) - WHEEL_R
    }
  }, [getGroundY])

  useEffect(() => {
    resizeCanvas()
    const canvas = canvasRef.current
    if (canvas) {
      const dpr = window.devicePixelRatio || 1
      const logicalWidth = canvas.width / dpr
      stateRef.current.clouds = Array.from({ length: 3 }, () =>
        createCloud(logicalWidth),
      )
      stateRef.current.playerY = getGroundY(canvas) - WHEEL_R
    }

    animRef.current = requestAnimationFrame(gameLoop)
    const ro = new ResizeObserver(() => resizeCanvas())
    if (containerRef.current) ro.observe(containerRef.current)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault()
        jump()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        releaseJump()
      }
    }
    globalThis.addEventListener("keydown", handleKeyDown)
    globalThis.addEventListener("keyup", handleKeyUp)
    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      globalThis.removeEventListener("keydown", handleKeyDown)
      globalThis.removeEventListener("keyup", handleKeyUp)
    }
  }, [gameLoop, getGroundY, jump, releaseJump, resizeCanvas])

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 cursor-pointer touch-none items-center justify-center select-none"
      style={{ WebkitTouchCallout: "none" }}
      onPointerDown={jump}
      onPointerUp={releaseJump}
      onPointerCancel={releaseJump}
    >
      <canvas
        ref={canvasRef}
        className="bg-background text-foreground h-full w-full"
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
            want the real deal? play{" "}
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
  )
}
