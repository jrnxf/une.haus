import { useNavigate, useSearch } from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import {
  Check,
  FlagIcon,
  HeartIcon,
  InboxIcon,
  MessageCircleIcon,
  PencilIcon,
} from "lucide-react"
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useDropzone } from "react-dropzone-esm"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { FiltersDemo } from "~/components/filters-demo"
import { BadgeInput } from "~/components/input/badge-input"
import { DisciplineSelector } from "~/components/input/discipline-selector"
import { ImageInput } from "~/components/input/image-input"
import {
  type LocationSelectorLocation,
  LocationSelector,
} from "~/components/input/location-selector"
import { MentionTextarea } from "~/components/input/mention-textarea"
import { MultiVideoInput } from "~/components/input/multi-video-input"
import { RiderSelector } from "~/components/input/rider-selector"
import {
  type RiderEntry,
  SingleRiderSelector,
} from "~/components/input/single-rider-selector"
import { StringListInput } from "~/components/input/string-list-input"
import {
  ElementSelector,
  TrickRelationshipSelector,
  TrickSelector,
} from "~/components/input/trick-selector"
import { UploadDropZone } from "~/components/input/upload-drop-zone"
import { UserSelector } from "~/components/input/user-selector"
import { VideoInput } from "~/components/input/video-input"
import { YoutubeInput } from "~/components/input/youtube-input"
import { MatrixText } from "~/components/matrix-text"
import { NoResultsEmpty } from "~/components/no-results-empty"
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormMedia,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
import { Kbd, KbdGroup } from "~/components/ui/kbd"
import { Label } from "~/components/ui/label"
import { MultiSelect } from "~/components/ui/multi-select"
import { Progress } from "~/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { Skeleton } from "~/components/ui/skeleton"
import { StatBadge } from "~/components/ui/stat-badge"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { UserChip } from "~/components/user-chip"
import { type UserDiscipline } from "~/db/schema"
import { useModifierKey } from "~/hooks/use-modifier-key"
import { type OrderedRiderEntry } from "~/lib/tourney/bracket"
import { cn } from "~/lib/utils"

const ROOT_ENTRY_ID = "root"

type SandboxEntry = {
  id: string
  label: string
  group: string
  description: string
  keywords?: string[]
  render: () => ReactNode
}

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
] as const

const standaloneColors = [
  { name: "table-header", value: "var(--table-header)" },
  { name: "border", value: "var(--border)" },
  { name: "input", value: "var(--input)" },
  { name: "ring", value: "var(--ring)" },
  { name: "chart-1", value: "var(--chart-1)" },
  { name: "chart-2", value: "var(--chart-2)" },
  { name: "chart-3", value: "var(--chart-3)" },
  { name: "chart-4", value: "var(--chart-4)" },
  { name: "chart-5", value: "var(--chart-5)" },
] as const

const destructiveTokens = [
  { name: "destructive-bg", value: "var(--destructive-bg)" },
  { name: "destructive-bg-hover", value: "var(--destructive-bg-hover)" },
  { name: "destructive-border", value: "var(--destructive-border)" },
  { name: "destructive-ring", value: "var(--destructive-ring)" },
] as const

const rankColors = [
  {
    name: "gold",
    bg: "var(--rank-gold)",
    fg: "var(--rank-gold-foreground)",
  },
  {
    name: "silver",
    bg: "var(--rank-silver)",
    fg: "var(--rank-silver-foreground)",
  },
  {
    name: "bronze",
    bg: "var(--rank-bronze)",
    fg: "var(--rank-bronze-foreground)",
  },
] as const

