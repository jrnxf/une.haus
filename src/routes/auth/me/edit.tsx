import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import invariant from "tiny-invariant";
import { useSessionUser } from "~/lib/session";

import { BadgeInput } from "~/components/badge-input";
import { ImageInput } from "~/components/image-input";
// import { LocationSelector } from "~/components/location-selector";
import { Button } from "~/components/ui/button";
import { FormMessage, FormSubmitButton } from "~/components/ui/form";
import { FormOpsProvider } from "~/components/ui/form-ops-provider";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { type UpdateUserArgs, updateUserSchema } from "~/models/users";
import { LocationSelector } from "~/components/location-selector";
import { useTRPC } from "~/integrations/trpc/react";
import { toast } from "sonner";
import { USER_DISCIPLINES } from "~/db/schema";

export const Route = createFileRoute("/auth/me/edit")({
  component: RouteComponent,
  loader: async ({ context, location }) => {
    const sessionUser = context.session.user;

    if (!sessionUser) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
    await context.queryClient.ensureQueryData(
      context.trpc.user.get.queryOptions({ userId: sessionUser.id }),
    );
  },
});

function RouteComponent() {
  const trpc = useTRPC();
  const sessionUser = useSessionUser();
  invariant(sessionUser, "Authentication required");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: user } = useSuspenseQuery(
    trpc.user.get.queryOptions({ userId: sessionUser.id }),
  );

  const updateUser = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: async (data) => {
        console.log(data);
        await qc.invalidateQueries({
          queryKey: trpc.user.get.queryKey({ userId: sessionUser.id }),
        });
        toast.success("Profile updated");
        navigate({
          to: "/auth/me",
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<UpdateUserArgs>({
    defaultValues: user,
    resolver: zodResolver(updateUserSchema),
  });

  return (
    <div className="mx-auto w-full max-w-5xl p-8" id="main-content">
      <FormOpsProvider>
        <form
          className="flex flex-col gap-4"
          method="post"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit((data) => {
              updateUser.mutate(data);
            })(event);
          }}
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input {...register("name")} autoFocus id="name" />
              <FormMessage error={errors.name} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="location">Location</Label>
              <Controller
                control={control}
                name="location"
                render={({ field: { onChange } }) => (
                  <LocationSelector
                    id="location"
                    onUpdate={onChange}
                    placeholder={user.location?.formattedAddress}
                  />
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea {...register("bio")} id="bio" />
            <FormMessage error={errors.bio} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bio">Disciplines</Label>
            <Controller
              control={control}
              name="disciplines"
              render={({ field: { onChange, value } }) => (
                <BadgeInput
                  defaultSelections={value}
                  onChange={onChange}
                  options={USER_DISCIPLINES}
                />
              )}
            />
            <FormMessage error={errors.disciplines} />
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input {...register("socials.facebook")} id="facebook" />
              <FormMessage error={errors.socials?.facebook} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input {...register("socials.tiktok")} id="tiktok" />
              <FormMessage error={errors.socials?.tiktok} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="twitter">Twitter</Label>
              <Input {...register("socials.twitter")} id="twitter" />
              <FormMessage error={errors.socials?.twitter} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="youtube">YouTube</Label>
              <Input {...register("socials.youtube")} id="youtube" />
              <FormMessage error={errors.socials?.youtube} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input {...register("socials.instagram")} id="instagram" />
              <FormMessage error={errors.socials?.instagram} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="spotify">Spotify</Label>
              <Input {...register("socials.spotify")} id="spotify" />
              <FormMessage error={errors.socials?.spotify} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="avatarUrl">Avatar</Label>
            <Controller
              control={control}
              name="avatarUrl"
              render={({ field: { value } }) => (
                <ImageInput
                  currentUrl={value}
                  id="avatarUrl"
                  onChange={(url) => setValue("avatarUrl", url)}
                />
              )}
            />
            <FormMessage error={errors.avatarUrl} />
          </div>

          <div className="flex justify-end gap-2">
            <Button asChild variant="secondary">
              <Link to="/auth/me">Cancel</Link>
            </Button>
            <FormSubmitButton busy={updateUser.isPending} />
          </div>
        </form>
      </FormOpsProvider>
    </div>
  );
}
