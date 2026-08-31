import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/tricks/glossary/")({
  beforeLoad: () => {
    throw redirect({ to: "/tricks/glossary/elements" })
  },
})