const sandboxEntries: SandboxEntry[] = [
  {
    id: ROOT_ENTRY_ID,
    label: "root",
    group: "Overview",
    description: "The default landing view for the sandbox.",
    keywords: ["home", "landing", "matrix"],
    render: () => <RootDemo />,
  },
  {
    id: "colors",
    label: "colors",
    group: "Foundations",
    description: "Theme tokens for surfaces, borders, charts, and rank colors.",
    keywords: ["tokens", "theme", "palette"],
    render: () => <ColorsDemo />,
  },
  {
    id: "typography",
    label: "typography",
    group: "Foundations",
    description: "Font families, size scale, and weight scale.",
    keywords: ["text", "fonts", "scale"],
    render: () => <TypographyDemo />,
  },
  {
    id: "buttons",
    label: "buttons",
    group: "Actions",
    description: "Button variants and sizes used across the app.",
    keywords: ["cta", "actions"],
    render: () => <ButtonsDemo />,
  },
  {
    id: "badges",
    label: "badges",
    group: "Actions",
    description: "Badge families including count and stat treatments.",
    keywords: ["count chip", "stat badge"],
    render: () => <BadgesDemo />,
  },
  {
    id: "text-input",
    label: "text-input",
    group: "Text Entry",
    description: "Standard text input states.",
    keywords: ["input", "field"],
    render: () => <TextInputDemo />,
  },
  {
    id: "textarea",
    label: "textarea",
    group: "Text Entry",
    description: "Basic multi-line text entry.",
    keywords: ["multiline"],
    render: () => <TextareaDemo />,
  },
  {
    id: "mention-textarea",
    label: "mention-textarea",
    group: "Text Entry",
    description: "Rich textarea with @mention support.",
    keywords: ["mentions", "rich text", "editor"],
    render: () => <MentionTextareaDemo />,
  },
  {
    id: "input-otp",
    label: "input-otp",
    group: "Text Entry",
    description: "Verification code input used in auth flows.",
    keywords: ["otp", "code", "auth"],
    render: () => <InputOtpDemo />,
  },
  {
    id: "string-list-input",
    label: "string-list-input",
    group: "Text Entry",
    description: "Tokenized list builder for aliases, tags, and labels.",
    keywords: ["chips", "tokens", "aliases"],
    render: () => <StringListDemo />,
  },
  {
    id: "select",
    label: "select",
    group: "Selection",
    description: "Single value select menu.",
    keywords: ["dropdown"],
    render: () => <SelectDemo />,
  },
  {
    id: "checkbox",
    label: "checkbox",
    group: "Selection",
    description: "Checkbox states and labels.",
    keywords: ["boolean"],
    render: () => <CheckboxDemo />,
  },
  {
    id: "radio-group",
    label: "radio-group",
    group: "Selection",
    description: "Single-choice radio selection.",
    keywords: ["radio"],
    render: () => <RadioGroupDemo />,
  },
  {
    id: "switch",
    label: "switch",
    group: "Selection",
    description: "On/off switch control.",
    keywords: ["boolean"],
    render: () => <SwitchDemo />,
  },
  {
    id: "tabs",
    label: "tabs",
    group: "Selection",
    description: "Default and underline tab styles.",
    keywords: ["navigation"],
    render: () => <TabsDemo />,
  },
  {
    id: "badge-input",
    label: "badge-input",
    group: "Selection",
    description: "Pill-based multi-select used for tags and disciplines.",
    keywords: ["tags", "pills"],
    render: () => <BadgeInputDemo />,
  },
  {
    id: "discipline-selector",
    label: "discipline-selector",
    group: "Selection",
    description: "Specialized badge selector for rider disciplines.",
    keywords: ["disciplines"],
    render: () => <DisciplineSelectorDemo />,
  },
  {
    id: "location-selector",
    label: "location-selector",
    group: "Selection",
    description: "Searchable city picker backed by location APIs.",
    keywords: ["cities", "places", "combobox"],
    render: () => <LocationSelectorDemo />,
  },
  {
    id: "multi-select",
    label: "multi-select",
    group: "Selection",
    description: "Reusable searchable multi-select combobox.",
    keywords: ["combobox", "searchable"],
    render: () => <MultiSelectDemo />,
  },
  {
    id: "user-selector",
    label: "user-selector",
    group: "Selection",
    description: "Searchable user picker built on the responsive combobox.",
    keywords: ["users", "people"],
    render: () => <UserSelectorDemo />,
  },
  {
    id: "single-rider-selector",
    label: "single-rider-selector",
    group: "Selection",
    description: "Single rider picker with custom-name fallback.",
    keywords: ["rider"],
    render: () => <SingleRiderSelectorDemo />,
  },
  {
    id: "rider-selector",
    label: "rider-selector",
    group: "Selection",
    description: "Ordered multi-rider picker with drag reordering.",
    keywords: ["bracket", "sorting", "riders"],
    render: () => <RiderSelectorDemo />,
  },
  {
    id: "trick-selectors",
    label: "trick-selectors",
    group: "Selection",
    description:
      "Searchable selectors for tricks, relationships, and elements.",
    keywords: ["tricks", "elements", "relationships"],
    render: () => <TrickSelectorsDemo />,
  },
  {
    id: "upload-drop-zone",
    label: "upload-drop-zone",
    group: "Media",
    description: "Shared drop zone control used under media inputs.",
    keywords: ["file", "dropzone", "upload"],
    render: () => <UploadDropZoneDemo />,
  },
  {
    id: "image-input",
    label: "image-input",
    group: "Media",
    description: "Image uploader with preview and remove state.",
    keywords: ["upload", "image"],
    render: () => <ImageInputDemo />,
  },
  {
    id: "video-input",
    label: "video-input",
    group: "Media",
    description: "Single video uploader with progress and preview.",
    keywords: ["upload", "video"],
    render: () => <VideoInputDemo />,
  },
  {
    id: "multi-video-input",
    label: "multi-video-input",
    group: "Media",
    description: "Multi-video uploader with asset list management.",
    keywords: ["upload", "videos"],
    render: () => <MultiVideoInputDemo />,
  },
  {
    id: "youtube-input",
    label: "youtube-input",
    group: "Media",
    description: "YouTube URL input with embedded preview.",
    keywords: ["youtube", "embed"],
    render: () => <YoutubeInputDemo />,
  },
  {
    id: "upload-status",
    label: "upload-status",
    group: "Media",
    description: "Global form upload status transitions.",
    keywords: ["media", "progress", "status"],
    render: () => <UploadStatusTransitionDemo />,
  },
  {
    id: "alert",
    label: "alert",
    group: "Feedback",
    description: "Default and destructive alert states.",
    keywords: ["messages"],
    render: () => <AlertDemo />,
  },
  {
    id: "progress",
    label: "progress",
    group: "Feedback",
    description: "Progress bar states from empty to complete.",
    keywords: ["loading"],
    render: () => <ProgressDemo />,
  },
  {
    id: "toast",
    label: "toast",
    group: "Feedback",
    description: "Interactive toast variants from the notification system.",
    keywords: ["sonner", "notification"],
    render: () => <ToastDemo />,
  },
  {
    id: "empty-state",
    label: "empty-state",
    group: "Feedback",
    description: "Empty patterns for missing content and no results.",
    keywords: ["empty", "zero state"],
    render: () => <EmptyStateDemo />,
  },
  {
    id: "flag-dialog",
    label: "flag-dialog",
    group: "Feedback",
    description: "Inline moderation tray with textarea and submit states.",
    keywords: ["tray", "moderation"],
    render: () => <FlagDialogDemo />,
  },
  {
    id: "avatar",
    label: "avatar",
    group: "Display",
    description: "Avatar sizing and fallback rendering.",
    keywords: ["user"],
    render: () => <AvatarDemo />,
  },
  {
    id: "user-chip",
    label: "user-chip",
    group: "Display",
    description: "Compact user identity chip.",
    keywords: ["user"],
    render: () => <UserChipDemo />,
  },
  {
    id: "skeleton",
    label: "skeleton",
    group: "Display",
    description: "Structural loading placeholders.",
    keywords: ["loading"],
    render: () => <SkeletonDemo />,
  },
  {
    id: "keyboard-shortcuts",
    label: "keyboard-shortcuts",
    group: "Display",
    description: "Single key and grouped keycap treatments.",
    keywords: ["kbd", "shortcuts"],
    render: () => <KeyboardShortcutsDemo />,
  },
  {
    id: "separator",
    label: "separator",
    group: "Display",
    description: "Horizontal and vertical separators.",
    keywords: ["divider"],
    render: () => <SeparatorDemo />,
  },
  {
    id: "table",
    label: "table",
    group: "Display",
    description: "Basic table styling for data display.",
    keywords: ["data"],
    render: () => <TableDemo />,
  },
  {
    id: "tooltip",
    label: "tooltip",
    group: "Overlays",
    description: "Tooltip trigger and content.",
    keywords: ["hover"],
    render: () => <TooltipDemo />,
  },
  {
    id: "dialog",
    label: "dialog",
    group: "Overlays",
    description: "Modal dialog layout and copy treatment.",
    keywords: ["modal"],
    render: () => <DialogDemo />,
  },
  {
    id: "drawer",
    label: "drawer",
    group: "Overlays",
    description: "Drawer surface for lower-height overlays.",
    keywords: ["panel"],
    render: () => <DrawerDemo />,
  },
  {
    id: "card",
    label: "card",
    group: "Display",
    description: "Base card content shell.",
    keywords: ["surface"],
    render: () => <CardDemo />,
  },
  {
    id: "countdown-clock",
    label: "countdown-clock",
    group: "Display",
    description: "Countdown display across different durations.",
    keywords: ["timer", "countdown"],
    render: () => <SandboxCountdownDemo />,
  },
  {
    id: "filters",
    label: "filters",
    group: "Patterns",
    description: "Full filter UI demo with grouped controls.",
    keywords: ["filtering", "popover"],
    render: () => <FiltersDemo />,
  },
]

