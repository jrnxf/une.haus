import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { UnicycleGame } from "~/components/arcade/arcade"
import { PageHeader } from "~/components/page-header"
import { arcade } from "~/lib/arcade"

export const Route = createFileRoute("/arcade")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      arcade.highScore.get.queryOptions(),
    )
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { data: serverHighScore } = useQuery(
    arcade.highScore.get.queryOptions(),
  )

  const { mutate: saveHighScore } = useMutation({
    mutationFn: arcade.highScore.save.fn,
  })

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>arcade</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <UnicycleGame
        initialHighScore={serverHighScore}
        onHighScore={(score) => saveHighScore({ data: { score } })}
      />
    </>
  )
}
