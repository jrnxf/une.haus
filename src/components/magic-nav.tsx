import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

const routes = [
  { label: "Users", to: "/users" },
  { label: "Posts", to: "/posts" },
  { label: "Games", to: "/games/rius/active" },
  { label: "Chat", to: "/chat" },
]

const DURATION = 120

export function MagicNav() {
  const [activeTarget, setActiveTarget] = useState<DOMRect>()
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>()
  const [isIn, setIsIn] = useState(false)

  const onChildNodeEnter: React.MouseEventHandler<HTMLButtonElement> = (
    event,
  ) => {
    if (timer) {
      clearTimeout(timer)
    }
    setIsIn(true)
    setActiveTarget(event.currentTarget.getBoundingClientRect())
  }

  return (
    <div>
      <div
        className={cn(
          "pointer-events-none absolute rounded-md transition-all ease-in-out",
          activeTarget && isIn
            ? "bg-black/10 dark:bg-white/10"
            : "bg-background",
        )}
        id="magic"
        style={
          activeTarget
            ? {
                animationDuration: `${DURATION}ms`,
                // opacity: isIn ? 0.25 : 0,
                height: activeTarget.height,
                left: activeTarget.left,
                top: activeTarget.top,
                transitionDuration: `${DURATION}ms`,
                width: activeTarget.width,
              }
            : {
                animationDuration: `${DURATION}ms`,
                transitionDuration: `${DURATION}ms`,
              }
        }
      />
      <div
        className="flex w-full cursor-pointer gap-1"
        onMouseLeave={() => {
          setIsIn(false)
          // set false immediately to start the fade out animation
          const timer = setTimeout(() => {
            // now that the animation has finished we can set the active
            // target to undefined since we no longer need its DomRect
            setActiveTarget(undefined)
            setTimer(undefined)
          }, DURATION)

          setTimer(timer)
        }}
      >
        <Button
          asChild
          className="absolute top-12 -left-40 z-10 origin-top-left transition-all focus:left-4"
        >
          <a href="#main-content">skip to content</a>
        </Button>
        {routes.map(({ label, to }) => (
          <Button
            asChild
            className="z-10"
            key={to}
            onMouseEnter={onChildNodeEnter}
            size="default"
            variant="unstyled"
          >
            <Link to={to}>{label}</Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