const sandboxEntryMap = new Map(
  sandboxEntries.map((entry) => [entry.id, entry] as const),
)

const sandboxGroups = Array.from(
  new Set(sandboxEntries.map((entry) => entry.group)),
).map((group) => ({
  group,
  entries: sandboxEntries.filter((entry) => entry.group === group),
}))

export function SandboxBrowser() {
  const navigate = useNavigate({ from: "/sandbox" })
  const search = useSearch({ from: "/sandbox" })
  const [query, setQuery] = useState("")

  const activeEntry =
    (search.component && sandboxEntryMap.get(search.component)) ??
    sandboxEntryMap.get(ROOT_ENTRY_ID)

  if (!activeEntry) {
    return null
  }

  const openEntry = (id: string) => {
    setQuery("")
    navigate({
      replace: true,
      search: (prev: Record<string, unknown>) => {
        if (id === ROOT_ENTRY_ID) {
          const { component: _component, ...rest } = prev
          return rest
        }

        return {
          ...prev,
          component: id,
        }
      },
    } as Parameters<typeof navigate>[0])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="bg-muted/15 flex min-h-0 w-full shrink-0 flex-col self-stretch border-b md:h-full md:w-86 md:border-r md:border-b-0">
        <div className="min-h-0 flex-1">
          <Command className="h-full rounded-none bg-transparent" shouldFilter>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="search components..."
            />
            <CommandList className="h-full">
              <CommandEmpty>no components match this search</CommandEmpty>
              {sandboxGroups.map(({ group, entries }) => (
                <CommandGroup heading={group.toLowerCase()} key={group}>
                  {entries.map((entry) => {
                    const isActive = entry.id === activeEntry.id
                    return (
                      <CommandItem
                        key={entry.id}
                        value={entry.label}
                        keywords={[
                          entry.id,
                          entry.group,
                          ...(entry.keywords ?? []),
                        ]}
                        onSelect={() => openEntry(entry.id)}
                        className="py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {entry.label}
                        </span>
                        <Check
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </div>
      </aside>

      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto flex min-h-full w-full max-w-5xl px-4 py-6 md:px-6 md:py-8">
          {activeEntry.id === ROOT_ENTRY_ID ? (
            activeEntry.render()
          ) : (
            <DemoPage entry={activeEntry} />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function DemoPage({ entry }: { entry: SandboxEntry }) {
  return (
    <article className="flex w-full flex-col gap-6">
      <header className="space-y-2">
        <p className="text-muted-foreground text-sm font-medium">
          {entry.group.toLowerCase()}
        </p>
        <h1 className="text-2xl font-semibold text-balance md:text-3xl">
          {entry.label}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm text-pretty md:text-base">
          {entry.description.toLowerCase()}
        </p>
      </header>

      {entry.render()}
    </article>
  )
}

function DemoSubsection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      {children}
    </div>
  )
}

function RootDemo() {
  return (
    <div className="flex min-h-[70dvh] w-full items-center justify-center">
      <MatrixText
        text="sandbox"
        dropHeight={40}
        className="text-5xl font-semibold sm:text-6xl md:text-8xl"
      />
    </div>
  )
}

function ColorsDemo() {
  return (
    <div className="flex flex-col gap-8">
      <DemoSubsection label="paired">
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
      </DemoSubsection>

      <DemoSubsection label="standalone">
        <div className="flex flex-wrap gap-3">
          {standaloneColors.map((color) => (
            <div
              key={color.name}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="size-10 rounded-lg border"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-muted-foreground max-w-16 truncate text-xs">
                {color.name}
              </span>
            </div>
          ))}
        </div>
      </DemoSubsection>

      <DemoSubsection label="destructive">
        <div className="flex flex-wrap gap-3">
          {destructiveTokens.map((color) => (
            <div
              key={color.name}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="size-10 rounded-lg border"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-muted-foreground max-w-24 truncate text-xs">
                {color.name.replace("destructive-", "")}
              </span>
            </div>
          ))}
        </div>
      </DemoSubsection>

      <DemoSubsection label="rank medals">
        <div className="grid gap-2 sm:grid-cols-3">
          {rankColors.map((color) => (
            <div
              key={color.name}
              className="flex items-center justify-between rounded-lg border px-4 py-3"
              style={{ backgroundColor: color.bg, color: color.fg }}
            >
              <span className="text-sm font-medium">{color.name}</span>
              <span className="font-mono text-xs opacity-80">Aa</span>
            </div>
          ))}
        </div>
      </DemoSubsection>
    </div>
  )
}

function TypographyDemo() {
  return (
    <div className="flex flex-col gap-8">
      <DemoSubsection label="families">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs">font-sans / geist</p>
            <p className="font-sans text-2xl">
              the quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs">
              font-mono / geist mono
            </p>
            <p className="font-mono text-2xl">
              the quick brown fox jumps over the lazy dog
            </p>
          </div>
        </div>
      </DemoSubsection>

      <DemoSubsection label="scale">
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
              <span className="text-muted-foreground w-16 shrink-0 text-xs">
                {size}
              </span>
              <span className={size}>the quick brown fox</span>
            </div>
          ))}
        </div>
      </DemoSubsection>

      <DemoSubsection label="weights">
        <div className="flex flex-col gap-2">
          {(
            [
              "font-normal",
              "font-medium",
              "font-semibold",
              "font-bold",
            ] as const
          ).map((weight) => (
            <div key={weight} className="flex items-baseline gap-4">
              <span className="text-muted-foreground w-24 shrink-0 text-xs">
                {weight}
              </span>
              <span className={weight}>the quick brown fox</span>
            </div>
          ))}
        </div>
      </DemoSubsection>
    </div>
  )
}

function ButtonsDemo() {
  return (
    <div className="flex flex-col gap-8">
      <DemoSubsection label="variants">
        <div className="flex flex-wrap gap-2">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
      </DemoSubsection>

      <DemoSubsection label="card button">
        <Button variant="card">
          Card buttons keep the card background and let longer text wrap
          naturally.
        </Button>
      </DemoSubsection>

      <DemoSubsection label="sizes">
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
            <div key={row.size} className="flex flex-col items-center gap-1.5">
              {"icon" in row && row.icon ? (
                <Button size={row.size} variant="secondary">
                  <PencilIcon />
                </Button>
              ) : (
                <Button size={row.size}>Button</Button>
              )}
              <span className="text-muted-foreground text-xs">{row.label}</span>
            </div>
          ))}
        </div>
      </DemoSubsection>
    </div>
  )
}

function BadgesDemo() {
  return (
    <div className="flex flex-col gap-8">
      <DemoSubsection label="badge variants">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">default</Badge>
          <Badge variant="secondary">secondary</Badge>
          <Badge variant="destructive">destructive</Badge>
          <Badge variant="outline">outline</Badge>
        </div>
      </DemoSubsection>

      <DemoSubsection label="count chip">
        <div className="flex items-center gap-2">
          <CountChip>3</CountChip>
          <CountChip>12</CountChip>
          <CountChip>99+</CountChip>
        </div>
      </DemoSubsection>

      <DemoSubsection label="stat badge">
        <div className="text-muted-foreground flex flex-wrap items-center gap-4">
          <StatBadge icon={HeartIcon} count={12} label="like" />
          <StatBadge icon={MessageCircleIcon} count={3} label="message" />
          <StatBadge icon={InboxIcon} count={101} label="notification" />
        </div>
      </DemoSubsection>
    </div>
  )
}

function TextInputDemo() {
  return (
    <div className="grid gap-4 sm:max-w-md">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sandbox-input-demo">label</Label>
        <Input id="sandbox-input-demo" placeholder="placeholder text..." />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sandbox-input-disabled-demo">disabled</Label>
        <Input
          id="sandbox-input-disabled-demo"
          placeholder="disabled"
          disabled
        />
      </div>
    </div>
  )
}

function TextareaDemo() {
  return <Textarea className="max-w-2xl" placeholder="type something..." />
}

function MentionTextareaDemo() {
  const [value, setValue] = useState("")

  return (
    <div className="max-w-2xl space-y-4">
      <MentionTextarea
        value={value}
        onChange={setValue}
        placeholder="type @ to mention someone..."
        rows={5}
      />
      <div className="rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">storage value</p>
        <p className="mt-1 text-sm break-all">{value || "empty"}</p>
      </div>
    </div>
  )
}

function InputOtpDemo() {
  const [value, setValue] = useState("")

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <InputOTP
        maxLength={4}
        value={value}
        onChange={setValue}
        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
      >
        <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
      <p className="text-muted-foreground text-sm">
        current value:{" "}
        <span className="text-foreground">{value || "empty"}</span>
      </p>
    </div>
  )
}

function StringListDemo() {
  const [values, setValues] = useState<string[]>(["backroll", "reverse spin"])

  return (
    <div className="max-w-xl">
      <StringListInput
        value={values}
        onChange={setValues}
        placeholder="add alias..."
      />
    </div>
  )
}

function SelectDemo() {
  return (
    <div className="max-w-sm">
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
    </div>
  )
}

function CheckboxDemo() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox id="sandbox-check-1" />
        <Label htmlFor="sandbox-check-1">unchecked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sandbox-check-2" defaultChecked />
        <Label htmlFor="sandbox-check-2">checked</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sandbox-check-3" disabled />
        <Label htmlFor="sandbox-check-3">disabled</Label>
      </div>
    </div>
  )
}

