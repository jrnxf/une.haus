import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { PageHeader } from "~/components/page-header"
import { GameVideoPicker } from "~/components/tricks/game-video-picker"
import { VideoSubmitForm } from "~/components/tricks/video-submit-form"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Field, FieldLabel } from "~/components/ui/field"
import { getMuxPoster } from "~/components/video-player"
import { tricks } from "~/lib/tricks"
import { useLandTrick } from "~/lib/tricks/landings/hooks"
import { cn } from "~/lib/utils"

// Tolerant match, mirroring GameVideoPicker: "tiger-flip" finds "tiger flip"
const strip = (s: string) => s.toLowerCase().replaceAll(/[^a-z0-9]/g, "")

export const Route = createFileRoute("/_authed/tricks/$trickId/land")({
  loader: async ({ context, params }) => {
    const trickId = Number(params.trickId)
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.get.queryOptions({ id: trickId }),
      ),
      context.queryClient.ensureQueryData(
        tricks.videos.list.queryOptions({ trickId, status: "active" }),
      ),
      context.queryClient.ensureQueryData(
        tricks.landings.gameVideos.queryOptions(),
      ),
    ])
  },
  component: RouteComponent,
})

function SingleTrickAttestation({
  trickName,
  checked,
  onChange,
}: {
  trickName: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="items-start gap-2">
      <Checkbox
        id="confirmed-single-trick"
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <FieldLabel htmlFor="confirmed-single-trick" className="font-normal">
        only <span className="font-medium">{trickName}</span> in this clip
      </FieldLabel>
    </Field>
  )
}

function PathCard({
  selected,
  onSelect,
  label,
  count,
}: {
  selected: boolean
  onSelect: () => void
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "bg-card flex items-center gap-2 rounded-xl border p-4 text-left text-sm font-medium",
        selected && "border-primary bg-card-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "border-input relative size-4 shrink-0 rounded-full border",
          selected &&
            "border-primary after:bg-primary after:absolute after:inset-0.5 after:rounded-full",
        )}
      />
      {label}
      {count !== undefined && (
        <Badge variant="secondary" className="ml-auto">
          {count}
        </Badge>
      )}
    </button>
  )
}

function RouteComponent() {
  const router = useRouter()
  const { trickId } = Route.useParams()
  const id = Number(trickId)

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ id }))
  const { data: activeVideos } = useSuspenseQuery(
    tricks.videos.list.queryOptions({ trickId: id, status: "active" }),
  )
  const { data: gameVideos } = useSuspenseQuery(
    tricks.landings.gameVideos.queryOptions(),
  )

  const matchCount = useMemo(() => {
    if (!trick) return 0
    const q = strip(trick.name)
    return gameVideos.filter((v) => strip(v.label).includes(q)).length
  }, [gameVideos, trick])

  // Games footage is usually already on file — lead with it when it exists
  const [path, setPath] = useState<"upload" | "games">(
    matchCount > 0 ? "games" : "upload",
  )
  const [attested, setAttested] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const land = useLandTrick({
    onSuccess: () => {
      router.navigate({ to: "/tricks/$trickId", params: { trickId } })
    },
  })

  if (!trick) {
    return (
      <div className="p-6">
        <p>trick not found</p>
      </div>
    )
  }

  const posterUrl = getMuxPoster({
    playbackId: activeVideos[0]?.video?.playbackId,
    width: 320,
  })

  const submitLanding = (muxAssetId: string, notes: string | null = null) => {
    land.mutate({
      data: {
        trickId: trick.id,
        muxAssetId,
        notes,
        confirmedSingleTrick: true,
      },
    })
  }

  const cancel = () =>
    router.navigate({ to: "/tricks/$trickId", params: { trickId } })

  const attestation = (
    <SingleTrickAttestation
      trickName={trick.name}
      checked={attested}
      onChange={setAttested}
    />
  )

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to={`/tricks/${trickId}`}>
            {trick.name}
          </PageHeader.Crumb>
          <PageHeader.Crumb>land</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
        {/* Context header: what you're proving */}
        <div className="flex items-center gap-4">
          {posterUrl && (
            <img
              src={posterUrl}
              alt=""
              className="aspect-video w-24 shrink-0 rounded-lg bg-black object-cover"
            />
          )}
          <div>
            <h1 className="text-lg font-semibold">land {trick.name}</h1>
            <p className="text-muted-foreground text-sm">
              counts right away · reviewed before it appears on the trick page
            </p>
          </div>
        </div>

        {/* Path choice */}
        <div role="radiogroup" className="grid grid-cols-2 gap-2">
          <PathCard
            selected={path === "games"}
            onSelect={() => setPath("games")}
            label="from your games"
            count={matchCount}
          />
          <PathCard
            selected={path === "upload"}
            onSelect={() => setPath("upload")}
            label="upload a clip"
          />
        </div>

        {path === "upload" ? (
          <VideoSubmitForm
            trickName={trick.name}
            onSubmit={(data) =>
              submitLanding(data.muxAssetId, data.notes ?? null)
            }
            onCancel={cancel}
            isPending={land.isPending}
            submitDisabled={!attested}
            attestation={attestation}
          />
        ) : gameVideos.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no game footage</EmptyTitle>
              <EmptyDescription>
                your sets and submissions with playable footage will show up
                here
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => setPath("upload")}>
                upload
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <GameVideoPicker
              videos={gameVideos}
              value={selectedAssetId}
              onChange={setSelectedAssetId}
              defaultQuery={trick.name}
            />

            {/* Confirm footer: attestation + actions together */}
            <div className="space-y-4 border-t pt-4">
              {attestation}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancel}>
                  cancel
                </Button>
                <Button
                  disabled={!selectedAssetId || !attested || land.isPending}
                  onClick={() => {
                    if (selectedAssetId) submitLanding(selectedAssetId)
                  }}
                >
                  <span role="status">
                    {land.isPending ? "saving..." : "submit"}
                  </span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
