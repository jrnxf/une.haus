import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "~/components/ui/field"
import {
  Form,
  FormCancelButton,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Textarea } from "~/components/ui/textarea"

const LONG_TEXT =
  "a very long line of text with no natural break so we can see how the field wraps, scrolls or clips it when it does not fit: supercalifragilisticexpialidocious-unicycle-flatland-street-trials"

const MANY_OPTIONS = Array.from({ length: 30 }, (_, index) => ({
  value: `option-${index + 1}`,
  label: `option ${index + 1}`,
}))

export function FormSection() {
  return (
    <SandboxSection id="form" title="form">
      <InputSample />
      <TextareaSample />
      <SelectSample />
      <ChoiceSample />
      <OtpSample />
      <FieldLayoutSample />
      <HookFormSample />
    </SandboxSection>
  )
}

function InputSample() {
  return (
    <Sample title="input">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sandbox-name">name</FieldLabel>
          <Input id="sandbox-name" placeholder="enter your name" />
          <FieldDescription>your display name</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-email">email</FieldLabel>
          <Input
            id="sandbox-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-long">long value</FieldLabel>
          <Input id="sandbox-long" defaultValue={LONG_TEXT} />
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-disabled">disabled</FieldLabel>
          <Input id="sandbox-disabled" placeholder="can't edit this" disabled />
        </Field>
        <Field data-invalid="true">
          <FieldLabel htmlFor="sandbox-invalid">with error</FieldLabel>
          <Input
            id="sandbox-invalid"
            placeholder="invalid"
            aria-invalid="true"
            aria-describedby="sandbox-invalid-error"
          />
          <FieldError id="sandbox-invalid-error">
            this field is required
          </FieldError>
        </Field>
      </FieldGroup>
    </Sample>
  )
}

function TextareaSample() {
  return (
    <Sample title="textarea">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="sandbox-bio">default</FieldLabel>
          <Textarea id="sandbox-bio" placeholder="tell us about yourself" />
          <FieldDescription>max 200 characters</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-compact">compact</FieldLabel>
          <Textarea
            id="sandbox-compact"
            size="compact"
            placeholder="one row that grows as you type"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-long-textarea">long text</FieldLabel>
          <Textarea
            id="sandbox-long-textarea"
            defaultValue={`${LONG_TEXT}\n\n${LONG_TEXT}`}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sandbox-textarea-disabled">disabled</FieldLabel>
          <Textarea
            id="sandbox-textarea-disabled"
            placeholder="can't edit this"
            disabled
          />
        </Field>
        <Field data-invalid="true">
          <FieldLabel htmlFor="sandbox-textarea-invalid">with error</FieldLabel>
          <Textarea
            id="sandbox-textarea-invalid"
            aria-invalid="true"
            aria-describedby="sandbox-textarea-invalid-error"
            defaultValue="too short"
          />
          <FieldError id="sandbox-textarea-invalid-error">
            write at least 20 characters
          </FieldError>
        </Field>
      </FieldGroup>
    </Sample>
  )
}

