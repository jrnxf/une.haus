import { createFileRoute } from "@tanstack/react-router"
import {
  ArrowUpRightIcon,
  CoinsIcon,
  FlagIcon,
  HeartIcon,
  InboxIcon,
  MessageCircleIcon,
  PencilIcon,
  TimerIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FiltersDemo } from "~/components/filters-demo"
import { LinkCard } from "~/components/link-card"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import { CountChip } from "~/components/ui/count-chip"
import { CountdownClock } from "~/components/ui/countdown-clock"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Input } from "~/components/ui/input"
import { Kbd, KbdGroup } from "~/components/ui/kbd"
import { Label } from "~/components/ui/label"
import { Metaline } from "~/components/ui/metaline"
import { Progress } from "~/components/ui/progress"
import { Form, useFormMedia } from "~/components/ui/form"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { Scrollspy } from "~/components/ui/scrollspy"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Skeleton } from "~/components/ui/skeleton"
import { Switch } from "~/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import { Toggle } from "~/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { UserChip } from "~/components/user-chip"
import { useModifierKey } from "~/hooks/use-modifier-key"

export const Route = createFileRoute("/sandbox")({
  component: RouteComponent,
})

const sections = [
  { id: "colors", label: "colors" },
  { id: "typography", label: "typography" },
  { id: "buttons", label: "buttons" },
  { id: "badges", label: "badges" },
  { id: "inputs", label: "inputs" },
  { id: "controls", label: "controls" },
  { id: "feedback", label: "feedback" },
  { id: "data-display", label: "data display" },
  { id: "overlays", label: "overlays" },
  { id: "flag-dialog", label: "flag dialog" },
  { id: "cards", label: "cards" },
  { id: "morph-cards", label: "morph cards" },
  { id: "filters", label: "filters" },
]

const pairedColors = [
  { name: "background", bg: "var(--background)", fg: "var(--foreground)" },
  { name: "card", bg: "var(--card)", fg: "var(--card-foreground)" },
  { name: "popover", bg: "var(--popover)", fg: "var(--popover-foreground)" },
  { name: "primary", bg: "var(--primary)", fg: "var(--primary-foreground)" },
  {
    name: "secondary",
    bg: "var(--secondary)",
    fg: "var(--secondary-foreground)",
  },
  { name: "muted", bg: "var(--muted)", fg: "var(--muted-foreground)" },
  { name: "accent", bg: "var(--accent)", fg: "var(--accent-foreground)" },
  {
    name: "destructive",
    bg: "var(--destructive)",
    fg: "var(--destructive-foreground)",
  },
]

const standaloneColors = [
  { name: "table-header", var: "var(--table-header)" },
  { name: "border", var: "var(--border)" },
  { name: "input", var: "var(--input)" },
  { name: "ring", var: "var(--ring)" },
  { name: "chart-1", var: "var(--chart-1)" },
  { name: "chart-2", var: "var(--chart-2)" },
  { name: "chart-3", var: "var(--chart-3)" },
  { name: "chart-4", var: "var(--chart-4)" },
  { name: "chart-5", var: "var(--chart-5)" },
]

const destructiveTokens = [
  { name: "destructive-bg", var: "var(--destructive-bg)" },
  { name: "destructive-bg-hover", var: "var(--destructive-bg-hover)" },
  { name: "destructive-border", var: "var(--destructive-border)" },
  { name: "destructive-ring", var: "var(--destructive-ring)" },
]

const MORPH_CARD_DATA = [
  {
    name: "kickflip",
    position: 5,
    user: "Jane Doe",
    likes: 3,
    messages: 1,
    isLatest: true,
  },
  {
    name: "heelflip",
    position: 4,
    user: "Alex Kim",
    likes: 7,
    messages: 2,
    isLatest: false,
  },
  {
    name: "tre flip",
    position: 3,
    user: "Sam Lee",
    likes: 2,
    messages: 0,
    isLatest: false,
  },
  {
    name: "varial flip",
    position: 2,
    user: "Jane Doe",
    likes: 5,
    messages: 4,
    isLatest: false,
  },
  {
    name: "hardflip",
    position: 1,
    user: "Alex Kim",
    likes: 1,
    messages: 1,
    isLatest: false,
  },
]

