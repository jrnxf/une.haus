import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/games/arcade")({
  beforeLoad: () => {
    throw redirect({ to: "/arcade", replace: true })
  },
})
