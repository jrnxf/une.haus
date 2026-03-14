import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { seo } from "~/lib/seo"
import { users } from "~/lib/users"
import { MapView } from "~/views/map"

const mapSearchSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  z: z.number().optional(),
})

export const Route = createFileRoute("/users/map/")({
  validateSearch: mapSearchSchema,
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      users.withLocations.queryOptions(),
    )
  },
  head: () =>
    seo({
      title: "map",
      description: "find unicyclists around the world",
      path: "/users/map",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const { data } = useSuspenseQuery(users.withLocations.queryOptions())
  const search = Route.useSearch()
  const navigate = useNavigate()

  const handleMapMove = useCallback(
    (center: [number, number], zoom: number) => {
      navigate({
        to: "/users/map",
        search: {
          lng: Math.round(center[0] * 1000) / 1000,
          lat: Math.round(center[1] * 1000) / 1000,
          z: Math.round(zoom * 10) / 10,
        },
        replace: true,
      })
    },
    [navigate],
  )

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb>map</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="min-h-0 flex-1">
        <MapView
          users={data}
          initialCenter={
            search.lng !== undefined && search.lat !== undefined
              ? [search.lng, search.lat]
              : undefined
          }
          initialZoom={search.z}
          onMapMove={handleMapMove}
        />
      </div>
    </>
  )
}