function SelectSample() {
  return (
    <Sample title="select">
      <FieldGroup>
        <Field>
          <FieldLabel>default</FieldLabel>
          <Select defaultValue="general">
            <SelectTrigger aria-label="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="general">general</SelectItem>
                <SelectItem value="feedback">feedback</SelectItem>
                <SelectItem value="bug">bug report</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>small, with a placeholder</FieldLabel>
          <Select>
            <SelectTrigger size="sm" aria-label="small select">
              <SelectValue placeholder="pick one" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">alpha</SelectItem>
              <SelectItem value="b">beta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>long list & long item</FieldLabel>
          <Select defaultValue="long">
            <SelectTrigger aria-label="long list" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="long">{LONG_TEXT}</SelectItem>
              {MANY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>disabled</FieldLabel>
          <Select defaultValue="locked" disabled>
            <SelectTrigger aria-label="disabled select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="locked">locked</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field data-invalid="true">
          <FieldLabel>with error</FieldLabel>
          <Select>
            <SelectTrigger aria-label="invalid select" aria-invalid="true">
              <SelectValue placeholder="required" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">alpha</SelectItem>
            </SelectContent>
          </Select>
          <FieldError>pick a value</FieldError>
        </Field>
      </FieldGroup>
    </Sample>
  )
}

function ChoiceSample() {
  const [agreed, setAgreed] = useState(false)
  const [plan, setPlan] = useState("free")

  return (
    <Sample title="checkbox & radio">
      <FieldSet>
        <FieldLegend variant="label">checkbox</FieldLegend>
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox
              id="sandbox-agree"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(Boolean(checked))}
            />
            <FieldLabel htmlFor="sandbox-agree">
              i agree to the terms
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="sandbox-disabled-checked" checked disabled />
            <FieldLabel htmlFor="sandbox-disabled-checked">
              disabled checked
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <Checkbox id="sandbox-disabled-unchecked" disabled />
            <FieldLabel htmlFor="sandbox-disabled-unchecked">
              disabled unchecked
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" data-invalid="true">
            <Checkbox id="sandbox-invalid-checkbox" aria-invalid="true" />
            <FieldLabel htmlFor="sandbox-invalid-checkbox">invalid</FieldLabel>
          </Field>
        </FieldGroup>
      </FieldSet>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend variant="label">radio</FieldLegend>
        <RadioGroup aria-label="plan" value={plan} onValueChange={setPlan}>
          <Field orientation="horizontal">
            <RadioGroupItem id="sandbox-plan-free" value="free" />
            <FieldLabel htmlFor="sandbox-plan-free">free</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem id="sandbox-plan-pro" value="pro" />
            <FieldLabel htmlFor="sandbox-plan-pro">pro</FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem
              id="sandbox-plan-enterprise"
              value="enterprise"
              disabled
            />
            <FieldLabel htmlFor="sandbox-plan-enterprise">
              enterprise (disabled)
            </FieldLabel>
          </Field>
        </RadioGroup>
        <RadioGroup aria-label="invalid plan">
          <Field orientation="horizontal" data-invalid="true">
            <RadioGroupItem
              id="sandbox-plan-invalid"
              value="invalid"
              aria-invalid="true"
            />
            <FieldLabel htmlFor="sandbox-plan-invalid">invalid</FieldLabel>
          </Field>
        </RadioGroup>
      </FieldSet>
    </Sample>
  )
}

function OtpSample() {
  const [otp, setOtp] = useState("")

  return (
    <Sample title="one-time code">
      <SampleRow label="default">
        <InputOTP
          aria-label="verification code"
          maxLength={6}
          value={otp}
          onChange={setOtp}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </SampleRow>
      <SampleRow label="invalid">
        <InputOTP aria-label="invalid code" maxLength={6} defaultValue="123">
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} aria-invalid="true" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </SampleRow>
      <SampleRow label="disabled">
        <InputOTP
          aria-label="disabled code"
          maxLength={6}
          defaultValue="424242"
          disabled
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </SampleRow>
    </Sample>
  )
}

function FieldLayoutSample() {
  return (
    <Sample title="field layouts">
      <FieldSet>
        <FieldLegend>legend</FieldLegend>
        <FieldDescription>a fieldset groups related fields</FieldDescription>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldLabel htmlFor="sandbox-horizontal">horizontal</FieldLabel>
            <Input id="sandbox-horizontal" placeholder="label beside input" />
          </Field>
          <Field orientation="responsive">
            <FieldLabel htmlFor="sandbox-responsive">responsive</FieldLabel>
            <Input
              id="sandbox-responsive"
              placeholder="stacks on narrow screens"
            />
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <Field data-invalid="true">
            <FieldLabel htmlFor="sandbox-errors">many errors</FieldLabel>
            <Input id="sandbox-errors" aria-invalid="true" />
            <FieldError
              errors={[
                { message: "must be at least 3 characters" },
                { message: "must not contain spaces" },
              ]}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
    </Sample>
  )
}

const hookFormSchema = z.object({
  name: z.string().min(3, "write at least 3 characters"),
  bio: z.string().max(40, "keep it under 40 characters"),
})

type HookFormValues = z.infer<typeof hookFormSchema>

// The real form stack (react-hook-form + ui/form). Submit with an empty
// name to see the messages. A dirty form also blocks navigation away.
function HookFormSample() {
  const rhf = useForm<HookFormValues>({
    resolver: zodResolver(hookFormSchema),
    defaultValues: { name: "", bio: "" },
  })

  return (
    <Sample title="form (react-hook-form)">
      <Form
        rhf={rhf}
        className="space-y-4"
        onSubmit={rhf.handleSubmit((values) => {
          toast.success(`saved ${values.name}`)
          rhf.reset(values)
        })}
      >
        <FormField
          control={rhf.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>name</FormLabel>
              <FormControl>
                <Input placeholder="at least 3 characters" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={rhf.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>bio</FormLabel>
              <FormControl>
                <Textarea size="compact" {...field} />
              </FormControl>
              <FormDescription>optional, 40 characters at most</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <FormCancelButton onClick={() => rhf.reset()}>reset</FormCancelButton>
          <FormSubmitButton idleText="save" busyText="saving" />
        </div>
      </Form>
    </Sample>
  )
}
