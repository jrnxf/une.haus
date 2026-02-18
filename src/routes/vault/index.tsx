import {
  useQuery,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ChevronDownIcon,
  HeartIcon,
  MessageCircleIcon,
  XIcon,
} from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InView } from "react-intersection-observer";

import confetti from "canvas-confetti";
import { motion } from "framer-motion";
import { useDebounceCallback } from "usehooks-ts";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getMuxPoster } from "~/components/video-player";
import { utv } from "~/lib/utv/core";

export const Route = createFileRoute("/vault/")({
  validateSearch: utv.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        utv.list.infiniteQueryOptions(deps),
      ),
      context.queryClient.ensureQueryData(utv.claps.get.queryOptions()),
    ]);
  },
  staticData: {
    pageHeader: { breadcrumbs: [{ label: "vault" }], maxWidth: "4xl" },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  // React state drives the query - NOT the URL
  // This allows useDeferredValue to actually defer during suspense
  const [query, setQuery] = useState(searchParams.q ?? "");
  const deferredQuery = useDeferredValue(query);

  const [historyOpen, setHistoryOpen] = useState(false);

  const debouncedNavigate = useDebounceCallback((q: string) => {
    // URL update is for bookmarking only - doesn't drive the query
    router.navigate({
      to: "/vault",
      search: (prev) => ({ ...prev, q: q || undefined, cursor: undefined }),
      replace: true,
    });
  }, 300);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedNavigate(value);
  };

  const {
    data: videosPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    utv.list.infiniteQueryOptions({ q: deferredQuery || undefined }),
  );

  const displayedVideos = useMemo(
    () => videosPages.pages.flat(),
    [videosPages],
  );
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="bg-background sticky top-0 z-10">
          <div className="mx-auto flex max-w-4xl items-center gap-2 p-4">
            <div className="relative min-w-0 flex-1">
              <Input
                id="vault-search"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="search vault"
                className="pr-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => handleQueryChange("")}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="text-muted-foreground shrink-0 gap-1.5 text-sm font-medium"
            >
              History
              <motion.div
                animate={{ rotate: historyOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDownIcon className="size-4" />
              </motion.div>
            </Button>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: historyOpen ? "auto" : 0,
            opacity: historyOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="mx-auto max-w-4xl px-4 pb-4">
            <div className="bg-card space-y-4 rounded-lg border p-4">
              <div className="text-muted-foreground space-y-3 text-sm leading-relaxed lowercase">
                <p>
                  In December 2005, Olaf Schlote launched{" "}
                  <span className="text-foreground font-medium">
                    unicycle.tv
                  </span>{" "}
                  — a pioneering video platform built specifically for the
                  unicycling community. Before YouTube became mainstream and
                  years before social media made video sharing effortless,
                  unicycle.tv provided riders around the world a dedicated space
                  to upload, share, and preserve their footage.
                </p>
                <p>
                  The platform captured countless historic moments: competition
                  runs, groundbreaking tricks, and the raw progression of
                  street, trials, and freestyle riding. When videos disappeared
                  from other platforms, unicycle.tv remained as an archive. This
                  vault preserves that legacy.
                </p>
                <p className="text-foreground font-medium">
                  We are deeply grateful to Olaf for his vision and the
                  incredible contribution he made to documenting une history.
                </p>
              </div>

              <ClapButton />
            </div>
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto" ref={setScrollRoot}>
          <div className="mx-auto flex max-w-4xl flex-col px-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {displayedVideos.map((video) => (
                <Link
                  key={video.id}
                  to="/vault/$videoId"
                  params={{ videoId: video.id }}
                  className="group relative aspect-video overflow-clip rounded-md"
                >
                  <img
                    src={getMuxPoster({
                      playbackId: video.playbackId,
                      time: video.thumbnailSeconds,
                      width: 320,
                    })}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                    style={{
                      transform: `scale(${video.scale})`,
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 px-2 py-1.5 backdrop-blur-xs">
                    <h2 className="truncate text-xs font-semibold text-white">
                      {video.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-white/70">
                      <div
                        className="flex items-center gap-1"
                        title={`${video.likesCount} likes`}
                      >
                        <HeartIcon className="size-3" />
                        <span>{video.likesCount}</span>
                      </div>
                      <div
                        className="flex items-center gap-1"
                        title={`${video.messagesCount} messages`}
                      >
                        <MessageCircleIcon className="size-3" />
                        <span>{video.messagesCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {hasNextPage && !isFetchingNextPage && (
              <InView
                root={scrollRoot}
                rootMargin="1000px"
                onChange={(inView) => inView && fetchNextPage()}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ClapButton() {
  const qc = useQueryClient();
  const { data: serverCount } = useQuery(utv.claps.get.queryOptions());
  const [localClicks, setLocalClicks] = useState(0);
  const pendingClicksRef = useRef(0);
  const isMutatingRef = useRef(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const flushClicks = useCallback(async () => {
    // Don't start a new request if one is already in flight
    if (isMutatingRef.current || pendingClicksRef.current === 0) return;

    isMutatingRef.current = true;
    const amount = pendingClicksRef.current;
    pendingClicksRef.current = 0;

    try {
      const newCount = await utv.claps.add.fn({ data: { amount } });
      qc.setQueryData(utv.claps.get.queryOptions().queryKey, newCount);
      // Only subtract the clicks that were in this batch
      setLocalClicks((c) => c - amount);
    } finally {
      isMutatingRef.current = false;
      // If more clicks accumulated during the request, flush again
      if (pendingClicksRef.current > 0) {
        flushClicks();
      }
    }
  }, [qc]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Fire off any pending clicks on unmount
      if (pendingClicksRef.current > 0 && !isMutatingRef.current) {
        utv.claps.add.fn({ data: { amount: pendingClicksRef.current } });
      }
    };
  }, []);

  const handleClick = () => {
    setLocalClicks((c) => c + 1);
    pendingClicksRef.current += 1;

    // Fire clapping emoji confetti from the button
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      confetti({
        particleCount: 6,
        spread: 40,
        origin: { x, y },
        shapes: ["circle"],
        colors: [
          "#ff6b6b", // bright red
          "#ff8c42", // bright orange
          "#ffd93d", // bright yellow
          "#6bcb77", // bright green
          "#4ecdc4", // bright teal
          "#45b7d1", // bright cyan
          "#7950f2", // bright indigo
          "#c084fc", // bright purple
          "#f472b6", // bright pink
        ],
        scalar: 0.8,
        gravity: 1.5,
        ticks: 40,
      });
    }

    // Debounce: only flush 500ms after last click
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(flushClicks, 500);
  };

  const displayCount = (serverCount ?? 0) + localClicks;

  return (
    <div className="flex items-center gap-3">
      <motion.button
        ref={buttonRef}
        onClick={handleClick}
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex cursor-pointer items-center gap-2 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-colors"
      >
        <span className="text-base">👏</span>
        clap for olaf
      </motion.button>
      <span className="text-muted-foreground text-sm tabular-nums">
        {displayCount.toLocaleString()} {displayCount === 1 ? "clap" : "claps"}
      </span>
    </div>
  );
}
