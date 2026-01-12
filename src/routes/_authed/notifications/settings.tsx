import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bell,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { notificationSettings } from "~/lib/notification-settings";

export const Route = createFileRoute("/_authed/notifications/settings")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      notificationSettings.get.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(
    notificationSettings.get.queryOptions(),
  );

  const updateSettings = useMutation({
    mutationFn: notificationSettings.update.fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-settings.get"] });
    },
  });

  const handleToggle = (
    key:
      | "likesEnabled"
      | "commentsEnabled"
      | "followsEnabled"
      | "newContentEnabled",
    checked: boolean,
  ) => {
    updateSettings.mutate({
      data: { [key]: checked },
    });
  };

  const settingsItems = [
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-4">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="mb-4" asChild>
            <Link to="/notifications">
              <ArrowLeft className="mr-2 size-4" />
              Back to notifications
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
              <Bell className="text-muted-foreground size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Notification Settings</h1>
              <p className="text-muted-foreground text-sm">
                Choose what notifications you want to receive
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Email & In-App Notifications</CardTitle>
            <CardDescription>
              Control which activities trigger notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsItems.map((item) => {
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
                      handleToggle(item.key, checked === true)
                    }
                    disabled={updateSettings.isPending}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Info card */}
        <Card className="mt-4 border-dashed">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              Changes are saved automatically. Disabling a notification type
              will prevent new notifications from being created, but won't
              delete existing ones.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
