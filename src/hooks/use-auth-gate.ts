import { useLocation, useNavigate } from "@tanstack/react-router"

import { useSessionUser } from "~/lib/session/hooks"

export function useAuthGate() {
  const sessionUser = useSessionUser()
  const location = useLocation()
  const navigate = useNavigate()

  const authGate = (action: () => void) => {
    if (!sessionUser) {
      navigate({ to: "/auth", search: { redirect: location.href } })
      return
    }
    action()
  }

  return { sessionUser, authGate }
}
