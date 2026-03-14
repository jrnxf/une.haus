import { StatusIndicator } from "~/components/ui/status"
import { useIsUserOnline } from "~/lib/ably-context"

export function UserOnlineStatus({ userId }: { userId: number }) {
  const online = useIsUserOnline(userId)
  if (!online) return null
  return (
    <div className="pr-1">
      {/* makes sure the online status is visible by adding a small padding since normally right aligned */}
      <StatusIndicator className="bg-green-500" />
    </div>
  )
}