function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="a">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="a" id="sandbox-radio-a" />
        <Label htmlFor="sandbox-radio-a">option a</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="b" id="sandbox-radio-b" />
        <Label htmlFor="sandbox-radio-b">option b</Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="c" id="sandbox-radio-c" />
        <Label htmlFor="sandbox-radio-c">option c</Label>
      </div>
    </RadioGroup>
  )
}

function SwitchDemo() {
  const [checked, setChecked] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        id="sandbox-switch-demo"
      />
      <Label htmlFor="sandbox-switch-demo">{checked ? "on" : "off"}</Label>
    </div>
  )
}

function TabsDemo() {
  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="alpha">
        <TabsList>
          <TabsTab value="alpha">alpha</TabsTab>
          <TabsTab value="beta">beta</TabsTab>
          <TabsTab value="gamma">gamma</TabsTab>
          <TabsTab value="delta">delta</TabsTab>
        </TabsList>
        <TabsPanel value="alpha">
          <p className="text-muted-foreground p-4 text-sm">alpha content</p>
        </TabsPanel>
        <TabsPanel value="beta">
          <p className="text-muted-foreground p-4 text-sm">beta content</p>
        </TabsPanel>
        <TabsPanel value="gamma">
          <p className="text-muted-foreground p-4 text-sm">gamma content</p>
        </TabsPanel>
        <TabsPanel value="delta">
          <p className="text-muted-foreground p-4 text-sm">delta content</p>
        </TabsPanel>
      </Tabs>

      <div>
        <p className="text-muted-foreground mb-2 text-sm font-medium">
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
            <p className="text-muted-foreground p-4 text-sm">alpha content</p>
          </TabsPanel>
          <TabsPanel value="beta">
            <p className="text-muted-foreground p-4 text-sm">beta content</p>
          </TabsPanel>
          <TabsPanel value="gamma">
            <p className="text-muted-foreground p-4 text-sm">gamma content</p>
          </TabsPanel>
          <TabsPanel value="delta">
            <p className="text-muted-foreground p-4 text-sm">delta content</p>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  )
}

