import * as React from "react"

import { cn, getCloudflareImageUrl, getUserInitials } from "~/lib/utils"

type ImageStatus = "loading" | "error" | "success" | "no-image"
const AvatarContext = React.createContext<{
  cloudflareId?: null | string
  alt: string
  imageStatus: ImageStatus
  setImageStatus: (imageStatus: ImageStatus) => void
}>({
  cloudflareId: undefined,
  alt: "",
  imageStatus: "loading",
  setImageStatus: () => {},
})

function useAvatar() {
  return React.useContext(AvatarContext)
}

function Avatar({
  className,
  cloudflareId,
  alt,
  ...props
}: React.ComponentProps<"div"> & {
  cloudflareId?: null | string
  alt: string
}) {
  const [imageStatus, setImageStatus] = React.useState<ImageStatus>(
    cloudflareId ? "loading" : "no-image",
  )
  return (
    <AvatarContext.Provider
      value={{ cloudflareId, alt, imageStatus, setImageStatus }}
    >
      <div
        data-slot="avatar"
        className={cn(
          "[container-type:size] relative flex size-8 shrink-0 overflow-hidden rounded-full",
          className,
        )}
        {...props}
      />
    </AvatarContext.Provider>
  )
}

function AvatarImage({
  className,
  width,
  quality,
  ...props
}: Omit<React.ComponentProps<"img">, "src" | "alt"> & {
  width: number
  quality: number
}) {
  const { cloudflareId, alt, setImageStatus, imageStatus } = useAvatar()

  if (!cloudflareId || imageStatus === "error") {
    return null
  }

  return (
    <img
      data-slot="avatar-image"
      className={cn("absolute inset-0 size-full object-cover", className)}
      src={getCloudflareImageUrl(cloudflareId, { width, quality })}
      onError={() => setImageStatus("error")}
      onLoad={() => setImageStatus("success")}
      alt={alt}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  name,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  name: string
}) {
  const { imageStatus } = useAvatar()

  if (imageStatus === "success" || imageStatus === "error") {
    return null
  }

  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-black/5 text-[40cqw] leading-none font-semibold text-black/50 uppercase dark:bg-white/10 dark:text-white/50",
        className,
      )}
      {...props}
    >
      {getUserInitials(name ?? "")}
    </span>
  )
}

export { Avatar, AvatarFallback, AvatarImage }
