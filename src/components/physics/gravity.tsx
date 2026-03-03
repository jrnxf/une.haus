import {
  type Body,
  type IBodyDefinition,
  type Engine as MatterEngineType,
  type Render as MatterRenderType,
  type Runner as MatterRunnerType,
  type MouseConstraint,
} from "matter-js"
import {
  createContext,
  forwardRef,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import { calculatePosition, parsePathToVertices } from "./utils"
import { cn } from "~/lib/utils"

import type * as MatterJSNamespace from "matter-js"

// Lazy load Matter.js types
type MatterModule = typeof MatterJSNamespace
type MatterBody = Body
type MatterEngine = MatterEngineType
type MatterRender = MatterRenderType
type MatterRunner = MatterRunnerType
type MatterMouseConstraint = MouseConstraint
type MatterIBodyDefinition = IBodyDefinition

type GravityProps = {
  children: ReactNode
  debug?: boolean
  gravity?: { x: number; y: number }
  resetOnResize?: boolean
  grabCursor?: boolean
  addTopWall?: boolean
  autoStart?: boolean
  className?: string
}

type PhysicsBody = {
  element: HTMLElement
  body: MatterBody
  props: MatterBodyProps
}

type MatterBodyProps = {
  children: ReactNode
  matterBodyOptions?: MatterIBodyDefinition
  isDraggable?: boolean
  bodyType?: "rectangle" | "circle" | "svg"
  sampleLength?: number
  x?: number | string
  y?: number | string
  angle?: number
  className?: string
}

export type GravityRef = {
  start: () => void
  stop: () => void
  reset: () => void
  isReady: () => boolean
}

type GravityContextValue = {
  registerElement: (
    id: string,
    element: HTMLElement,
    props: MatterBodyProps,
  ) => void
  unregisterElement: (id: string) => void
}

const GravityContext = createContext<GravityContextValue | null>(null)

export function MatterBody({
  children,
  className,
  matterBodyOptions = {
    friction: 0.1,
    restitution: 0.5,
    density: 0.001,
    isStatic: false,
  },
  bodyType = "rectangle",
  isDraggable = true,
  sampleLength = 15,
  x = 0,
  y = 0,
  angle = 0,
}: MatterBodyProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const context = useContext(GravityContext)

  useEffect(() => {
    if (!elementRef.current || !context) return
    context.registerElement(id, elementRef.current, {
      children,
      matterBodyOptions,
      bodyType,
      sampleLength,
      isDraggable,
      x,
      y,
      angle,
    })

    return () => {
      context.unregisterElement(id)
    }
  }, [
    id,
    context,
    children,
    matterBodyOptions,
    bodyType,
    sampleLength,
    isDraggable,
    x,
    y,
    angle,
  ])

  return (
    <div
      ref={elementRef}
      className={cn(
        "absolute",
        className,
        isDraggable && "pointer-events-none",
      )}
    >
      {children}
    </div>
  )
}

export const Gravity = forwardRef<GravityRef, GravityProps>(
  (
    {
      children,
      debug = false,
      gravity = { x: 0, y: 1 },
      grabCursor = true,
      resetOnResize = true,
      addTopWall = false,
      autoStart = false,
      className,
    },
    ref,
  ) => {
    const canvas = useRef<HTMLDivElement>(null)
    const matterRef = useRef<MatterModule | null>(null)
    const engine = useRef<MatterEngine | null>(null)
    const render = useRef<MatterRender | null>(null)
    const runner = useRef<MatterRunner | null>(null)
    const bodiesMap = useRef(new Map<string, PhysicsBody>())
    const frameId = useRef<number | undefined>(undefined)
    const mouseConstraint = useRef<MatterMouseConstraint | null>(null)
    const mouseDown = useRef(false)
    const [isReady, setIsReady] = useState(false)
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
    const isRunning = useRef(false)
    const pendingRegistrations = useRef<
      { id: string; element: HTMLElement; props: MatterBodyProps }[]
    >([])

    // Lazy load Matter.js
    useEffect(() => {
      let mounted = true

      const loadMatter = async () => {
        const [Matter, decomp] = await Promise.all([
          import("matter-js"),
          import("poly-decomp"),
        ])

        if (!mounted) return

        matterRef.current = Matter
        Matter.Common.setDecomp(decomp)
        engine.current = Matter.Engine.create()
        setIsReady(true)
      }

      loadMatter()

      return () => {
        mounted = false
      }
    }, [])

    const registerElement = useCallback(
      (id: string, element: HTMLElement, props: MatterBodyProps) => {
        if (!canvas.current || !matterRef.current || !engine.current) {
          pendingRegistrations.current.push({ id, element, props })
          return
        }

        const Matter = matterRef.current
        const width = element.offsetWidth
        const height = element.offsetHeight
        const canvasRect = canvas.current.getBoundingClientRect()

        const angle = (props.angle || 0) * (Math.PI / 180)
        const x = calculatePosition(props.x, canvasRect.width, width)
        const y = calculatePosition(props.y, canvasRect.height, height)

        let body: MatterBody | undefined

        if (props.bodyType === "circle") {
          const radius = Math.max(width, height) / 2
          body = Matter.Bodies.circle(x, y, radius, {
            ...props.matterBodyOptions,
            angle,
            render: {
              fillStyle: debug ? "#888888" : "#00000000",
              strokeStyle: debug ? "#333333" : "#00000000",
              lineWidth: debug ? 3 : 0,
            },
          })
        } else if (props.bodyType === "svg") {
          const paths = element.querySelectorAll("path")
          const vertexSets: { x: number; y: number }[][] = []

          for (const path of paths) {
            const d = path.getAttribute("d")
            if (d) {
              const vertices = parsePathToVertices(d, props.sampleLength)
              vertexSets.push(vertices)
            }
          }

          if (vertexSets.length > 0) {
            body = Matter.Bodies.fromVertices(
              x,
              y,
              vertexSets as unknown as Matter.Vector[][],
              {
                ...props.matterBodyOptions,
                angle,
                render: {
                  fillStyle: debug ? "#888888" : "#00000000",
                  strokeStyle: debug ? "#333333" : "#00000000",
                  lineWidth: debug ? 3 : 0,
                },
              },
            )
          }
        } else {
          const bodyOptions = {
            ...props.matterBodyOptions,
            angle,
            render: {
              fillStyle: debug ? "#888888" : "#00000000",
              strokeStyle: debug ? "#333333" : "#00000000",
              lineWidth: debug ? 3 : 0,
            },
          }
          body = Matter.Bodies.rectangle(
            x,
            y,
            width,
            height,
            bodyOptions as Parameters<typeof Matter.Bodies.rectangle>[4],
          )
        }

        if (body) {
          Matter.World.add(engine.current?.world, [body])
          bodiesMap.current.set(id, { element, body, props })
        }
      },
      [debug],
    )

    const unregisterElement = useCallback((id: string) => {
      if (!matterRef.current || !engine.current) return
      const entry = bodiesMap.current.get(id)
      if (entry) {
        matterRef.current.World.remove(engine.current.world, entry.body)
        bodiesMap.current.delete(id)
      }
    }, [])

    const updateElements = useCallback(() => {
      for (const { element, body } of bodiesMap.current.values()) {
        const { x, y } = body.position
        const rotation = body.angle * (180 / Math.PI)
        element.style.transform = `translate(${x - element.offsetWidth / 2}px, ${y - element.offsetHeight / 2}px) rotate(${rotation}deg)`
      }
      frameId.current = requestAnimationFrame(updateElements)
    }, [])

    const startEngine = useCallback(() => {
      if (!matterRef.current || !runner.current || !engine.current) return
      const Matter = matterRef.current

      runner.current.enabled = true
      Matter.Runner.run(runner.current, engine.current)

      if (render.current) {
        Matter.Render.run(render.current)
      }

      frameId.current = requestAnimationFrame(updateElements)
      isRunning.current = true
    }, [updateElements])

    const initializeRenderer = useCallback(() => {
      if (!canvas.current || !matterRef.current || !engine.current) return

      const Matter = matterRef.current
      const height = canvas.current.offsetHeight
      const width = canvas.current.offsetWidth

      setCanvasSize({ width, height })

      engine.current.gravity.x = gravity.x
      engine.current.gravity.y = gravity.y

      render.current = Matter.Render.create({
        element: canvas.current,
        engine: engine.current,
        options: {
          width,
          height,
          wireframes: false,
          background: "#00000000",
        },
      })

      const mouse = Matter.Mouse.create(render.current.canvas)
      mouseConstraint.current = Matter.MouseConstraint.create(engine.current, {
        mouse,
        constraint: {
          stiffness: 0.2,
          render: { visible: debug },
        },
      })

      const walls = [
        // Floor
        Matter.Bodies.rectangle(width / 2, height + 10, width, 20, {
          isStatic: true,
          friction: 1,
          render: { visible: debug },
        }),
        // Right wall
        Matter.Bodies.rectangle(width + 10, height / 2, 20, height, {
          isStatic: true,
          friction: 1,
          render: { visible: debug },
        }),
        // Left wall
        Matter.Bodies.rectangle(-10, height / 2, 20, height, {
          isStatic: true,
          friction: 1,
          render: { visible: debug },
        }),
      ]

      if (addTopWall) {
        walls.push(
          Matter.Bodies.rectangle(width / 2, -10, width, 20, {
            isStatic: true,
            friction: 1,
            render: { visible: debug },
          }),
        )
      }

      const touchingMouse = () =>
        Matter.Query.point(
          engine.current?.world.bodies ?? [],
          mouseConstraint.current?.mouse.position || { x: 0, y: 0 },
        ).length > 0

      if (grabCursor && canvas.current) {
        const canvasEl = canvas.current

        Matter.Events.on(engine.current, "beforeUpdate", () => {
          if (!mouseDown.current && !touchingMouse()) {
            canvasEl.style.cursor = "default"
          } else if (touchingMouse()) {
            canvasEl.style.cursor = mouseDown.current ? "grabbing" : "grab"
          }
        })

        canvasEl.addEventListener("mousedown", () => {
          mouseDown.current = true
          canvasEl.style.cursor = touchingMouse() ? "grabbing" : "default"
        })

        canvasEl.addEventListener("mouseup", () => {
          mouseDown.current = false
          canvasEl.style.cursor = touchingMouse() ? "grab" : "default"
        })
      }

      Matter.World.add(engine.current.world, [
        mouseConstraint.current,
        ...walls,
      ])
      render.current.mouse = mouse
      runner.current = Matter.Runner.create()
      Matter.Render.run(render.current)
      updateElements()
      runner.current.enabled = false

      // Process pending registrations
      for (const reg of pendingRegistrations.current) {
        registerElement(reg.id, reg.element, reg.props)
      }
      pendingRegistrations.current = []

      if (autoStart) {
        runner.current.enabled = true
        startEngine()
      }
    }, [
      debug,
      gravity.x,
      gravity.y,
      grabCursor,
      addTopWall,
      autoStart,
      updateElements,
      registerElement,
      startEngine,
    ])

    const clearRenderer = useCallback(() => {
      if (!matterRef.current) return
      const Matter = matterRef.current

      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }

      if (mouseConstraint.current && engine.current) {
        Matter.World.remove(engine.current.world, mouseConstraint.current)
      }

      if (render.current) {
        Matter.Mouse.clearSourceEvents(render.current.mouse)
        Matter.Render.stop(render.current)
        render.current.canvas.remove()
      }

      if (runner.current) {
        Matter.Runner.stop(runner.current)
      }

      if (engine.current) {
        Matter.World.clear(engine.current.world, false)
        Matter.Engine.clear(engine.current)
      }

      bodiesMap.current.clear()
    }, [])

    const stopEngine = useCallback(() => {
      if (!isRunning.current || !matterRef.current) return
      const Matter = matterRef.current

      if (runner.current) {
        Matter.Runner.stop(runner.current)
      }
      if (render.current) {
        Matter.Render.stop(render.current)
      }
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
      isRunning.current = false
    }, [])

    const reset = useCallback(() => {
      stopEngine()
      for (const { element, body, props } of bodiesMap.current.values()) {
        if (!matterRef.current) continue
        const Matter = matterRef.current

        Matter.Body.setAngle(body, (props.angle || 0) * (Math.PI / 180))
        Matter.Body.setVelocity(body, { x: 0, y: 0 })
        Matter.Body.setAngularVelocity(body, 0)

        const x = calculatePosition(
          props.x,
          canvasSize.width,
          element.offsetWidth,
        )
        const y = calculatePosition(
          props.y,
          canvasSize.height,
          element.offsetHeight,
        )
        Matter.Body.setPosition(body, { x, y })
      }
      updateElements()
    }, [canvasSize.width, canvasSize.height, stopEngine, updateElements])

    useImperativeHandle(
      ref,
      () => ({
        start: startEngine,
        stop: stopEngine,
        reset,
        isReady: () => isReady,
      }),
      [startEngine, stopEngine, reset, isReady],
    )

    // Initialize when Matter.js is loaded
    useEffect(() => {
      if (isReady) {
        initializeRenderer()
        return clearRenderer
      }
    }, [isReady, initializeRenderer, clearRenderer])

    // Handle resize
    useEffect(() => {
      if (!resetOnResize || !isReady) return

      const handleResize = () => {
        if (!canvas.current) return
        clearRenderer()
        engine.current = matterRef.current?.Engine.create() ?? null
        initializeRenderer()
      }

      let timeoutId: ReturnType<typeof setTimeout>
      const debouncedResize = () => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(handleResize, 500)
      }

      window.addEventListener("resize", debouncedResize)
      return () => {
        window.removeEventListener("resize", debouncedResize)
        clearTimeout(timeoutId)
      }
    }, [resetOnResize, isReady, clearRenderer, initializeRenderer])

    return (
      <GravityContext.Provider value={{ registerElement, unregisterElement }}>
        <div
          ref={canvas}
          className={cn(className, "absolute top-0 left-0 h-full w-full")}
        >
          {children}
        </div>
      </GravityContext.Provider>
    )
  },
)

Gravity.displayName = "Gravity"
