import { type ReactNode } from "react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export function UploadDropZone({
  getRootProps,
  getInputProps,
  inputId,
  disabled,
  children,
}: {
  getRootProps: () => object
  getInputProps: () => object
  inputId?: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label="file upload"
        className={cn(
          "border-input ring-offset-background dark:bg-input/30 text-foreground relative inline-flex h-9 w-56 max-w-full items-center justify-start overflow-hidden rounded-md border bg-transparent px-3 py-1 text-base font-normal focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        )}
        style={{ borderColor: "var(--input)" }}
        type="button"
        variant="unstyled"
        {...getRootProps()}
        disabled={disabled || undefined}
      >
        <input
          {...getInputProps()}
          id={inputId}
          disabled={disabled || undefined}
        />
        {children}
      </Button>
    </div>
  )
}
