import {
  EyeIcon,
  HeartIcon,
  MessageSquareIcon,
  TrophyIcon,
  UsersIcon,
  VideoIcon,
} from "lucide-react"

import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import { StatCard } from "~/components/stats/stat-card"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { CountChip } from "~/components/ui/count-chip"
import { CountdownClock } from "~/components/ui/countdown-clock"
import { FlagEmoji } from "~/components/ui/flag-emoji"
import { Kbd, KbdGroup } from "~/components/ui/kbd"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { StatBadge } from "~/components/ui/stat-badge"
import { StatusIndicator } from "~/components/ui/status"

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "success",
] as const

const COUNTDOWN_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "muted",
] as const

const STATUSES = ["online", "away", "busy"] as const

// Fixed dates, so the server and the browser render the same text.
const PAST_DATE = new Date("2026-01-15T18:30:00Z")
const FUTURE_DATE = new Date("2030-01-01T00:00:00Z")

export function DisplaySection() {
  return (
    <SandboxSection id="display" title="display">
      <BadgeSample />
      <AvatarSample />
      <CardSample />
      <MetalineSample />
      <KbdSample />
      <TimeSample />
      <StatCardSample />
    </SandboxSection>
  )
}

function BadgeSample() {
  return (
    <Sample title="badges & counts">
      <SampleRow label="badge">
        {BADGE_VARIANTS.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </SampleRow>
      <SampleRow label="count chip">
        <CountChip>3</CountChip>
        <CountChip>12</CountChip>
        <CountChip>99+</CountChip>
      </SampleRow>
      <SampleRow label="stat badge">
        <StatBadge icon={HeartIcon} count={42} label="like" />
        <StatBadge icon={MessageSquareIcon} count={1} label="comment" />
        <StatBadge icon={EyeIcon} count={0} label="view" />
      </SampleRow>
    </Sample>
  )
}

function AvatarSample() {
  return (
    <Sample title="avatar & status">
      <SampleRow label="fallback sizes">
        <Avatar alt="jane doe" className="size-6">
          <AvatarFallback name="jane doe" />
        </Avatar>
        <Avatar alt="jane doe" className="size-8">
          <AvatarFallback name="jane doe" />
        </Avatar>
        <Avatar alt="ab" className="size-10">
          <AvatarFallback name="ab" />
        </Avatar>
        <Avatar alt="test user" className="size-12">
          <AvatarFallback name="test user" />
        </Avatar>
      </SampleRow>
      <SampleRow label="broken image falls back to initials">
        <Avatar alt="broken image" cloudflareId="sandbox-missing-image">
          <AvatarImage width={64} quality={80} />
          <AvatarFallback name="broken image" />
        </Avatar>
      </SampleRow>
      <SampleRow label="status">
        {STATUSES.map((status) => (
          <span key={status} className="flex items-center gap-2 text-sm">
            <StatusIndicator status={status} />
            {status}
          </span>
        ))}
      </SampleRow>
    </Sample>
  )
}

function CardSample() {
  return (
    <Sample title="card">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>card title</CardTitle>
          <CardDescription>
            a card description sits under the title
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">card content</p>
        </CardContent>
      </Card>
    </Sample>
  )
}

function MetalineSample() {
  return (
    <Sample title="metaline">
      <SampleRow label="default">
        <Metaline parts={["jane doe", "3 tricks", "12 videos"]} />
      </SampleRow>
      <SampleRow label="custom separator, empty parts dropped">
        <Metaline
          parts={["street", null, "flatland", "", "trials"]}
          separator={<span aria-hidden>·</span>}
        />
      </SampleRow>
      <SampleRow label="truncation">
        <div className="w-48 min-w-0">
          <Metaline
            parts={[
              "a rider with a very long name",
              "128 tricks",
              "4096 videos",
            ]}
          />
        </div>
      </SampleRow>
    </Sample>
  )
}

function KbdSample() {
  return (
    <Sample title="kbd">
      <SampleRow label="keys">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
        <Kbd>esc</Kbd>
        <Kbd>enter</Kbd>
      </SampleRow>
      <SampleRow label="group">
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>P</Kbd>
        </KbdGroup>
      </SampleRow>
    </Sample>
  )
}

function TimeSample() {
  return (
    <Sample title="time & place">
      <SampleRow label="relative time card (hover it)">
        <RelativeTimeCard date={PAST_DATE} />
        <RelativeTimeCard date={PAST_DATE} variant="muted" />
        <RelativeTimeCard
          date={PAST_DATE}
          variant="ghost"
          timezones={["Europe/Lisbon", "America/New_York"]}
        />
      </SampleRow>
      <SampleRow label="countdown clock size">
        <CountdownClock targetDate={FUTURE_DATE} size="xs" />
        <CountdownClock targetDate={FUTURE_DATE} size="sm" />
        <CountdownClock targetDate={FUTURE_DATE} size="md" />
      </SampleRow>
      <SampleRow label="countdown clock variant">
        {COUNTDOWN_VARIANTS.map((variant) => (
          <CountdownClock
            key={variant}
            targetDate={FUTURE_DATE}
            variant={variant}
          />
        ))}
      </SampleRow>
      <SampleRow label="flag emoji (pt, us, jp, none)">
        <FlagEmoji location={{ countryCode: "PT" }} />
        <FlagEmoji location={{ countryCode: "US" }} />
        <FlagEmoji location={{ countryCode: "JP" }} />
        <FlagEmoji location={null} />
      </SampleRow>
    </Sample>
  )
}

function StatCardSample() {
  return (
    <Sample title="stat card" wide>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        <StatCard
          label="riders"
          value={1284}
          icon={UsersIcon}
          description="default size"
        />
        <StatCard
          label="videos"
          value="12.4k"
          icon={VideoIcon}
          size="compact"
          description="compact size"
        />
        <StatCard
          label="tourneys"
          value={18}
          icon={TrophyIcon}
          size="responsive"
          to="/tourney"
          description="responsive, links to /tourney"
        />
      </div>
    </Sample>
  )
}
