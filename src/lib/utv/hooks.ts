import { useMutation, useQueryClient } from "@tanstack/react-query";

import { utv, type UtvVideosData } from "~/lib/utv/core";

export function useUpdateScale() {
  const qc = useQueryClient();

  const queryKey = utv.all.queryOptions().queryKey;

  return useMutation({
    mutationFn: utv.updateScale.fn,
    onMutate: async ({ data }) => {
      await qc.cancelQueries({ queryKey });

      const prev = qc.getQueryData<UtvVideosData>(queryKey);

      // Optimistically update the scale
      qc.setQueryData<UtvVideosData>(queryKey, (old) => {
        if (!old) return old;
        return old.map((video) =>
          video.id === data.id ? { ...video, scale: data.scale } : video,
        );
      });

      return { prev };
    },
    onError: (_err, _variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateThumbnailSeconds() {
  const qc = useQueryClient();

  const queryKey = utv.all.queryOptions().queryKey;

  return useMutation({
    mutationFn: utv.updateThumbnailSeconds.fn,
    onMutate: async ({ data }) => {
      await qc.cancelQueries({ queryKey });

      const prev = qc.getQueryData<UtvVideosData>(queryKey);

      qc.setQueryData<UtvVideosData>(queryKey, (old) => {
        if (!old) return old;
        return old.map((video) =>
          video.id === data.id
            ? { ...video, thumbnailSeconds: data.thumbnailSeconds }
            : video,
        );
      });

      return { prev };
    },
    onError: (_err, _variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateTitle() {
  const qc = useQueryClient();

  const queryKey = utv.all.queryOptions().queryKey;

  return useMutation({
    mutationFn: utv.updateTitle.fn,
    onMutate: async ({ data }) => {
      await qc.cancelQueries({ queryKey });

      const prev = qc.getQueryData<UtvVideosData>(queryKey);

      qc.setQueryData<UtvVideosData>(queryKey, (old) => {
        if (!old) return old;
        return old.map((video) =>
          video.id === data.id ? { ...video, title: data.title } : video,
        );
      });

      return { prev };
    },
    onError: (_err, _variables, context) => {
      if (context?.prev) {
        qc.setQueryData(queryKey, context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
  });
}
