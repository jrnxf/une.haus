import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { type Ref } from "react"

import { Field, FieldDescription, FieldLabel } from "~/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"

export function TourneyCodeField({
  value,
  onChange,
  onComplete,
  disabled,
  ref,
}: {
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
  disabled?: boolean
  ref?: Ref<HTMLInputElement>
}) {
  return (
    <Field>
      <FieldLabel>join</FieldLabel>
      <FieldDescription>enter the 4-digit code to watch live</FieldDescription>
      <InputOTP
        aria-label="tournament code"
        maxLength={4}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
        value={value}
        onChange={(v) => onChange(v.toUpperCase())}
        onComplete={onComplete}
        disabled={disabled}
        autoFocus
        autoComplete="off"
        ref={ref}
      >
        <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    </Field>
  )
}
