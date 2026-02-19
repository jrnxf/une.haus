import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  Heart,
  Mail,
  MessageCircle,
  Sparkles,
  TrafficConeIcon,
  Trophy,
  UserPlus,
} from "lucide-react";
import { useEffect } from "react";

import { toast } from "sonner";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { notificationSettings } from "~/lib/notification-settings";
import type { UpdateNotificationSettingsInput } from "~/lib/notification-settings/schemas";

const searchSchema = z.object({
  unsubscribed: z.enum(["digest", "game_start", "pre_trick", "all"]).optional(),
});

export const Route = createFileRoute("/_authed/notifications/settings")({
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "notifications", to: "/notifications" },
        { label: "settings" },
      ],
      maxWidth: "2xl",
    },
  },
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      notificationSettings.get.queryOptions(),
    );
  },
  component: RouteComponent,
});

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const HOURS_OF_DAY = Array.from({ length: 24 }, (_, i) => ({
  value: String(i),
  label: `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i < 12 ? "AM" : "PM"} UTC`,
}));

const HOURS_BEFORE_OPTIONS = [
  { value: "12", label: "12 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

const DAYS_BEFORE_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "2", label: "2 days" },
  { value: "3", label: "3 days" },
  { value: "7", label: "1 week" },
];

function RouteComponent() {
  const qc = useQueryClient();
  const { unsubscribed } = useSearch({
    from: "/_authed/notifications/settings",
  });
  const { data: settings } = useSuspenseQuery(
    notificationSettings.get.queryOptions(),
  );

  useEffect(() => {
    if (unsubscribed) {
      const messages: Record<string, string> = {
        digest: "You've been unsubscribed from digest emails",
        game_start: "You've been unsubscribed from game start reminders",
        pre_trick: "You've been unsubscribed from pre-game trick reminders",
        all: "You've been unsubscribed from all emails",
      };
      toast.success(messages[unsubscribed]);
    }
  }, [unsubscribed]);

  const updateSettings = useMutation({
    mutationFn: notificationSettings.update.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-settings.get"] });
    },
  });

  const handleUpdate = (updates: UpdateNotificationSettingsInput) => {
    updateSettings.mutate({ data: updates });
  };

  const inAppSettingsItems = [
    {
      key: "likesEnabled" as const,
      label: "Likes",
      description: "When someone likes your posts, sets, or submissions",
      icon: Heart,
      enabled: settings.likesEnabled,
    },
    {
      key: "commentsEnabled" as const,
      label: "Comments",
      description: "When someone comments on your content",
      icon: MessageCircle,
      enabled: settings.commentsEnabled,
    },
    {
      key: "followsEnabled" as const,
      label: "New followers",
      description: "When someone starts following you",
      icon: UserPlus,
      enabled: settings.followsEnabled,
    },
    {
      key: "newContentEnabled" as const,
      label: "New content from followed users",
      description: "When someone you follow creates a new post or set",
      icon: Sparkles,
      enabled: settings.newContentEnabled,
    },
  ];

  const isEmailDisabled = settings.emailUnsubscribedAll;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <Bell className="text-muted-foreground size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">notifications settings</h1>
              <p className="text-muted-foreground text-sm">
                choose what notifications you want to receive
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* In-App Notifications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>in-app notifications</CardTitle>
              <CardDescription>
                control which activities trigger notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {inAppSettingsItems.map((item) => {
                const Icon = item.icon;
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
                );
              })}
            </CardContent>
          </Card>

          {/* Email Digest */}
          <Card className={isEmailDisabled ? "opacity-50" : undefined}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Mail className="size-5" />
                digest
              </CardTitle>
              <CardDescription>
                get an email summary of notifications you may have missed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label
                    htmlFor="emailDigestEnabled"
                    className="cursor-pointer text-sm font-medium"
                  >
                    send me a digest of missed notifications
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    receive a summary of likes, comments, and new followers
                  </p>
                </div>
                <Checkbox
                  id="emailDigestEnabled"
                  checked={settings.emailDigestEnabled}
                  onCheckedChange={(checked) =>
                    handleUpdate({ emailDigestEnabled: checked === true })
                  }
                  disabled={updateSettings.isPending || isEmailDisabled}
                />
              </div>

              {settings.emailDigestEnabled && !isEmailDisabled && (
                <div className="ml-0 space-y-4 border-l-2 pl-4">
                  <div className="flex items-center gap-4">
                    <Label className="text-muted-foreground w-20 text-sm">
                      frequency
                    </Label>
                    <Select
                      value={settings.emailDigestFrequency ?? "weekly"}
                      onValueChange={(value) =>
                        handleUpdate({
                          emailDigestFrequency: value as "daily" | "weekly",
                        })
                      }
                      disabled={updateSettings.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {settings.emailDigestFrequency === "weekly" && (
                    <div className="flex items-center gap-4">
                      <Label className="text-muted-foreground w-20 text-sm">
                        day
                      </Label>
                      <Select
                        value={String(settings.emailDigestDayOfWeek ?? 0)}
                        onValueChange={(value) =>
                          handleUpdate({ emailDigestDayOfWeek: Number(value) })
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

                  <div className="flex items-center gap-4">
                    <Label className="text-muted-foreground w-20 text-sm">
                      time
                    </Label>
                    <Select
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
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5" />
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

              {/* Pre-Trick Reminder */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md">
                      <TrafficConeIcon className="text-muted-foreground size-4" />
                    </div>
                    <div>
                      <Label
                        htmlFor="preTrickReminderEnabled"
                        className="cursor-pointer text-sm font-medium"
                      >
                        pre-game trick reminder
                      </Label>
                      <p className="text-muted-foreground text-sm">
                        get a reminder of your submitted sets before the round
                        starts
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    id="preTrickReminderEnabled"
                    checked={settings.preTrickReminderEnabled}
                    onCheckedChange={(checked) =>
                      handleUpdate({
                        preTrickReminderEnabled: checked === true,
                      })
                    }
                    disabled={updateSettings.isPending || isEmailDisabled}
                  />
                </div>

                {settings.preTrickReminderEnabled && !isEmailDisabled && (
                  <div className="mt-4 ml-11 flex items-center gap-4">
                    <Label className="text-muted-foreground text-sm">
                      remind me
                    </Label>
                    <Select
                      value={String(settings.preTrickReminderDaysBefore ?? 1)}
                      onValueChange={(value) =>
                        handleUpdate({
                          preTrickReminderDaysBefore: Number(value),
                        })
                      }
                      disabled={updateSettings.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_BEFORE_OPTIONS.map((opt) => (
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
                  stop receiving all email notifications (except account related
                  emails)
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
  );
}
