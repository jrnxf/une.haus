import { type ReactNode } from "react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"

export function UploadDropZone({
  getRootProps,
  getInputProps,
  inputId,
  disabled,
  hasFile,
  children,
}: {
  getRootProps: () => object
  getInputProps: () => object
  inputId?: string
  disabled?: boolean
  hasFile?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      {/* the input lives outside the button — nesting one interactive
          control inside another is invalid; dropzone proxies clicks to it */}
      <input
        {...getInputProps()}
        id={inputId}
        aria-label="file upload"
        disabled={disabled || undefined}
      />
      <Button
        aria-label="file upload"
        className={cn(hasFile && "max-w-56")}
        type="button"
        variant="outline"
        {...getRootProps()}
        disabled={disabled || undefined}
      >
        {children}
      </Button>
    </div>
  )
}