function BadgeInputDemo() {
  const [selections, setSelections] = useState<string[]>(["street"])

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <BadgeInput
        defaultSelections={selections}
        onChange={setSelections}
        options={["street", "flatland", "trials", "freestyle"] as const}
      />
      <p className="text-muted-foreground text-sm">
        selected: {selections.join(", ") || "none"}
      </p>
    </div>
  )
}

function DisciplineSelectorDemo() {
  const [value, setValue] = useState<UserDiscipline[]>(["street", "flatland"])

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <DisciplineSelector value={value} onChange={setValue} />
      <p className="text-muted-foreground text-sm">
        selected: {value.join(", ") || "none"}
      </p>
    </div>
  )
}

function LocationSelectorDemo() {
  const rhf = useForm<{ location: LocationSelectorLocation | undefined }>({
    defaultValues: { location: undefined },
  })

  return (
    <Form
      rhf={rhf}
      className="max-w-xl space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <FormField
        control={rhf.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel>location</FormLabel>
            <FormControl>
              <LocationSelector
                onUpdate={field.onChange}
                placeholder="search cities..."
              />
            </FormControl>
            <FormDescription>search by city name</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="rounded-lg border p-3">
        <p className="text-muted-foreground text-xs">selected</p>
        <p className="mt-1 text-sm">{rhf.watch("location")?.label ?? "none"}</p>
      </div>
    </Form>
  )
}

function MultiSelectDemo() {
  const options = ["alpha", "beta", "gamma", "delta"] as const
  const [selections, setSelections] = useState<string[]>(["alpha", "gamma"])

  return (
    <div className="max-w-sm">
      <MultiSelect
        buttonLabel="pick options"
        options={options}
        selections={selections}
        onOptionCheckedChange={(option, checked) => {
          setSelections((current) => {
            if (checked) {
              return current.includes(option) ? current : [...current, option]
            }

            return current.filter((item) => item !== option)
          })
        }}
      />
    </div>
  )
}

function UserSelectorDemo() {
  const [selectedName, setSelectedName] = useState<string>()

  return (
    <div className="flex max-w-md flex-col gap-4">
      <UserSelector
        initialSelectedUserId={undefined}
        onSelect={(user) => setSelectedName(user?.name)}
      />
      <p className="text-muted-foreground text-sm">
        selected: {selectedName ?? "none"}
      </p>
    </div>
  )
}

function SingleRiderSelectorDemo() {
  const [value, setValue] = useState<RiderEntry | null>(null)

  return (
    <div className="flex max-w-md flex-col gap-4">
      <SingleRiderSelector
        value={value}
        onChange={setValue}
        placeholder="choose a rider"
      />
      <p className="text-muted-foreground text-sm">
        selected: {value?.name ?? "none"}
      </p>
    </div>
  )
}

function RiderSelectorDemo() {
  const [value, setValue] = useState<OrderedRiderEntry[]>([])

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <RiderSelector value={value} onChange={setValue} />
      <p className="text-muted-foreground text-sm">
        riders added: {value.length}
      </p>
    </div>
  )
}

