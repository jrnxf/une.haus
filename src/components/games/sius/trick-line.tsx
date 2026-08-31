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
  description?: string
  includeYourSet?: boolean
}

export function TrickLine({
  tricks,
  className,
  description = "tricks landed in this set",
  includeYourSet = false,
}: TrickLineProps) {
  if (tricks.length === 0) {
    return null
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div>
        {description ? (
          <p className="text-muted-foreground mb-3 text-sm font-medium">
            {description}
          </p>
        ) : null}
        <ol className="space-y-2">
          {tricks.map((trick) => (
            <li key={trick.id}>
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-sm">
                  {trick.position}. {trick.name}
                </p>
              </div>
            </li>
          ))}
          {includeYourSet && (
            <li className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {tricks.length + 1}. your set
                </p>
              </div>
            </li>
          )}
        </ol>
      </div>
    </div>
  )
}
