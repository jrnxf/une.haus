import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/vault/valut/bak")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/vault/valut/bak"!</div>
}
