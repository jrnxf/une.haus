import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { VaultVideoPicker } from "~/components/tricks/vault-video-picker"
import { VideoSubmitForm } from "~/components/tricks/video-submit-form"
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
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { useSessionUser } from "~/lib/session/hooks"
import { tricks } from "~/lib/tricks"

export const Route = createFileRoute("/_authed/tricks/$trickId/land")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ id: Number(params.trickId) }),
    )
  },
  component: RouteComponent,
})

function SingleTrickAttestation({
  id,
  trickName,
  checked,
  onChange,
}: {
  id: string
  trickName: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Field orientation="horizontal" className="items-start gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <FieldLabel htmlFor={id} className="font-normal">
        this video contains only{" "}
        <span className="font-medium">{trickName}</span> — sets with multiple
        tricks will be rejected
      </FieldLabel>
    </Field>
  )
}

function VaultPath({
  trickName,
  onSubmit,
  isPending,
  onSwitchToUpload,
}: {
  trickName: string
  onSubmit: (muxAssetId: string) => void
  isPending: boolean
  onSwitchToUpload: () => void
}) {
  const { data: vaultVideos, isPending: isLoading } = useQuery(
    tricks.landings.vault.queryOptions(),
  )
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const [attested, setAttested] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="bg-muted h-20 w-full animate-pulse rounded-md" />
        <div className="bg-muted h-20 w-full animate-pulse rounded-md" />
        <div className="bg-muted h-20 w-full animate-pulse rounded-md" />
      </div>
    )
  }

  if (!vaultVideos || vaultVideos.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GhostIcon />
          </EmptyMedia>
          <EmptyTitle>no vault videos</EmptyTitle>
          <EmptyDescription>
            you don&apos;t appear in any vault videos with playable footage
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onSwitchToUpload}>
            upload
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="space-y-4">
      <VaultVideoPicker
        videos={vaultVideos}
        value={selectedAssetId}
        onChange={setSelectedAssetId}
      />

      <SingleTrickAttestation
        id="vault-confirmed-single-trick"
        trickName={trickName}
        checked={attested}
        onChange={setAttested}
      />

      <Button
        disabled={!selectedAssetId || !attested || isPending}
        onClick={() => {
          if (selectedAssetId) onSubmit(selectedAssetId)
        }}
      >
        <span role="status">{isPending ? "saving..." : "save"}</span>
      </Button>
    </div>
  )
}

function RouteComponent() {
  const router = useRouter()
  const qc = useQueryClient()
  const sessionUser = useSessionUser()
  const { trickId } = Route.useParams()
  const id = Number(trickId)

  const { data: trick } = useSuspenseQuery(tricks.get.queryOptions({ id }))

  const [path, setPath] = useState<"upload" | "vault">("upload")
  const [attested, setAttested] = useState(false)

  const land = useMutation({
    mutationFn: tricks.landings.land.fn,
    onSuccess: () => {
      toast.success("landing submitted")
      qc.removeQueries({
        queryKey: tricks.landings.mine.queryOptions().queryKey,
      })
      qc.removeQueries({
        queryKey: tricks.landings.counts.queryOptions().queryKey,
      })
      if (sessionUser) {
        qc.removeQueries({
          queryKey: tricks.landings.forUser.queryOptions({
            userId: sessionUser.id,
          }).queryKey,
        })
      }
      router.navigate({ to: "/tricks/$trickId", params: { trickId } })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (!trick) {
    return (
      <div className="p-6">
        <p>trick not found</p>
      </div>
    )
  }

  let panel: ReactNode
  if (path === "upload") {
    panel = (
      <VideoSubmitForm
        trickName={trick.name}
        onSubmit={(data) => {
          land.mutate({
            data: {
              trickId: trick.id,
              muxAssetId: data.muxAssetId,
              notes: data.notes ?? null,
              confirmedSingleTrick: true,
            },
          })
        }}
        onCancel={() =>
          router.navigate({ to: "/tricks/$trickId", params: { trickId } })
        }
        isPending={land.isPending}
        submitDisabled={!attested}
        attestation={
          <SingleTrickAttestation
            id="upload-confirmed-single-trick"
            trickName={trick.name}
            checked={attested}
            onChange={setAttested}
          />
        }
      />
    )
  } else {
    panel = (
      <VaultPath
        trickName={trick.name}
        isPending={land.isPending}
        onSwitchToUpload={() => setPath("upload")}
        onSubmit={(muxAssetId) => {
          land.mutate({
            data: {
              trickId: trick.id,
              muxAssetId,
              notes: null,
              confirmedSingleTrick: true,
            },
          })
        }}
      />
    )
  }

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
        <p className="text-muted-foreground text-sm">
          prove it. your video counts as a landing right away and will be
          reviewed before appearing on the trick page.
        </p>

        <Tabs
          value={path}
          onValueChange={(next) => {
            if (next === "upload" || next === "vault") setPath(next)
          }}
        >
          <TabsList>
            <TabsTrigger value="upload">upload</TabsTrigger>
            <TabsTrigger value="vault">from vault</TabsTrigger>
          </TabsList>
        </Tabs>

        {panel}
      </div>
    </>
  )
}
