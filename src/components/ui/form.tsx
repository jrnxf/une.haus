import { useBlocker } from "@tanstack/react-router"
import { BugIcon, Loader2Icon } from "lucide-react"
import * as React from "react"
import { createPortal } from "react-dom"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  type UseFormReturn,
  useFormContext,
} from "react-hook-form"

import { confirm } from "~/components/confirm-dialog"
import { Button, type ButtonProps } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import { Label } from "~/components/ui/label"
import { LazyCodeMirror } from "~/components/ui/lazy-codemirror"
import { Progress } from "~/components/ui/progress"
import { isProduction } from "~/lib/env"
import { invariant } from "~/lib/invariant"
import { useIsAdmin } from "~/lib/session/hooks"
import { Slot } from "~/lib/slot"
import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

type VideoUploadStatus = "idle" | number | "processing"
type ImageUploadStatus = "idle" | "pending"

type FormMediaProviderProps = {
  imageUploadStatus: ImageUploadStatus
  mediaUploadFileName?: string
  mediaUploadFileSizeBytes?: number
  videoUploadStatus: VideoUploadStatus
  setImageUploadStatus: (status: ImageUploadStatus) => void
  setMediaUploadFileName: (name: string | undefined) => void
  setMediaUploadFileSizeBytes: (bytes: number | undefined) => void
  setVideoUploadStatus: (status: VideoUploadStatus) => void
  isMediaUploading: boolean
}

const FormMediaContext = React.createContext<FormMediaProviderProps>({
  imageUploadStatus: "idle",
  mediaUploadFileName: undefined,
  mediaUploadFileSizeBytes: undefined,
  setImageUploadStatus: () => ({}),
  setMediaUploadFileName: () => ({}),
  setMediaUploadFileSizeBytes: () => ({}),
  setVideoUploadStatus: () => ({}),
  isMediaUploading: false,
  videoUploadStatus: "idle",
})

const useFormMedia = () => {
  const context = React.useContext(FormMediaContext)
  invariant(context, "useFormMedia must be used within a FormMediaProvider")
  return context
}

function FormMediaProvider({ children }: { children: React.ReactNode }) {
  const [videoUploadStatus, setVideoUploadStatus] =
    React.useState<VideoUploadStatus>("idle")
  const [imageUploadStatus, setImageUploadStatus] =
    React.useState<ImageUploadStatus>("idle")
  const [mediaUploadFileName, setMediaUploadFileName] = React.useState<
    string | undefined
  >(undefined)
  const [mediaUploadFileSizeBytes, setMediaUploadFileSizeBytes] =
    React.useState<number | undefined>(undefined)

  const shouldBlock =
    videoUploadStatus !== "idle" || imageUploadStatus !== "idle"

  React.useEffect(() => {
    if (!shouldBlock) {
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
    }
  }, [shouldBlock])

  useBlocker({
    enableBeforeUnload: shouldBlock,
    shouldBlockFn: () => shouldBlock,
  })

  return (
    <FormMediaContext.Provider
      value={{
        imageUploadStatus,
        mediaUploadFileName,
        mediaUploadFileSizeBytes,
        videoUploadStatus,
        isMediaUploading:
          imageUploadStatus !== "idle" || videoUploadStatus !== "idle",
        setImageUploadStatus,
        setMediaUploadFileName,
        setMediaUploadFileSizeBytes,
        setVideoUploadStatus,
      }}
    >
      {children}
    </FormMediaContext.Provider>
  )
}

