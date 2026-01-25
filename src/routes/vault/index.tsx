import type { MuxPlayerRefAttributes } from "@mux/mux-player-react";
import {
  useQuery,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  MessageCircleIcon,
  MonitorIcon,
  ShieldIcon,
  TvIcon,
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

import { BaseMessageForm } from "~/components/forms/message";
import { MessageAuthor } from "~/components/messages/message-author";
import { MessageBubble } from "~/components/messages/message-bubble";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getMuxPoster, VideoPlayer } from "~/components/video-player";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useIsAdmin, useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { utv, type UtvVideosData } from "~/lib/utv/core";
import {
  useUpdateScale,
  useUpdateThumbnailSeconds,
  useUpdateTitle,
} from "~/lib/utv/hooks";

export const Route = createFileRoute("/vault/")({
  validateSearch: utv.list.schema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Prefetch (non-blocking) - component handles suspense via useTransition
    context.queryClient.prefetchInfiniteQuery(
      utv.list.infiniteQueryOptions(deps),
    );
    context.queryClient.prefetchQuery(utv.claps.get.queryOptions());
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

  const [adminMode, setAdminMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(() => {
    const hasSeenHistory = localStorage.getItem("une.haus:vault-history-seen");
    if (!hasSeenHistory) {
      localStorage.setItem("une.haus:vault-history-seen", "true");
      return true;
    }
    return false;
  });

  const isAdmin = useIsAdmin();

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
    <div className="flex grow flex-col gap-3 overflow-hidden">
      <div className="mx-auto w-full max-w-4xl shrink-0 px-4 pt-4">
        <motion.div
          initial={false}
          animate={{
            height: historyOpen ? "auto" : 0,
            opacity: historyOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className="bg-sidebar mb-3 space-y-4 rounded-lg border p-4">
            <div className="text-muted-foreground space-y-3 text-sm leading-relaxed">
              <p>
                In December 2005, Olaf Schlote launched{" "}
                <span className="text-foreground font-medium">unicycle.tv</span>{" "}
                — a pioneering video platform built specifically for the
                unicycling community. Before YouTube became mainstream and years
                before social media made video sharing effortless, unicycle.tv
                provided riders around the world a dedicated space to upload,
                share, and preserve their footage.
              </p>
              <p>
                The platform captured countless historic moments: competition
                runs, groundbreaking tricks, and the raw progression of street,
                trials, and freestyle riding. When videos disappeared from other
                platforms, unicycle.tv remained as an archive. This vault
                preserves that legacy.
              </p>
              <p className="text-foreground font-medium">
                We are deeply grateful to Olaf for his vision and the incredible
                contribution he made to documenting une history.
              </p>
            </div>

            <ClapButton />
          </div>
        </motion.div>

        <div className="flex items-center gap-2">
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
          {isAdmin && (
            <Button
              variant={adminMode ? "default" : "secondary"}
              size="icon-xs"
              onClick={() => setAdminMode(!adminMode)}
              className="shrink-0"
              aria-label={adminMode ? "Exit admin mode" : "Enter admin mode"}
            >
              <ShieldIcon className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <div className="min-h-0 w-full grow overflow-y-auto" ref={setScrollRoot}>
        <Accordion
          collapsible
          type="single"
          className="mx-auto max-w-4xl space-y-3 px-4 pb-4"
        >
          {displayedVideos.map((video) => (
            <AccordionItem
              value={String(video.id)}
              key={video.id}
              className="group overflow-clip rounded-md border last:border-b"
            >
              <AccordionTrigger className="relative min-w-0 overflow-clip rounded-none py-0 pr-4 pl-0 hover:no-underline">
                <div className="flex h-16 w-full min-w-0 items-center justify-between gap-2 overflow-clip group-data-[state=open]:pl-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="relative aspect-video h-16 overflow-clip transition-all group-data-[state=open]:hidden">
                      <img
                        src={getMuxPoster({
                          playbackId: video.playbackId,
                          time: video.thumbnailSeconds,
                          width: 104 * 2,
                        })}
                        alt={String(video.id)}
                        aria-label={video.title}
                        className="h-full w-full object-cover"
                        style={{
                          transform: `scale(${video.scale})`,
                        }}
                      />
                    </div>
                    <h2 className="truncate font-semibold">{video.title}</h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-muted-foreground flex items-center gap-2.5 text-xs">
                      <div
                        className="flex items-center gap-1"
                        title={`${video.messagesCount} messages`}
                      >
                        <MessageCircleIcon className="size-3.5" />
                        <span>{video.messagesCount}</span>
                      </div>
                      <div
                        className="flex items-center gap-1"
                        title={`${video.likesCount} likes`}
                      >
                        <HeartIcon className="size-3.5" />
                        <span>{video.likesCount}</span>
                      </div>
                    </div>
                    <Button variant="ghost" asChild size="icon-sm" aria-label="View video">
                      <Link to="/vault/$videoId" params={{ videoId: video.id }}>
                        <ArrowUpRightIcon className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="p-0">
                {adminMode ? (
                  <AdminScaleEditor
                    videoId={video.id}
                    playbackId={video.playbackId}
                    initialScale={video.scale}
                    thumbnailSeconds={video.thumbnailSeconds}
                    title={video.title}
                  />
                ) : (
                  <ExpandedVideoContent video={video} isAdmin={!!isAdmin} />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        {hasNextPage && !isFetchingNextPage && (
          <InView
            root={scrollRoot}
            rootMargin="1000px"
            onChange={(inView) => inView && fetchNextPage()}
          />
        )}
      </div>
    </div>
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
        colors: ["#f59e0b", "#fbbf24", "#fcd34d"],
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
        Clap for Olaf
      </motion.button>
      <span className="text-muted-foreground text-sm tabular-nums">
        {displayCount.toLocaleString()} {displayCount === 1 ? "clap" : "claps"}
      </span>
    </div>
  );
}

const INITIAL_VISIBLE_COUNT = 2;

function ExpandedVideoContent({
  video,
  isAdmin,
}: {
  video: UtvVideosData[number];
  isAdmin: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sessionUser = useSessionUser();

  const record = { type: "utvVideo" as const, id: video.id };

  const { data: messagesData } = useQuery(messages.list.queryOptions(record));

  const { mutate: createMessage } = useCreateMessage(record);

  const messageList = messagesData?.messages ?? [];
  const hasMoreMessages = messageList.length > INITIAL_VISIBLE_COUNT;
  const visibleMessages = isExpanded
    ? messageList
    : messageList.slice(-INITIAL_VISIBLE_COUNT);
  const hiddenCount = messageList.length - INITIAL_VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-4 p-4">
      {video.playbackId ? (
        <VideoPlayer playbackId={video.playbackId} className="rounded-md" />
      ) : (
        <p className="text-muted-foreground text-sm">No video available</p>
      )}

      {isAdmin && (
        <div className="flex gap-2">
          <Button variant="secondary" asChild size="sm">
            <a
              href={`https://dashboard.mux.com/organizations/rm30mj/environments/62jevu/video/assets/${video.assetId}/monitor`}
              target="_blank"
            >
              <MonitorIcon className="size-3" />
              mux
            </a>
          </Button>
          <Button variant="secondary" asChild size="sm">
            <a href={video.legacyUrl} target="_blank">
              <TvIcon className="size-3" />
              utv
            </a>
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-muted-foreground text-sm font-medium">
            Messages
          </h3>
          {hasMoreMessages && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-1 text-xs"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  Show less
                  <ChevronUpIcon className="size-3" />
                </>
              ) : (
                <>
                  Show {hiddenCount} more
                  <ChevronDownIcon className="size-3" />
                </>
              )}
            </Button>
          )}
        </div>

        {messageList.length === 0 ? (
          <p className="text-muted-foreground text-sm">No messages yet.</p>
        ) : (
          <div className="space-y-2">
            {visibleMessages.map((message, index) => {
              const isAuthUserMessage = Boolean(
                sessionUser && sessionUser.id === message.user.id,
              );
              const prevMessage = visibleMessages[index - 1];
              const isNewSection = prevMessage?.user.id !== message.user.id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex max-w-full flex-col",
                    isAuthUserMessage && "items-end",
                  )}
                >
                  {isNewSection && (
                    <div className={cn("mb-1", index !== 0 && "mt-4")}>
                      <MessageAuthor message={message} />
                    </div>
                  )}
                  <MessageBubble parent={record} message={message} />
                </div>
              );
            })}
          </div>
        )}

        <BaseMessageForm onSubmit={createMessage} />
      </div>
    </div>
  );
}

function AdminScaleEditor({
  videoId,
  playbackId,
  initialScale,
  thumbnailSeconds: initialThumbnailSeconds,
  title: initialTitle,
}: {
  videoId: number;
  playbackId: string | null;
  initialScale: number;
  thumbnailSeconds: number;
  title: string;
}) {
  const [localScale, setLocalScale] = useState(initialScale);
  const [localSeconds, setLocalSeconds] = useState(initialThumbnailSeconds);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const playerRef = useRef<MuxPlayerRefAttributes>(null);
  const updateScale = useUpdateScale();
  const updateThumbnailSeconds = useUpdateThumbnailSeconds();
  const updateTitle = useUpdateTitle();

  const handleSliderRelease = () => {
    if (localScale !== initialScale) {
      updateScale.mutate({
        data: { id: videoId, scale: localScale },
      });
    }
  };

  const handleTitleBlur = () => {
    if (localTitle !== initialTitle) {
      updateTitle.mutate({
        data: { id: videoId, title: localTitle },
      });
    }
  };

  const handleSaveTimestamp = () => {
    const currentTime = playerRef.current?.currentTime;
    if (currentTime !== undefined) {
      const seconds = Math.floor(currentTime);
      setLocalSeconds(seconds);
      updateThumbnailSeconds.mutate({
        data: { id: videoId, thumbnailSeconds: seconds },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Row 1: Thumbnail + Title */}
      <div className="flex items-center gap-4">
        {playbackId && (
          <div className="relative aspect-video h-20 shrink-0 overflow-clip rounded-md">
            <img
              src={getMuxPoster({
                playbackId,
                time: localSeconds,
                width: 160,
              })}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
              style={{
                transform: `scale(${localScale})`,
              }}
            />
          </div>
        )}
        <Input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="Title"
          className="grow"
        />
      </div>

      {/* Row 2: Scale slider */}
      <div className="flex items-center gap-4">
        <span className="text-muted-foreground w-12 shrink-0 text-sm font-medium">
          Scale
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={localScale}
          onChange={(e) => setLocalScale(Number.parseFloat(e.target.value))}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          className="accent-primary h-2 grow cursor-pointer"
        />
        <span className="text-muted-foreground w-12 text-sm tabular-nums">
          {(localScale * 100).toFixed(0)}%
        </span>
      </div>

      {/* Video player */}
      {playbackId && (
        <>
          <VideoPlayer
            ref={playerRef}
            playbackId={playbackId}
            className="rounded-md"
          />
          <Button variant="secondary" onClick={handleSaveTimestamp}>
            Save Timestamp ({localSeconds}s)
          </Button>
        </>
      )}
    </div>
  );
}
