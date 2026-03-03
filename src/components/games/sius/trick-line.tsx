import { Link } from "@tanstack/react-router"

import { cn } from "~/lib/utils"

type Trick = {
  id: number
  name: string
  position: number
  user: {
    id: number
    name: string
  }
}

type TrickLineProps = {
  tricks: Trick[]
  className?: string
}

export function TrickLine({ tricks, className }: TrickLineProps) {
  if (tricks.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        <p className="text-muted-foreground mb-3 text-sm font-medium">
          your video must include the following tricks in order
        </p>
        <ol className="space-y-2">
          {tricks.map((trick, index) => (
            <li key={trick.id} className="flex items-start gap-2">
              <div className="flex size-5 shrink-0 items-center justify-center">
                <div className="size-3 rounded-full bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">{index + 1}.</span>{" "}
                  <span className="font-medium">{trick.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {" "}
                    by{" "}
                    <Link
                      to="/users/$userId"
                      params={{ userId: trick.user.id }}
                      className="hover:underline"
                    >
                      {trick.user.name}
                    </Link>
                  </span>
                </p>
              </div>
            </li>
          ))}
          <li className="flex items-start gap-2">
            <div className="flex size-5 shrink-0 items-center justify-center">
              <div className="size-3 rounded-full bg-yellow-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {tricks.length + 1}. your set
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}