function TrickSelectorsDemo() {
  const [tricks, setTricks] = useState<
    { id: number; name: string; slug: string }[]
  >([])
  const [relationships, setRelationships] = useState<
    {
      targetTrickId: number
      targetTrickName: string
      targetTrickSlug: string
      type: "prerequisite" | "related"
    }[]
  >([])
  const [elements, setElements] = useState<
    { id: number; name: string; slug: string }[]
  >([])

  return (
    <div className="flex flex-col gap-8">
      <DemoSubsection label="trick selector">
        <TrickSelector value={tricks} onChange={setTricks} />
      </DemoSubsection>

      <DemoSubsection label="relationship selector">
        <TrickRelationshipSelector
          value={relationships}
          onChange={setRelationships}
          relationshipType="related"
        />
      </DemoSubsection>

      <DemoSubsection label="element selector">
        <ElementSelector value={elements} onChange={setElements} />
      </DemoSubsection>
    </div>
  )
}

function UploadDropZoneDemo() {
  const [fileName, setFileName] = useState<string>()

  const { getInputProps, getRootProps } = useDropzone({
    multiple: false,
    onDrop: (acceptedFiles) => {
      setFileName(acceptedFiles[0]?.name)
    },
  })

  return (
    <div className="max-w-sm">
      <UploadDropZone getRootProps={getRootProps} getInputProps={getInputProps}>
        <span className="text-muted-foreground block w-full truncate text-left text-sm">
          {fileName ?? "Choose File"}
        </span>
      </UploadDropZone>
    </div>
  )
}

