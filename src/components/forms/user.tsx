import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { type Resolver, useForm } from "react-hook-form"
import { toast } from "sonner"
import { type z } from "zod"

import { BadgeInput } from "~/components/input/badge-input"
import { ImageInput } from "~/components/input/image-input"
import { LocationSelector } from "~/components/input/location-selector"
import { MentionTextarea } from "~/components/input/mention-textarea"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import { USER_DISCIPLINES } from "~/db/schema"
import { auth } from "~/lib/auth"
import { session } from "~/lib/session"
import { users } from "~/lib/users"

type FormValues = z.infer<typeof users.update.schema>

export function UserForm({
  user,
  mode = "edit",
  redirectTo,
  pendingEmail,
}: {
  user?: z.infer<typeof users.update.schema> & { id?: number }
  /** "register" submits through auth.register with the session-verified email */
  mode?: "edit" | "register"
  /** register mode: where to navigate after the account is created */
  redirectTo?: string
  /** register mode: the verified email the account will be created under */
  pendingEmail?: string
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isRegister = mode === "register"

  const updateUser = useMutation({
    mutationFn: users.update.fn,
    onSuccess: async () => {
      if (user?.id) {
        qc.removeQueries({
          queryKey: users.get.queryOptions({ userId: user.id }).queryKey,
        })
      }
      qc.removeQueries({
        queryKey: [users.list.infiniteQueryOptions({}).queryKey[0]],
      })
      // Reset session so sidebar user info updates
      await qc.resetQueries({ queryKey: session.get.queryOptions().queryKey })
      toast.success("profile updated")

      navigate({ to: "/auth/me" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const registerUser = useMutation({
    mutationFn: auth.register.fn,
    onSuccess: async () => {
      await qc.resetQueries({ queryKey: session.get.queryOptions().queryKey })
      toast.success("welcome to une.haus!")
      navigate({ to: redirectTo ?? "/auth/me" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rhf = useForm<FormValues>({
    defaultValues: user ?? {
      avatarId: null,
      bio: "",
      email: "",
      name: "",
      disciplines: [],
      location: null,
      socials: {
        facebook: "",
        instagram: "",
        spotify: "",
        tiktok: "",
        twitter: "",
        youtube: "",
      },
    },
    // The register schema is the update schema minus email (session-proven)
    // and avatar (upload requires an authed session), so the cast is sound
    resolver: zodResolver(
      isRegister ? auth.register.schema : users.update.schema,
    ) as Resolver<FormValues>,
  })

  const { control, handleSubmit } = rhf

  const submit = (data: FormValues) => {
    if (!isRegister) {
      updateUser.mutate({ data })
      return
    }
    registerUser.mutate({
      data: {
        name: data.name,
        bio: data.bio || undefined,
        location: data.location ?? undefined,
        disciplines: data.disciplines?.length ? data.disciplines : undefined,
        socials:
          data.socials && Object.values(data.socials).some(Boolean)
            ? data.socials
            : undefined,
      },
    })
  }

  return (
    <Form
      rhf={rhf}
      className="mx-auto flex w-full flex-col gap-4"
      id="main-content"
      method="post"
      onSubmit={(event) => {
        event.preventDefault()
        handleSubmit(submit)(event)
      }}
    >
      {isRegister && pendingEmail && (
        <p className="text-muted-foreground text-sm">
          registering as {pendingEmail}
        </p>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>location</FormLabel>
              <FormControl>
                <LocationSelector
                  onUpdate={field.onChange}
                  placeholder={user?.location?.label}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="bio"
        render={({ field }) => (
          <FormItem>
            <FormLabel>bio</FormLabel>
            <FormControl>
              <MentionTextarea
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="disciplines"
        render={({ field }) => (
          <FormItem>
            <FormLabel>disciplines</FormLabel>
            <FormControl>
              <BadgeInput
                defaultSelections={field.value}
                onChange={field.onChange}
                options={USER_DISCIPLINES}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
        <FormField
          control={control}
          name="socials.facebook"
          render={({ field }) => (
            <FormItem>
              <FormLabel>facebook</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="socials.tiktok"
          render={({ field }) => (
            <FormItem>
              <FormLabel>tiktok</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="socials.twitter"
          render={({ field }) => (
            <FormItem>
              <FormLabel>twitter</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="socials.youtube"
          render={({ field }) => (
            <FormItem>
              <FormLabel>youtube</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="socials.instagram"
          render={({ field }) => (
            <FormItem>
              <FormLabel>instagram</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="socials.spotify"
          render={({ field }) => (
            <FormItem>
              <FormLabel>spotify</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {!isRegister && (
        <FormField
          control={control}
          name="avatarId"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>avatar</FormLabel>
                <ImageInput
                  previewClassNames="rounded-md size-86"
                  value={field.value}
                  onChange={(data) => {
                    field.onChange(data ?? null)
                  }}
                />
              </FormItem>
            )
          }}
        />
      )}

      <ButtonGroup className="ml-auto">
        <ButtonGroup>
          <Button asChild variant="secondary">
            <Link to={isRegister ? "/auth" : "/auth/me"}>cancel</Link>
          </Button>
        </ButtonGroup>
        <FormSubmitButton
          busy={isRegister ? registerUser.isPending : updateUser.isPending}
        />
      </ButtonGroup>
    </Form>
  )
}