function SectionHeading({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="text-muted-foreground scroll-mt-[90px] text-xs font-semibold tracking-widest uppercase"
    >
      {children}
    </h2>
  )
}

function Subsection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground font-mono text-xs">{label}</p>
      {children}
    </div>
  )
}

function MorphCards() {
  return (
    <div className="flex max-w-xl flex-col">
      {MORPH_CARD_DATA.map((card, i) => (
        <div key={card.name} className="flex flex-col">
          <div className="bg-card relative z-20 rounded-md border p-3">
            <div className="flex items-start gap-2.5">
              <Avatar
                className="size-8 shrink-0 rounded-full"
                cloudflareId={null}
                alt={card.user}
              >
                <AvatarFallback className="text-xs" name={card.user} />
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-sm font-medium">
                      {card.name}
                    </h3>
                    {card.isLatest && (
                      <Badge variant="outline" className="text-[10px]">
                        latest
                      </Badge>
                    )}
                  </div>

                  <div className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                    <span className="flex items-center gap-0.5">
                      <HeartIcon className="size-3" />
                      {card.likes}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MessageCircleIcon className="size-3" />
                      {card.messages}
                    </span>
                  </div>
                </div>

                <Metaline
                  className="text-xs"
                  separator="·"
                  parts={[`#${card.position}`, card.user]}
                />
              </div>
            </div>
          </div>

          {i < MORPH_CARD_DATA.length - 1 && (
            <div
              className="relative z-30 mx-8 -my-px h-6"
              style={{ width: "48px" }}
            >
              <svg
                className="absolute inset-0 overflow-visible"
                width="48"
                height="24"
                viewBox="0 0 48 24"
                fill="none"
              >
                <path d="M27 -3 L51 -3 L21 27 L-3 27 Z" className="fill-card" />
                <line
                  x1="27"
                  y1="-3"
                  x2="-3"
                  y2="27"
                  className="stroke-border"
                  strokeWidth="1"
                />
                <line
                  x1="51"
                  y1="-3"
                  x2="21"
                  y2="27"
                  className="stroke-border"
                  strokeWidth="1"
                />
              </svg>
              <ArrowUpRightIcon className="text-muted-foreground/50 absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FlagDialogDemo() {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setIsPending(true)
    setTimeout(() => {
      toast.success("flagged for review")
      setIsPending(false)
      setReason("")
      setOpen(false)
    }, 1000)
  }

  return (
    <Tray open={open} onOpenChange={setOpen}>
      <TrayTrigger asChild>
        <Button variant="outline" size="icon-sm" aria-label="flag content">
          <FlagIcon className="size-4" />
        </Button>
      </TrayTrigger>
      <TrayContent>
        <TrayTitle>flag content</TrayTitle>
        <p className="text-muted-foreground text-sm">
          explain why this content should be reviewed by an admin.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label>reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="explain why this should be reviewed"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              cancel
            </Button>
            <Button type="submit" disabled={!reason.trim() || isPending}>
              {isPending ? "submitting..." : "submit"}
            </Button>
          </div>
        </form>
      </TrayContent>
    </Tray>
  )
}

function UploadStatusTransitionDemo() {
  const rhf = useForm<{ demo: string }>({
    defaultValues: { demo: "" },
  })

  return (
    <Form
      rhf={rhf}
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <UploadStatusTransitionControls />
    </Form>
  )
}

function UploadStatusTransitionControls() {
  const {
    isMediaUploading,
    setImageUploadStatus,
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  } = useFormMedia()
  const intervalRef = useRef<number | undefined>(undefined)
  const timeoutRef = useRef<number | undefined>(undefined)

  const clearSimulation = useCallback(() => {
    if (intervalRef.current !== undefined) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }

    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = undefined
    }
  }, [])

  const reset = useCallback(() => {
    clearSimulation()
    setImageUploadStatus("idle")
    setMediaUploadFileName(undefined)
    setMediaUploadFileSizeBytes(undefined)
    setVideoUploadStatus("idle")
  }, [
    clearSimulation,
    setImageUploadStatus,
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  ])

  const runTransition = useCallback(() => {
    clearSimulation()
    setImageUploadStatus("idle")
    setMediaUploadFileName(
      "my-long-demo-video-filename-for-status-preview.mp4",
    )
    setMediaUploadFileSizeBytes(52 * 1024 * 1024)

    let progress = 0
    setVideoUploadStatus(progress)

    intervalRef.current = window.setInterval(() => {
      progress = Math.min(100, progress + 7)
      setVideoUploadStatus(progress)

      if (progress >= 100) {
        if (intervalRef.current !== undefined) {
          window.clearInterval(intervalRef.current)
          intervalRef.current = undefined
        }

        setVideoUploadStatus("processing")
        timeoutRef.current = window.setTimeout(() => {
          reset()
        }, 1600)
      }
    }, 140)
  }, [
    clearSimulation,
    reset,
    setImageUploadStatus,
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  ])

  useEffect(() => {
    return () => {
      clearSimulation()
      setImageUploadStatus("idle")
      setMediaUploadFileName(undefined)
      setMediaUploadFileSizeBytes(undefined)
      setVideoUploadStatus("idle")
    }
  }, [
    clearSimulation,
    setImageUploadStatus,
    setMediaUploadFileName,
    setMediaUploadFileSizeBytes,
    setVideoUploadStatus,
  ])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isMediaUploading}
        onClick={runTransition}
      >
        simulate upload transition
      </Button>
    </div>
  )
}

function SandboxCountdownDemo() {
  const [oneDayTarget] = useState(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  )
  const [oneHourTarget] = useState(() => new Date(Date.now() + 60 * 60 * 1000))
  const [oneMinuteTarget] = useState(() => new Date(Date.now() + 60 * 1000))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs">1 day</span>
        <CountdownClock targetDate={oneDayTarget} size="md" variant="secondary" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs">1 hour</span>
        <CountdownClock targetDate={oneHourTarget} size="md" variant="secondary" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs">1 minute</span>
        <CountdownClock
          targetDate={oneMinuteTarget}
          size="md"
          variant="secondary"
        />
      </div>
    </div>
  )
}