function ImageInputDemo() {
  const rhf = useForm<{ image: null | string | undefined }>({
    defaultValues: { image: null },
  })

  return (
    <Form
      rhf={rhf}
      className="max-w-xl space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <FormField
        control={rhf.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>image</FormLabel>
            <FormControl>
              <ImageInput
                value={field.value}
                onChange={field.onChange}
                previewClassNames="size-56 rounded-md"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}

function VideoInputDemo() {
  const rhf = useForm<{ video: string | undefined }>({
    defaultValues: { video: undefined },
  })

  return (
    <Form
      rhf={rhf}
      className="max-w-2xl space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <FormField
        control={rhf.control}
        name="video"
        render={({ field }) => (
          <FormItem>
            <FormLabel>video</FormLabel>
            <FormControl>
              <VideoInput onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}

function MultiVideoInputDemo() {
  const rhf = useForm<{ videos: string[] }>({
    defaultValues: { videos: [] },
  })

  return (
    <Form
      rhf={rhf}
      className="max-w-3xl space-y-4"
      onSubmit={(event) => event.preventDefault()}
    >
      <FormField
        control={rhf.control}
        name="videos"
        render={({ field }) => (
          <FormItem>
            <FormLabel>videos</FormLabel>
            <FormControl>
              <MultiVideoInput value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  )
}

function YoutubeInputDemo() {
  const [value, setValue] = useState<null | string>("dQw4w9WgXcQ")

  return (
    <div className="max-w-2xl">
      <YoutubeInput currentId={value} onChange={setValue} />
    </div>
  )
}

function AlertDemo() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Alert>
        <AlertTitle>default alert</AlertTitle>
        <AlertDescription>this is a default alert message.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>destructive alert</AlertTitle>
        <AlertDescription>something went wrong.</AlertDescription>
      </Alert>
    </div>
  )
}

function ProgressDemo() {
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <Progress value={0} />
      <Progress value={33} />
      <Progress value={66} />
      <Progress value={100} />
    </div>
  )
}

function ToastDemo() {
  return (
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
          toast.promise(new Promise((resolve) => setTimeout(resolve, 3000)), {
            loading: "loading toast",
            success: "done!",
            error: "failed",
          })
        }
      >
        Loading
      </Button>
    </div>
  )
}

function EmptyStateDemo() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
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
    </div>
  )
}

function AvatarDemo() {
  return (
    <div className="flex items-center gap-2">
      <Avatar cloudflareId={null} alt="Jane Doe" className="size-10">
        <AvatarFallback name="Jane Doe" />
      </Avatar>
      <Avatar cloudflareId={null} alt="Alex Kim" className="size-8">
        <AvatarFallback name="Alex Kim" />
      </Avatar>
      <Avatar cloudflareId={null} alt="Sam Lee" className="size-6">
        <AvatarFallback name="Sam Lee" className="text-[8px]" />
      </Avatar>
    </div>
  )
}

function UserChipDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <UserChip user={{ id: 1, name: "Jane Doe", avatarId: null }} />
      <UserChip user={{ id: 2, name: "Alex Kim", avatarId: null }} />
      <UserChip user={{ id: 3, name: "Sam Lee", avatarId: null }} />
    </div>
  )
}

