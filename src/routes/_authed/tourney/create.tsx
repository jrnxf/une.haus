import { zodResolver } from "@hookform/resolvers/zod"
import { createFileRoute } from "@tanstack/react-router"
import { ShieldIcon } from "lucide-react"
import { Suspense, useState } from "react"
import { useForm } from "react-hook-form"
import { type z } from "zod"

import { RiderSelector } from "~/components/input/rider-selector"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { useIsAdmin } from "~/lib/session/hooks"
import { generateOrderId, type OrderedRiderEntry } from "~/lib/tourney/bracket"
import { useCreateTournament } from "~/lib/tourney/hooks"
import { createTournamentSchema } from "~/lib/tourney/schemas"
import { users } from "~/lib/users"

const seedPresets = [4, 8, 16, 32]

const timePresets = [
  { label: "30s", value: 30 },
  { label: "45s", value: 45 },
  { label: "1m", value: 60 },
  { label: "90s", value: 90 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
]

const bracketSizeOptions = [4, 8, 16, 32] as const

export const Route = createFileRoute("/_authed/tourney/create")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(users.all.queryOptions())
  },
  component: RouteComponent,
})

function RouteComponent() {
  const isAdmin = useIsAdmin()
  const createMutation = useCreateTournament()

  const [orderedRiders, setOrderedRiders] = useState<OrderedRiderEntry[]>([])
  const [prelimTime, setPrelimTime] = useState(60)
  const [battleTime, setBattleTime] = useState(60)
  const [finalsTime, setFinalsTime] = useState(120)
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16 | 32>(8)

  const rhf = useForm<z.input<typeof createTournamentSchema>>({
    resolver: zodResolver(createTournamentSchema),
    defaultValues: {
      name: "",
      riders: [],
      prelimTime: 60,
      battleTime: 60,
      finalsTime: 120,
      bracketSize: 8,
    },
  })

  const { control, handleSubmit, setValue } = rhf

  const loadDemo = async (count: number) => {
    const slotsToFill = count - orderedRiders.length
    if (slotsToFill <= 0) return

    const allUsers = await users.all.fn()
    const existingUserIds = new Set(
      orderedRiders.filter((r) => r.userId).map((r) => r.userId),
    )
    const withAvatars = allUsers.filter(
      (u) => u.avatarId && !existingUserIds.has(u.id),
    )
    const shuffled = [...withAvatars].toSorted(() => Math.random() - 0.5)
    const newRiders: OrderedRiderEntry[] = shuffled
      .slice(0, slotsToFill)
      .map((u) => ({
        orderId: generateOrderId(),
        userId: u.id,
        name: u.name,
      }))
    const updated = [...orderedRiders, ...newRiders]
    setOrderedRiders(updated)
    setValue(
      "riders",
      updated.map((r) => ({ userId: r.userId, name: r.name })),
      { shouldValidate: true },
    )
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>create</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-xl p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>roster</CardTitle>
                <CardDescription>
                  add riders and start the tournament
                </CardDescription>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label="admin menu"
                      />
                    }
                  >
                    <ShieldIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {seedPresets.map((count) => {
                      const slotsToFill = count - orderedRiders.length
                      return (
                        <DropdownMenuItem
                          key={count}
                          onClick={() => loadDemo(count)}
                          disabled={slotsToFill <= 0}
                        >
                          seed random {count}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <Form
              rhf={rhf}
              className="space-y-6"
              onSubmit={(event) => {
                handleSubmit((data) => {
                  createMutation.mutate({ data })
                })(event)
              }}
            >
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>event name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={`euc winter '${String(new Date().getFullYear()).slice(2)}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="riders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>riders</FormLabel>
                    <FormControl>
                      <Suspense
                        fallback={<Input disabled placeholder="search..." />}
                      >
                        <RiderSelector
                          value={orderedRiders}
                          onChange={(newRiders) => {
                            setOrderedRiders(newRiders)
                            field.onChange(
                              newRiders.map((r) => ({
                                userId: r.userId,
                                name: r.name,
                              })),
                            )
                          }}
                        />
                      </Suspense>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>bracket size</Label>
                <div className="flex gap-2">
                  {bracketSizeOptions.map((size) => (
                    <Button
                      key={size}
                      type="button"
                      variant={bracketSize === size ? "default" : "secondary"}
                      size="sm"
                      onClick={() => {
                        setBracketSize(size)
                        setValue("bracketSize", size)
                      }}
                    >
                      {size}
                    </Button>
                  ))}
                </div>
                <p className="text-muted-foreground text-xs">
                  top {bracketSize} riders from prelims advance to the bracket
                </p>
              </div>

              <div className="space-y-4">
                <Label>timer durations</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      prelims
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={
                            prelimTime === preset.value
                              ? "default"
                              : "secondary"
                          }
                          size="sm"
                          onClick={() => {
                            setPrelimTime(preset.value)
                            setValue("prelimTime", preset.value)
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      battles
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={
                            battleTime === preset.value
                              ? "default"
                              : "secondary"
                          }
                          size="sm"
                          onClick={() => {
                            setBattleTime(preset.value)
                            setValue("battleTime", preset.value)
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">
                      final battles
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={
                            finalsTime === preset.value
                              ? "default"
                              : "secondary"
                          }
                          size="sm"
                          onClick={() => {
                            setFinalsTime(preset.value)
                            setValue("finalsTime", preset.value)
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  create
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
