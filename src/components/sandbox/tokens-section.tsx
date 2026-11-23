import { Sample, SandboxSection } from "~/components/sandbox/sample"
import {
  COLOR_GROUPS,
  FONTS,
  RADII,
  SHADOWS,
  SPACING,
  TYPE_SCALE,
} from "~/components/sandbox/tokens"
import { cn } from "~/lib/utils"

export function TokensSection() {
  return (
    <SandboxSection id="tokens" title="tokens">
      <Sample title="colors" wide>
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="text-muted-foreground text-xs">{group.title}</p>
              <div className="space-y-1">
                {group.tokens.map((token) => (
                  <div key={token.name} className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-6 shrink-0 rounded-md border",
                        token.swatch,
                      )}
                    />
                    <code className="truncate font-mono text-xs">
                      {token.name}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sample>

      <Sample title="type">
        <div className="space-y-2">
          {TYPE_SCALE.map((step) => (
            <div key={step.name} className="flex items-baseline gap-2">
              <code className="text-muted-foreground w-20 shrink-0 font-mono text-xs">
                {step.name}
              </code>
              <span className={cn("truncate", step.className)}>
                the quick unicycle
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {FONTS.map((font) => (
            <div key={font.name} className="flex items-baseline gap-2">
              <code className="text-muted-foreground w-20 shrink-0 font-mono text-xs">
                {font.name}
              </code>
              <span className={cn("truncate text-sm", font.className)}>
                0123456789 abcdefghij
              </span>
            </div>
          ))}
        </div>
      </Sample>

      <Sample title="radius & shadow">
        <div className="flex flex-wrap gap-4">
          {RADII.map((radius) => (
            <div key={radius.name} className="flex flex-col items-center gap-1">
              <div
                className={cn("bg-muted size-12 border", radius.className)}
              />
              <code className="text-muted-foreground font-mono text-xs">
                {radius.name.replace("rounded-", "")}
              </code>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {SHADOWS.map((shadow) => (
            <div key={shadow.name} className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "bg-card size-12 rounded-md border",
                  shadow.className,
                )}
              />
              <code className="text-muted-foreground font-mono text-xs">
                {shadow.name.replace("shadow-", "")}
              </code>
            </div>
          ))}
        </div>
      </Sample>

      <Sample title="spacing">
        <p className="text-muted-foreground text-xs">
          gaps and stacks use only these steps
        </p>
        <div className="space-y-2">
          {SPACING.map((step) => (
            <div key={step.name} className="flex items-center gap-2">
              <code className="text-muted-foreground w-6 shrink-0 font-mono text-xs">
                {step.name}
              </code>
              <div
                className={cn("bg-primary h-4 rounded-sm", step.className)}
              />
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          padding: p-4 and p-6. page: mx-auto max-w-4xl p-4 md:p-6
        </p>
      </Sample>
    </SandboxSection>
  )
}
