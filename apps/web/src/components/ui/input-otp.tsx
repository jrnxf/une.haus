import { OTPField } from "@base-ui/react/otp-field"
import * as React from "react"

import { cn } from "~/lib/utils"

// Base UI's OTP Field spreads the value across N real `<input>` slots driven by
// `length` on the Root. The Root's ref points at its wrapping `<div>`, so the
// caller-supplied input `ref` and `autoFocus` are forwarded to the first slot's
// input through this internal context instead.
const InputOTPContext = React.createContext<{
  autoFocus: boolean
  inputRef?: React.Ref<HTMLInputElement>
}>({ autoFocus: false })

type InputOTPProps = Omit<
  React.ComponentProps<typeof OTPField.Root>,
  "length" | "onValueChange" | "onValueComplete" | "ref"
> & {
  /** Number of OTP slots. Mapped to Base UI's `length`. */
  maxLength: number
  /** Fired with the full value on every change. */
  onChange?: (value: string) => void
  /** Fired with the full value once every slot is filled. */
  onComplete?: (value: string) => void
  containerClassName?: string
  /** Forwarded to the first slot's input element. */
  ref?: React.Ref<HTMLInputElement>
}

function InputOTP({
  className,
  containerClassName,
  maxLength,
  onChange,
  onComplete,
  autoFocus = false,
  ref,
  children,
  validationType = "alphanumeric",
  ...props
}: InputOTPProps) {
  return (
    <InputOTPContext.Provider value={{ autoFocus, inputRef: ref }}>
      <OTPField.Root
        data-slot="input-otp"
        length={maxLength}
        onValueChange={(value) => onChange?.(value)}
        onValueComplete={(value) => onComplete?.(value)}
        validationType={validationType}
        className={cn(
          "flex items-center gap-2 has-disabled:opacity-50",
          containerClassName,
          className,
        )}
        {...props}
      >
        {children}
      </OTPField.Root>
    </InputOTPContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index = 0,
  className,
  ...props
}: Omit<React.ComponentProps<typeof OTPField.Input>, "ref"> & {
  index?: number
}) {
  const { autoFocus, inputRef } = React.useContext(InputOTPContext)
  const isFirst = index === 0

  return (
    <OTPField.Input
      data-slot="input-otp-slot"
      autoFocus={isFirst ? autoFocus : undefined}
      ref={isFirst ? inputRef : undefined}
      className={cn(
        "border-input dark:bg-input/30 relative flex h-9 w-9 items-center justify-center border-y border-r text-center text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md disabled:cursor-not-allowed sm:text-base",
        "focus:border-ring focus:z-10",
        "aria-invalid:border-destructive focus:aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot }
