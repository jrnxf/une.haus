import { useCallback, useRef } from "react";

export function useScroll({
  scrollTargetId,
}: { scrollTargetId?: string } = {}) {
  const reference = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback(
    (place: "bottom" | "top", threshold: number) => {
      // If a target ID is provided, scroll that element
      if (scrollTargetId) {
        const target = document.querySelector<HTMLElement>(
          `#${scrollTargetId}`,
        );
        if (!target) return;

        const { clientHeight, scrollHeight, scrollTop } = target;
        const distanceFromBottom = scrollHeight - clientHeight - scrollTop;

        if (distanceFromBottom <= threshold) {
          target.scrollTo({
            behavior: "instant",
            top: place === "bottom" ? scrollHeight : 0,
          });
        }
        return;
      }

      // Otherwise use the ref
      if (!reference.current) return;
      const { clientHeight, scrollHeight, scrollTop } = reference.current;

      const distanceFromBottom = scrollHeight - clientHeight - scrollTop;

      if (distanceFromBottom <= threshold) {
        reference.current.scrollTo({
          behavior: "instant",
          top: place === "bottom" ? reference.current.scrollHeight : 0,
        });
      }
    },
    [scrollTargetId],
  );
  return { ref: reference, scrollTo } as const;
}
