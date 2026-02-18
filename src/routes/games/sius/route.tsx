import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/games/sius")({
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "games", to: "/games" }, { label: "stack it up" }],
      maxWidth: "4xl",
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <Outlet />
    </div>
  );
}