function SkeletonDemo() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function KeyboardShortcutsDemo() {
  const modifierKey = useModifierKey()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Kbd>{modifierKey}</Kbd>
        <Kbd>K</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>Enter</Kbd>
        <Kbd>Esc</Kbd>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">group:</span>
        <KbdGroup>
          <Kbd>{modifierKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </div>
    </div>
  )
}

function SeparatorDemo() {
  return (
    <div className="flex max-w-md flex-col gap-3">
      <p className="text-sm">above</p>
      <Separator />
      <p className="text-sm">below</p>
      <div className="flex h-6 items-center gap-2">
        <p className="text-sm">left</p>
        <Separator orientation="vertical" />
        <p className="text-sm">right</p>
      </div>
    </div>
  )
}

function TableDemo() {
  return (
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
  )
}

function TooltipDemo() {
  return (
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
  )
}

function DialogDemo() {
  return (
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
        <p className="text-muted-foreground text-sm">dialog body content.</p>
      </DialogContent>
    </Dialog>
  )
}

function DrawerDemo() {
  return (
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
          <p className="text-muted-foreground text-sm">drawer body content.</p>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function FlagDialogDemo() {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
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
              onChange={(event) => setReason(event.target.value)}
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

function CardDemo() {
  return (
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
  )
}

function SandboxCountdownDemo() {
  const [oneDayTarget] = useState(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000),
  )
  const [oneHourTarget] = useState(() => new Date(Date.now() + 60 * 60 * 1000))
  const [oneMinuteTarget] = useState(() => new Date(Date.now() + 60 * 1000))

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs">1 day</span>
        <CountdownClock
          targetDate={oneDayTarget}
          size="md"
          variant="secondary"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-16 text-xs">1 hour</span>
        <CountdownClock
          targetDate={oneHourTarget}
          size="md"
          variant="secondary"
        />
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

function UploadStatusTransitionDemo() {
  const rhf = useForm<{ demo: string }>({
    defaultValues: { demo: "" },
  })

  return (
    <Form
      rhf={rhf}
      className="space-y-2"
      onSubmit={(event) => event.preventDefault()}
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
    setMediaUploadFileName("my-long-demo-video-filename-for-status-preview.mp4")
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
