import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useSearch } from "@tanstack/react-router"
import {
  AtSignIcon,
  CalendarClock,
  Heart,
  MessageCircle,
  StickyNoteIcon,
  UserPlus,
} from "lucide-react"
import { useEffect } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { notificationSettings } from "~/lib/notification-settings"
import { type UpdateNotificationSettingsInput } from "~/lib/notification-settings/schemas"

const searchSchema = z.object({
  unsubscribed: z.enum(["digest", "game_start", "all"]).optional(),
})

export const Route = createFileRoute("/_authed/notifications/settings")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      notificationSettings.get.queryOptions(),
    )
  },
  component: RouteComponent,
})

const DAYS_OF_WEEK = [
  { value: "0", label: "sunday" },
  { value: "1", label: "monday" },
  { value: "2", label: "tuesday" },
  { value: "3", label: "wednesday" },
  { value: "4", label: "thursday" },
  { value: "5", label: "friday" },
  { value: "6", label: "saturday" },
]

const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"} UTC`,
}))

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}${i + 1 === 1 ? "st" : i + 1 === 2 ? "nd" : i + 1 === 3 ? "rd" : i + 1 === 21 ? "st" : i + 1 === 22 ? "nd" : i + 1 === 23 ? "rd" : "th"}`,
}))

const FREQUENCY_OPTIONS = [
  { value: "off", label: "off" },
  { value: "weekly", label: "weekly" },
  { value: "monthly", label: "monthly" },
]

const HOURS_BEFORE_OPTIONS = [
  { value: "12", label: "12 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
]

function RouteComponent() {
  const qc = useQueryClient()
  const { unsubscribed } = useSearch({
    from: "/_authed/notifications/settings",
  })
  const { data: settings } = useSuspenseQuery(
    notificationSettings.get.queryOptions(),
  )

  useEffect(() => {
    if (unsubscribed) {
      const messages: Record<string, string> = {
        digest: "you've been unsubscribed from digest emails",
        game_start: "you've been unsubscribed from game start reminders",
        all: "you've been unsubscribed from all emails",
      }
      toast.success(messages[unsubscribed])
    }
  }, [unsubscribed])

  const settingsQueryKey = notificationSettings.get.queryOptions().queryKey

  const updateSettings = useMutation({
    mutationFn: notificationSettings.update.fn,
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: settingsQueryKey })
      const prev = qc.getQueryData(settingsQueryKey)

      qc.setQueryData(settingsQueryKey, (old) => {
        if (!old) return old
        return { ...old, ...variables.data }
      })

      return { prev }
    },
    onError: (_, __, context) => {
      if (context?.prev) {
        qc.setQueryData(settingsQueryKey, context.prev)
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })

  const handleUpdate = (updates: UpdateNotificationSettingsInput) => {
    updateSettings.mutate({ data: updates })
  }

  const inAppSettingsItems = [
    {
      key: "likesEnabled" as const,
      label: "likes",
      description: "when someone likes your posts, sets, or submissions",
      icon: Heart,
      enabled: settings.likesEnabled,
    },
    {
      key: "commentsEnabled" as const,
      label: "comments",
      description: "when someone comments on your content",
      icon: MessageCircle,
      enabled: settings.commentsEnabled,
    },
    {
      key: "followsEnabled" as const,
      label: "new followers",
      description: "when someone starts following you",
      icon: UserPlus,
      enabled: settings.followsEnabled,
    },
    {
      key: "newContentEnabled" as const,
      label: "new content from followed users",
      description: "when someone you follow creates a new post or set",
      icon: StickyNoteIcon,
      enabled: settings.newContentEnabled,
    },
    {
      key: "mentionsEnabled" as const,
      label: "mentions",
      description: "when someone @mentions you in a message or post",
      icon: AtSignIcon,
      enabled: settings.mentionsEnabled,
    },
  ]

  const isEmailDisabled = settings.emailUnsubscribedAll

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/notifications">notifications</PageHeader.Crumb>
          <PageHeader.Crumb>settings</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6">
          <div className="space-y-6">
            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>in-app notifications</CardTitle>
                <CardDescription>
                  control which activities trigger notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {inAppSettingsItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                          <Icon className="text-muted-foreground size-4" />
                        </div>
                        <div>
                          <Label
                            htmlFor={item.key}
                            className="cursor-pointer text-sm font-medium"
                          >
                            {item.label}
                          </Label>
                          <p className="text-muted-foreground text-sm">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Checkbox
                        id={item.key}
                        checked={item.enabled}
                        onCheckedChange={(checked) =>
                          handleUpdate({ [item.key]: checked === true })
                        }
                        disabled={updateSettings.isPending}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Email Digest */}
            <Card className={isEmailDisabled ? "opacity-50" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  digest
                </CardTitle>
                <CardDescription>
                  get an email summary of notifications you may have missed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="text-muted-foreground w-20 text-sm">
                    frequency
                  </Label>
                  <Select
                    items={FREQUENCY_OPTIONS}
                    value={settings.emailDigestFrequency ?? "off"}
                    onValueChange={(value) =>
                      handleUpdate({
                        emailDigestFrequency: value as
                          | "off"
                          | "weekly"
                          | "monthly",
                      })
                    }
                    disabled={updateSettings.isPending || isEmailDisabled}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {settings.emailDigestFrequency !== "off" &&
                  !isEmailDisabled && (
                    <div className="ml-0 space-y-4 border-l-2 pl-4">
                      {settings.emailDigestFrequency === "weekly" && (
                        <div className="flex items-center gap-4">
                          <Label className="text-muted-foreground w-20 text-sm">
                            day
                          </Label>
                          <Select
                            items={DAYS_OF_WEEK}
                            value={String(settings.emailDigestDayOfWeek ?? 0)}
                            onValueChange={(value) =>
                              handleUpdate({
                                emailDigestDayOfWeek: Number(value),
                              })
                            }
                            disabled={updateSettings.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {settings.emailDigestFrequency === "monthly" && (
                        <div className="flex items-center gap-4">
                          <Label className="text-muted-foreground w-20 text-sm">
                            day
                          </Label>
                          <Select
                            items={DAYS_OF_MONTH}
                            value={String(settings.emailDigestDayOfMonth ?? 1)}
                            onValueChange={(value) =>
                              handleUpdate({
                                emailDigestDayOfMonth: Number(value),
                              })
                            }
                            disabled={updateSettings.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_MONTH.map((day) => (
                                <SelectItem key={day.value} value={day.value}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <Label className="text-muted-foreground w-20 text-sm">
                          time
                        </Label>
                        <Select
                          items={HOURS_OF_DAY}
                          value={String(settings.emailDigestHourUtc ?? 9)}
                          onValueChange={(value) =>
                            handleUpdate({ emailDigestHourUtc: Number(value) })
                          }
                          disabled={updateSettings.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HOURS_OF_DAY.map((hour) => (
                              <SelectItem key={hour.value} value={hour.value}>
                                {hour.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Game Reminders */}
            <Card className={isEmailDisabled ? "opacity-50" : undefined}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  game reminders
                </CardTitle>
                <CardDescription>
                  get email notifications about rack-it-up rounds starting and
                  what
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Game Start Reminder */}
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                        <CalendarClock className="text-muted-foreground size-4" />
                      </div>
                      <div>
                        <Label
                          htmlFor="gameStartReminderEnabled"
                          className="cursor-pointer text-sm font-medium"
                        >
                          round start reminder
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          get notified when a new rack-it-up round is about to
                          start
                        </p>
                      </div>
                    </div>
                    <Checkbox
                      id="gameStartReminderEnabled"
                      checked={settings.gameStartReminderEnabled}
                      onCheckedChange={(checked) =>
                        handleUpdate({
                          gameStartReminderEnabled: checked === true,
                        })
                      }
                      disabled={updateSettings.isPending || isEmailDisabled}
                    />
                  </div>

                  {settings.gameStartReminderEnabled && !isEmailDisabled && (
                    <div className="mt-4 ml-11 flex items-center gap-4">
                      <Label className="text-muted-foreground text-sm">
                        remind me
                      </Label>
                      <Select
                        items={HOURS_BEFORE_OPTIONS}
                        value={String(
                          settings.gameStartReminderHoursBefore ?? 24,
                        )}
                        onValueChange={(value) =>
                          handleUpdate({
                            gameStartReminderHoursBefore: Number(value),
                          })
                        }
                        disabled={updateSettings.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HOURS_BEFORE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-sm">
                        before
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unsubscribe All */}
            <Card
              className={
                settings.emailUnsubscribedAll
                  ? "border-destructive/50 bg-destructive/5"
                  : undefined
              }
            >
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <Label
                    htmlFor="emailUnsubscribedAll"
                    className="cursor-pointer text-sm font-medium"
                  >
                    unsubscribe from all emails
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    stop receiving all email notifications (except account
                    related emails)
                  </p>
                </div>
                <Checkbox
                  id="emailUnsubscribedAll"
                  checked={settings.emailUnsubscribedAll}
                  onCheckedChange={(checked) =>
                    handleUpdate({ emailUnsubscribedAll: checked === true })
                  }
                  disabled={updateSettings.isPending}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
