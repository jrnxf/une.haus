import {
  ErrorComponent,
  type ErrorComponentProps,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router"

export function CatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    select: (state) => state.id === rootRouteId,
    strict: false,
  })

  console.error(error)

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="bg-invert text-invert-foreground rounded px-2 py-1 font-extrabold uppercase"
          onClick={() => {
            router.invalidate()
          }}
        >
          Try Again
        </button>
        {isRoot ? (
          <Link
            className="bg-invert text-invert-foreground rounded px-2 py-1 font-extrabold uppercase"
            to="/"
          >
            Home
          </Link>
        ) : (
          <Link
            className="bg-invert text-invert-foreground rounded px-2 py-1 font-extrabold uppercase"
            onClick={(e) => {
              e.preventDefault()
              globalThis.history.back()
            }}
            to="/"
          >
            Go Back
          </Link>
        )}
      </div>
    </div>
  )
}