function FormNavigationBlock() {
  const { formState } = useFormContext()
  const { videoUploadStatus, imageUploadStatus } = useFormMedia()

  const isVideoUploading = videoUploadStatus !== "idle"
  const isImageUploading = imageUploadStatus !== "idle"

  const shouldBlock =
    isProduction &&
    (isVideoUploading ||
      isImageUploading ||
      (formState.isDirty && !formState.isSubmitSuccessful))

  const blocker = useBlocker({
    enableBeforeUnload: shouldBlock,
    shouldBlockFn: () => shouldBlock,
    withResolver: true,
  })

  const dialogOpenRef = React.useRef(false)

  React.useEffect(() => {
    if (blocker.status !== "blocked" || dialogOpenRef.current) return

    const isUploadInProgress = isVideoUploading || isImageUploading

    dialogOpenRef.current = true
    confirm.open({
      title: isUploadInProgress ? "upload in progress" : "leave page?",
      description: isUploadInProgress
        ? "Leaving now will interrupt the upload. Are you sure you want to leave?"
        : "You have unsaved changes. Are you sure you want to leave?",
      confirmText: isUploadInProgress ? "leave anyway" : "leave",
      cancelText: "stay",
      variant: "destructive",
      onConfirm: () => {
        dialogOpenRef.current = false
        blocker.proceed?.()
      },
      onCancel: () => {
        dialogOpenRef.current = false
        blocker.reset?.()
      },
    })
  }, [blocker, isVideoUploading, isImageUploading])

  return null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function FormUploadStatus() {
  const {
    imageUploadStatus,
    isMediaUploading,
    mediaUploadFileName,
    mediaUploadFileSizeBytes,
    videoUploadStatus,
  } = useFormMedia()
  const media = {
    imageUploadStatus,
    mediaUploadFileName,
    mediaUploadFileSizeBytes,
    videoUploadStatus,
  }
  const [isPresent, setIsPresent] = React.useState(isMediaUploading)
  const [isOpen, setIsOpen] = React.useState(isMediaUploading)
  const [lastVisibleMedia, setLastVisibleMedia] = React.useState({
    imageUploadStatus,
    mediaUploadFileName,
    mediaUploadFileSizeBytes,
    videoUploadStatus,
  })
  const closeTimerRef = React.useRef<number | undefined>(undefined)
  const ANIMATION_MS = 200

  React.useEffect(() => {
    if (isMediaUploading) {
      setLastVisibleMedia({
        imageUploadStatus,
        mediaUploadFileName,
        mediaUploadFileSizeBytes,
        videoUploadStatus,
      })
    }
  }, [
    imageUploadStatus,
    isMediaUploading,
    mediaUploadFileName,
    mediaUploadFileSizeBytes,
    videoUploadStatus,
  ])

  React.useEffect(() => {
    if (isMediaUploading) {
      if (closeTimerRef.current !== undefined) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = undefined
      }
      setIsPresent(true)
      window.requestAnimationFrame(() => {
        setIsOpen(true)
      })
      return
    }

    setIsOpen(false)
    closeTimerRef.current = window.setTimeout(() => {
      setIsPresent(false)
      closeTimerRef.current = undefined
    }, ANIMATION_MS)

    return () => {
      if (closeTimerRef.current !== undefined) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = undefined
      }
    }
  }, [isMediaUploading])

  if (!isPresent) {
    return null
  }

  if (typeof document === "undefined") {
    return null
  }

  const displayMedia = isMediaUploading ? media : lastVisibleMedia
  const videoUploadState = displayMedia.videoUploadStatus
  const isVideoUploading = typeof videoUploadState === "number"
  const isVideoProcessing = videoUploadState === "processing"
  const progressValue = isVideoUploading
    ? Math.max(0, Math.min(100, videoUploadState))
    : 0
  const showProgressBar = isVideoUploading && progressValue < 100
  const fileLabel = displayMedia.mediaUploadFileName ?? "uploading media"
  const statusLabel = isVideoProcessing
    ? "processing"
    : isVideoUploading
      ? `uploading ${progressValue}%`
      : displayMedia.imageUploadStatus === "pending"
        ? "uploading"
        : ""

  const uploadedBytes =
    displayMedia.mediaUploadFileSizeBytes && isVideoUploading
      ? Math.round(
          (displayMedia.mediaUploadFileSizeBytes * progressValue) / 100,
        )
      : undefined
  const sizeMeta = displayMedia.mediaUploadFileSizeBytes
    ? uploadedBytes !== undefined
      ? `${formatBytes(uploadedBytes)} / ${formatBytes(displayMedia.mediaUploadFileSizeBytes)}`
      : formatBytes(displayMedia.mediaUploadFileSizeBytes)
    : undefined

  return createPortal(
    <>
      <div
        className={cn(
          "bg-background/50 pointer-events-auto fixed inset-0 duration-200",
          isOpen ? "animate-in fade-in-0" : "animate-out fade-out-0",
        )}
        style={{ zIndex: "var(--z-tooltip)" }}
        aria-hidden
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-4 flex justify-center px-4 duration-200",
          isOpen
            ? "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
            : "animate-out fade-out-0 zoom-out-95 slide-out-to-bottom-2",
        )}
        style={{ zIndex: "calc(var(--z-tooltip) + 1)" }}
      >
        <div className="border-input bg-background w-full max-w-lg rounded-md border px-3 py-2 shadow-md">
          <p className="truncate text-sm font-medium">{fileLabel}</p>

          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-out",
              showProgressBar
                ? "mt-1 max-h-2 opacity-100"
                : "mt-0 max-h-0 opacity-0",
            )}
          >
            <Progress value={progressValue} />
          </div>

          <div className="mt-1 h-4">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span className="truncate pr-2 tracking-tight">
                {sizeMeta ?? ""}
              </span>
              {statusLabel && (
                <span className="inline-flex items-center gap-1">
                  <span>{statusLabel}</span>
                  {(isVideoProcessing ||
                    displayMedia.imageUploadStatus === "pending") && (
                    <Loader2Icon className="size-3 animate-spin" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

type FormProps<TFieldValues extends FieldValues> = {
  rhf: UseFormReturn<TFieldValues>
} & React.FormHTMLAttributes<HTMLFormElement>

function Form<TFieldValues extends FieldValues>({
  children,
  rhf,
  ...props
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...rhf}>
      <FormMediaProvider>
        <FormNavigationBlock />
        <FormUploadStatus />
        <form {...props}>{children}</form>
      </FormMediaProvider>
    </FormProvider>
  )
}

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formLabelId: `${id}-form-item-label`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

function FormItem({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  ref?: React.Ref<HTMLDivElement>
}) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      />
    </FormItemContext.Provider>
  )
}
FormItem.displayName = "FormItem"

function FormLabel({
  className,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Label> & {
  ref?: React.Ref<React.ElementRef<typeof Label>>
}) {
  const { formItemId, formLabelId } = useFormField()

  return (
    <Label
      ref={ref}
      id={formLabelId}
      className={cn("lowercase", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}
FormLabel.displayName = "FormLabel"

function FormControl({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof Slot> & {
  ref?: React.Ref<React.ElementRef<typeof Slot>>
}) {
  const { error, formItemId, formLabelId, formDescriptionId, formMessageId } =
    useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-labelledby={formLabelId}
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : `${formDescriptionId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  )
}
FormControl.displayName = "FormControl"

function FormDescription({
  className,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>
}) {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}
FormDescription.displayName = "FormDescription"

function FormMessage({
  className,
  children,
  ref,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  ref?: React.Ref<HTMLParagraphElement>
}) {
  const { error, formMessageId } = useFormField()
  const body = error?.message ? String(error.message) : children

  if (!body) {
    return null
  }

  const normalizedBody = typeof body === "string" ? body.toLowerCase() : body

  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-destructive text-sm font-medium", className)}
      {...props}
    >
      {normalizedBody}
    </p>
  )
}
FormMessage.displayName = "FormMessage"

function FormSubmitButton({
  busy,
  busyText = "submitting",
  idleText = "submit",
  className,
  ...props
}: ButtonProps & {
  busy?: boolean
  busyText?: string
  idleText?: string
}) {
  const isAdmin = useIsAdmin()
  const { isMediaUploading } = useFormMedia()
  const disabled = busy || isMediaUploading

  const button = (
    <Button
      disabled={disabled}
      iconLeft={busy && <Loader2Icon className="size-4 animate-spin" />}
      type="submit"
      className={cn("self-start", className)}
      {...props}
    >
      <span>{busy ? busyText : idleText}</span>
    </Button>
  )

  if (isAdmin) {
    return (
      <ButtonGroup className="items-center">
        <ButtonGroup>
          <FormDebug />
        </ButtonGroup>
        <ButtonGroup>{button}</ButtonGroup>
      </ButtonGroup>
    )
  }

  return button
}

function FormCancelButton({
  disabled,
  type = "button",
  variant = "outline",
  ...props
}: ButtonProps) {
  const { isMediaUploading } = useFormMedia()

  return (
    <Button
      disabled={disabled || isMediaUploading}
      type={type}
      variant={variant}
      {...props}
    />
  )
}

function FormDebug() {
  const isAdmin = useIsAdmin()
  const { resolvedTheme } = useTheme()
  const {
    watch,
    formState: { errors },
  } = useFormContext()

  const values = watch()

  if (!isAdmin) {
    return null
  }

  return (
    <Drawer direction="bottom">
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="open debug panel"
        >
          <BugIcon className="size-4" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle className="sr-only">debug</DrawerTitle>
        <div className="m-4 min-h-0 grow overflow-auto rounded-lg border">
          <div className="pointer-events-none">
            <LazyCodeMirror
              value={JSON.stringify({ values, errors }, null, 2)}
              readOnly
              editable={false}
              theme={resolvedTheme ?? "dark"}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
            />
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMediaProvider,
  FormMessage,
  FormCancelButton,
  FormSubmitButton,
  useFormField,
  useFormMedia,
}