function RouteComponent() {
  const modifierKey = useModifierKey()
  const [togglePressed, setTogglePressed] = useState(false)
  const [switchChecked, setSwitchChecked] = useState(false)

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>sandbox</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="bg-background sticky top-(--header-height) z-20 border-b">
        <div className="mx-auto w-full max-w-5xl overflow-x-auto px-4 py-2">
          <Scrollspy
            offset={90}
            scrollSelector="#main-content"
            history={false}
            className="flex gap-2"
          >
            {sections.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                data-scrollspy-anchor={s.id}
                className="data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary/80 data-[active=true]:hover:text-primary-foreground dark:data-[active=true]:border-primary dark:data-[active=true]:bg-primary dark:data-[active=true]:text-primary-foreground dark:data-[active=true]:hover:bg-primary/80 dark:data-[active=true]:hover:text-primary-foreground shrink-0"
              >
                {s.label}
              </Button>
            ))}
          </Scrollspy>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl p-4">
        <div className="flex flex-col gap-12">
          {/* ─── Colors ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="colors">colors</SectionHeading>

            <Subsection label="paired (bg + foreground)">
              <div className="grid gap-2 sm:grid-cols-2">
                {pairedColors.map((pair) => (
                  <div
                    key={pair.name}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                    style={{ backgroundColor: pair.bg, color: pair.fg }}
                  >
                    <span className="text-sm font-medium">{pair.name}</span>
                    <span className="font-mono text-xs opacity-60">Aa</span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection label="standalone">
              <div className="flex flex-wrap gap-2">
                {standaloneColors.map((color) => (
                  <div
                    key={color.name}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="size-10 rounded-lg border"
                      style={{ backgroundColor: color.var }}
                    />
                    <span className="text-muted-foreground max-w-12 truncate font-mono text-[10px]">
                      {color.name}
                    </span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection label="destructive scale">
              <div className="flex flex-wrap gap-2">
                {destructiveTokens.map((color) => (
                  <div
                    key={color.name}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="size-10 rounded-lg border"
                      style={{ backgroundColor: color.var }}
                    />
                    <span className="text-muted-foreground max-w-20 truncate font-mono text-[10px]">
                      {color.name.replace("destructive-", "")}
                    </span>
                  </div>
                ))}
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Typography ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="typography">typography</SectionHeading>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground font-mono text-xs">
                  font-sans / geist
                </p>
                <p className="font-sans text-2xl">
                  the quick brown fox jumps over the lazy dog
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground font-mono text-xs">
                  font-mono / geist mono (default)
                </p>
                <p className="font-mono text-2xl">
                  the quick brown fox jumps over the lazy dog
                </p>
              </div>
            </div>

            <Subsection label="scale">
              <div className="flex flex-col gap-2">
                {(
                  [
                    "text-2xl",
                    "text-xl",
                    "text-lg",
                    "text-base",
                    "text-sm",
                    "text-xs",
                  ] as const
                ).map((size) => (
                  <div key={size} className="flex items-baseline gap-4">
                    <span className="text-muted-foreground w-16 shrink-0 font-mono text-xs">
                      {size}
                    </span>
                    <span className={size}>the quick brown fox</span>
                  </div>
                ))}
              </div>
            </Subsection>

            <Subsection label="weights">
              <div className="flex flex-col gap-1">
                {(
                  [
                    "font-normal",
                    "font-medium",
                    "font-semibold",
                    "font-bold",
                  ] as const
                ).map((weight) => (
                  <div key={weight} className="flex items-baseline gap-4">
                    <span className="text-muted-foreground w-24 shrink-0 font-mono text-xs">
                      {weight}
                    </span>
                    <span className={weight}>the quick brown fox</span>
                  </div>
                ))}
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Buttons ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="buttons">buttons</SectionHeading>

            <Subsection label="variants">
              <div className="flex flex-wrap gap-2">
                <Button variant="default">Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button disabled>Disabled</Button>
              </div>
            </Subsection>

            <Subsection label="sizes">
              <div className="flex flex-wrap items-center gap-4">
                {(
                  [
                    { size: "sm", label: "sm" },
                    { size: "default", label: "default" },
                    { size: "icon-xs", icon: true, label: "icon-xs" },
                    { size: "icon-sm", icon: true, label: "icon-sm" },
                    { size: "icon", icon: true, label: "icon" },
                  ] as const
                ).map((row) => (
                  <div
                    key={row.size}
                    className="flex flex-col items-center gap-1"
                  >
                    {"icon" in row && row.icon ? (
                      <Button size={row.size} variant="secondary">
                        <PencilIcon />
                      </Button>
                    ) : (
                      <Button size={row.size}>Button</Button>
                    )}
                    <span className="text-muted-foreground font-mono text-[10px]">
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Badges ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="badges">badges</SectionHeading>

            <Subsection label="variants">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="default">default</Badge>
                <Badge variant="secondary">secondary</Badge>
                <Badge variant="destructive">destructive</Badge>
                <Badge variant="outline">outline</Badge>
              </div>
            </Subsection>

            <Subsection label="count chip">
              <div className="flex items-center gap-2">
                <CountChip>3</CountChip>
                <CountChip>12</CountChip>
                <CountChip>99+</CountChip>
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Inputs ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="inputs">inputs</SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2">
              <Subsection label="text input">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="demo-input">label</Label>
                    <Input id="demo-input" placeholder="placeholder text..." />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="demo-disabled">disabled</Label>
                    <Input id="demo-disabled" placeholder="disabled" disabled />
                  </div>
                </div>
              </Subsection>

              <Subsection label="textarea">
                <Textarea placeholder="type something..." />
              </Subsection>

              <Subsection label="select">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kickflip">kickflip</SelectItem>
                    <SelectItem value="heelflip">heelflip</SelectItem>
                    <SelectItem value="treflip">treflip</SelectItem>
                  </SelectContent>
                </Select>
              </Subsection>
            </div>
          </section>

          <Separator />

          {/* ─── Controls ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="controls">controls</SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Subsection label="checkbox">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="check-1" />
                    <Label htmlFor="check-1">unchecked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="check-2" defaultChecked />
                    <Label htmlFor="check-2">checked</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="check-3" disabled />
                    <Label htmlFor="check-3">disabled</Label>
                  </div>
                </div>
              </Subsection>

              <Subsection label="radio group">
                <RadioGroup defaultValue="a">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="a" id="radio-a" />
                    <Label htmlFor="radio-a">option a</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="b" id="radio-b" />
                    <Label htmlFor="radio-b">option b</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="c" id="radio-c" />
                    <Label htmlFor="radio-c">option c</Label>
                  </div>
                </RadioGroup>
              </Subsection>

              <Subsection label="toggle">
                <div className="flex gap-2">
                  <Toggle
                    pressed={togglePressed}
                    onPressedChange={setTogglePressed}
                  >
                    {togglePressed ? "on" : "off"}
                  </Toggle>
                  <Toggle variant="outline">outline</Toggle>
                </div>
              </Subsection>

              <Subsection label="switch">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={switchChecked}
                    onCheckedChange={setSwitchChecked}
                    id="demo-switch"
                  />
                  <Label htmlFor="demo-switch">
                    {switchChecked ? "on" : "off"}
                  </Label>
                </div>
              </Subsection>
            </div>

            <Subsection label="tabs">
              <div className="flex flex-col gap-4">
                <Tabs defaultValue="alpha">
                  <TabsList>
                    <TabsTab value="alpha">alpha</TabsTab>
                    <TabsTab value="beta">beta</TabsTab>
                    <TabsTab value="gamma">gamma</TabsTab>
                    <TabsTab value="delta">delta</TabsTab>
                  </TabsList>
                  <TabsPanel value="alpha">
                    <p className="text-muted-foreground p-4 text-sm">
                      alpha content
                    </p>
                  </TabsPanel>
                  <TabsPanel value="beta">
                    <p className="text-muted-foreground p-4 text-sm">
                      beta content
                    </p>
                  </TabsPanel>
                  <TabsPanel value="gamma">
                    <p className="text-muted-foreground p-4 text-sm">
                      gamma content
                    </p>
                  </TabsPanel>
                  <TabsPanel value="delta">
                    <p className="text-muted-foreground p-4 text-sm">
                      delta content
                    </p>
                  </TabsPanel>
                </Tabs>

                <div>
                  <p className="text-muted-foreground mb-2 font-mono text-[10px]">
                    underline variant
                  </p>
                  <Tabs defaultValue="alpha">
                    <TabsList variant="underline">
                      <TabsTab value="alpha">alpha</TabsTab>
                      <TabsTab value="beta">beta</TabsTab>
                      <TabsTab value="gamma">gamma</TabsTab>
                      <TabsTab value="delta">delta</TabsTab>
                    </TabsList>
                    <TabsPanel value="alpha">
                      <p className="text-muted-foreground p-4 text-sm">
                        alpha content
                      </p>
                    </TabsPanel>
                    <TabsPanel value="beta">
                      <p className="text-muted-foreground p-4 text-sm">
                        beta content
                      </p>
                    </TabsPanel>
                    <TabsPanel value="gamma">
                      <p className="text-muted-foreground p-4 text-sm">
                        gamma content
                      </p>
                    </TabsPanel>
                    <TabsPanel value="delta">
                      <p className="text-muted-foreground p-4 text-sm">
                        delta content
                      </p>
                    </TabsPanel>
                  </Tabs>
                </div>
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Feedback ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="feedback">feedback</SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2">
              <Subsection label="alert">
                <div className="flex flex-col gap-2">
                  <Alert>
                    <AlertTitle>default alert</AlertTitle>
                    <AlertDescription>
                      this is a default alert message.
                    </AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <AlertTitle>destructive alert</AlertTitle>
                    <AlertDescription>something went wrong.</AlertDescription>
                  </Alert>
                </div>
              </Subsection>

              <Subsection label="progress">
                <div className="flex flex-col gap-2">
                  <Progress value={0} />
                  <Progress value={33} />
                  <Progress value={66} />
                  <Progress value={100} />
                </div>
              </Subsection>

              <Subsection label="toast">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast("default toast")}
                  >
                    Default
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success("success toast")}
                  >
                    Success
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.error("error toast")}
                  >
                    Error
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info("info toast")}
                  >
                    Info
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.warning("warning toast")}
                  >
                    Warning
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toast.promise(
                        new Promise((resolve) => setTimeout(resolve, 3000)),
                        {
                          loading: "loading toast",
                          success: "done!",
                          error: "failed",
                        },
                      )
                    }
                  >
                    Loading
                  </Button>
                </div>
              </Subsection>

              <div className="sm:col-span-2">
                <Subsection label="upload status transitions">
                  <UploadStatusTransitionDemo />
                </Subsection>
              </div>

              <Subsection label="empty state">
                <Empty className="rounded-lg border">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InboxIcon />
                    </EmptyMedia>
                    <EmptyTitle>nothing here</EmptyTitle>
                    <EmptyDescription>
                      content will appear when data is available.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
                <NoResultsEmpty />
              </Subsection>
            </div>
          </section>

          <Separator />

          {/* ─── Data Display ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="data-display">data display</SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Subsection label="avatar">
                <div className="flex items-center gap-2">
                  <Avatar
                    cloudflareId={null}
                    alt="Jane Doe"
                    className="size-10"
                  >
                    <AvatarFallback name="Jane Doe" />
                  </Avatar>
                  <Avatar cloudflareId={null} alt="Alex Kim" className="size-8">
                    <AvatarFallback name="Alex Kim" />
                  </Avatar>
                  <Avatar cloudflareId={null} alt="Sam Lee" className="size-6">
                    <AvatarFallback name="Sam Lee" className="text-[8px]" />
                  </Avatar>
                </div>
              </Subsection>

              <Subsection label="user chip">
                <div className="flex flex-wrap items-center gap-2">
                  <UserChip
                    user={{ id: 1, name: "Jane Doe", avatarId: null }}
                  />
                  <UserChip
                    user={{ id: 2, name: "Alex Kim", avatarId: null }}
                  />
                  <UserChip user={{ id: 3, name: "Sam Lee", avatarId: null }} />
                </div>
              </Subsection>

              <Subsection label="skeleton">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </Subsection>

              <Subsection label="keyboard shortcuts">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Kbd>{modifierKey}</Kbd>
                    <Kbd>K</Kbd>
                    <Kbd>Shift</Kbd>
                    <Kbd>Enter</Kbd>
                    <Kbd>Esc</Kbd>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      group:
                    </span>
                    <KbdGroup>
                      <Kbd>{modifierKey}</Kbd>
                      <Kbd>K</Kbd>
                    </KbdGroup>
                  </div>
                </div>
              </Subsection>

              <Subsection label="separator">
                <div className="flex flex-col gap-2">
                  <p className="text-sm">above</p>
                  <Separator />
                  <p className="text-sm">below</p>
                  <div className="flex h-6 items-center gap-2">
                    <p className="text-sm">left</p>
                    <Separator orientation="vertical" />
                    <p className="text-sm">right</p>
                  </div>
                </div>
              </Subsection>
            </div>

            <Subsection label="table">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>trick</TableHead>
                      <TableHead>difficulty</TableHead>
                      <TableHead className="text-right">points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>kickflip</TableCell>
                      <TableCell>beginner</TableCell>
                      <TableCell className="text-right">10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>heelflip</TableCell>
                      <TableCell>beginner</TableCell>
                      <TableCell className="text-right">10</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>tre flip</TableCell>
                      <TableCell>intermediate</TableCell>
                      <TableCell className="text-right">25</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>hardflip</TableCell>
                      <TableCell>advanced</TableCell>
                      <TableCell className="text-right">40</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Overlays ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="overlays">overlays</SectionHeading>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Subsection label="tooltip">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover</Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>tooltip content</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Subsection>

              <Subsection label="dialog">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>dialog title</DialogTitle>
                      <DialogDescription>
                        a short description of the dialog content goes here.
                      </DialogDescription>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">
                      dialog body content.
                    </p>
                  </DialogContent>
                </Dialog>
              </Subsection>

              <Subsection label="drawer">
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline">Open</Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>drawer title</DrawerTitle>
                      <DrawerDescription>
                        a short description of the drawer content goes here.
                      </DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4">
                      <p className="text-muted-foreground text-sm">
                        drawer body content.
                      </p>
                    </div>
                  </DrawerContent>
                </Drawer>
              </Subsection>
            </div>
          </section>

          <Separator />

          {/* ─── Flag Dialog ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="flag-dialog">flag dialog</SectionHeading>

            <Subsection label="inline flag dialog">
              <FlagDialogDemo />
            </Subsection>
          </section>

          <Separator />

          {/* ─── Cards ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="cards">cards</SectionHeading>

            <Subsection label="card">
              <Card className="max-w-sm">
                <CardHeader>
                  <CardTitle>card title</CardTitle>
                  <CardDescription>
                    a short description of the card content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">card body content goes here.</p>
                </CardContent>
              </Card>
            </Subsection>

            <Subsection label="countdown clock">
              <SandboxCountdownDemo />
            </Subsection>

            <Subsection label="link card">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <LinkCard.Root href="/sandbox">
                  <LinkCard.Header icon={CoinsIcon} title="default" />
                  <LinkCard.Content>
                    <LinkCard.Description>
                      a link card with icon, title, and call-to-action.
                    </LinkCard.Description>
                    <LinkCard.Cta label="View" />
                  </LinkCard.Content>
                </LinkCard.Root>

                <LinkCard.Root href="/sandbox">
                  <LinkCard.Header icon={TimerIcon} title="with content" />
                  <LinkCard.Content>
                    <LinkCard.Description>
                      cards can include arbitrary content between description
                      and cta.
                    </LinkCard.Description>
                    <LinkCard.Cta label="Open" />
                  </LinkCard.Content>
                </LinkCard.Root>
              </div>
            </Subsection>
          </section>

          <Separator />

          {/* ─── Morph Cards ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="morph-cards">morph cards</SectionHeading>

            <Subsection label="diagonal highway">
              <MorphCards />
            </Subsection>
          </section>

          <Separator />

          {/* ─── Filters ─── */}
          <section className="flex flex-col gap-6">
            <SectionHeading id="filters">filters</SectionHeading>

            <FiltersDemo />
          </section>
        </div>
      </div>
    </>
  )
}
