import { createFileRoute } from "@tanstack/react-router";

import { toast } from "sonner";

import { UserSelector } from "~/components/input/user-selector";

export const Route = createFileRoute("/sandbox")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto grid h-full max-w-4xl grid-cols-1 gap-3 p-3">
      <UserSelector
        initialUserId={1}
        onSelect={(user) => {
          toast.success(`Selected user: ${user?.name}`);
        }}
      />
    </div>
  );
}
