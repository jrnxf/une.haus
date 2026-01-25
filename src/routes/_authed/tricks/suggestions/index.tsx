import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/tricks/suggestions/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/tricks/suggestions/"!</div>
}
