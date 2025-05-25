import { useCallback, useRef } from "react";

export function useScroll() {
  const reference = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback((place: "bottom" | "top", threshold: number) => {
    if (!reference.current) return;
    const { clientHeight, scrollHeight, scrollTop } = reference.current;

    const distanceFromBottom = scrollHeight - clientHeight - scrollTop;

    if (distanceFromBottom <= threshold) {
      reference.current.scrollTo({
        behavior: "instant",
        top: place === "bottom" ? reference.current.scrollHeight : 0,
      });
    }
  }, []);
  return { ref: reference, scrollTo } as const;
}
