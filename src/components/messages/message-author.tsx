import { Link } from "@tanstack/react-router"

export function MessageAuthor({
  message,
}: {
  message: { user: { id: number; name: string } }
}) {
  return (
    <Link
      className="ring-offset-background focus-visible:ring-ring mb-1 w-max rounded font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
      to={`/users/$userId`}
      params={{
        userId: message.user.id,
      }}
    >
      {message.user.name}
    </Link>
  )
}
