import { createFileRoute, redirect } from "@tanstack/react-router"

// Absorbed by /land — the landing flow is the single video-submission entry
// point for tricks.
export const Route = createFileRoute("/_authed/tricks/$trickId/submit-video")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/tricks/$trickId/land", params })
  },
})
