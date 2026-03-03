import { type ReactNode } from "react"

import { Button } from "~/components/ui/button"

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
    <div className="flex h-32 items-center gap-2">
      <Button
        aria-label="file upload"
        className="border-border dark:bg-input/30 relative h-full w-full overflow-hidden rounded-md border-2 border-dashed bg-transparent"
        type="button"
        variant="unstyled"
        {...getRootProps()}
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
