/**
 * BACKUP: Original admin grid view for vault thumbnail scaling
 *
 * This was a dedicated /vault/admin route that displayed all vault videos
 * in a grid layout, allowing admins to:
 * - Select multiple videos (click to toggle, shift+click for range)
 * - Adjust thumbnail scale with a slider
 * - Auto-scale all videos to remove yellow letterboxing
 * - Save scales to vault-scales.bak.ts
 */

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderIcon } from "lucide-react";
import { useRef, useState } from "react";

import { Virtualizer } from "virtua";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { getMuxPoster } from "~/components/video-player";
import { cn } from "~/lib/utils";
import { utv } from "~/lib/utv";
import { saveUtvScalesServerFn } from "~/lib/utv/fns";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

// Yellow bar color: #EAC50A = rgb(234, 197, 10)
const YELLOW_BAR = { r: 234, g: 197, b: 10 };
const COLOR_TOLERANCE = 25; // Tolerance for JPEG compression artifacts

function isYellowPixel(r: number, g: number, b: number): boolean {
  return (
    Math.abs(r - YELLOW_BAR.r) < COLOR_TOLERANCE &&
    Math.abs(g - YELLOW_BAR.g) < COLOR_TOLERANCE &&
    Math.abs(b - YELLOW_BAR.b) < COLOR_TOLERANCE
  );
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

function hasYellowEdges(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
): boolean {
  // Calculate the visible portion when scaled and centered
  const visibleWidth = width / scale;
  const visibleHeight = height / scale;
  const offsetX = (width - visibleWidth) / 2;
  const offsetY = (height - visibleHeight) / 2;

  // Sample points along all edges of visible area
  const samples = 100;
  // Check multiple pixels inward from edge to catch any remaining yellow
  const edgeDepth = 15;

  // Check left and right edges (for pillarboxing)
  for (let i = 0; i < samples; i++) {
    const y = Math.floor(offsetY + (visibleHeight * i) / (samples - 1));

    for (let d = 0; d < edgeDepth; d++) {
      // Left edge
      const leftX = Math.floor(offsetX) + d;
      if (leftX >= 0 && leftX < width && y >= 0 && y < height) {
        const leftPixel = ctx.getImageData(leftX, y, 1, 1).data;
        if (isYellowPixel(leftPixel[0], leftPixel[1], leftPixel[2])) {
          return true;
        }
      }

      // Right edge
      const rightX = Math.floor(offsetX + visibleWidth - 1) - d;
      if (rightX >= 0 && rightX < width && y >= 0 && y < height) {
        const rightPixel = ctx.getImageData(rightX, y, 1, 1).data;
        if (isYellowPixel(rightPixel[0], rightPixel[1], rightPixel[2])) {
          return true;
        }
      }
    }
  }

  // Check top and bottom edges (for letterboxing)
  for (let i = 0; i < samples; i++) {
    const x = Math.floor(offsetX + (visibleWidth * i) / (samples - 1));

    for (let d = 0; d < edgeDepth; d++) {
      // Top edge
      const topY = Math.floor(offsetY) + d;
      if (x >= 0 && x < width && topY >= 0 && topY < height) {
        const topPixel = ctx.getImageData(x, topY, 1, 1).data;
        if (isYellowPixel(topPixel[0], topPixel[1], topPixel[2])) {
          return true;
        }
      }

      // Bottom edge
      const bottomY = Math.floor(offsetY + visibleHeight - 1) - d;
      if (x >= 0 && x < width && bottomY >= 0 && bottomY < height) {
        const bottomPixel = ctx.getImageData(x, bottomY, 1, 1).data;
        if (isYellowPixel(bottomPixel[0], bottomPixel[1], bottomPixel[2])) {
          return true;
        }
      }
    }
  }

  return false;
}

async function computeAutoScale(imageUrl: string): Promise<number> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return 1;

    ctx.drawImage(img, 0, 0);

    // Binary search for minimum scale where yellow is gone
    let low = 1;
    let high = 3;

    // First check if there's any yellow at scale 1
    if (!hasYellowEdges(ctx, img.width, img.height, 1)) {
      return 1;
    }

    // Binary search
    while (high - low > 0.01) {
      const mid = (low + high) / 2;
      if (hasYellowEdges(ctx, img.width, img.height, mid)) {
        low = mid;
      } else {
        high = mid;
      }
    }

    // Round up and add buffer to ensure yellow is fully hidden
    const bufferedScale = high + 0.08;
    return Math.min(3, Math.ceil(bufferedScale * 100) / 100);
  } catch {
    return 1;
  }
}

export const Route = createFileRoute("/vault/admin")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(utv.all.queryOptions());
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(utv.all.queryOptions());
  const [query, setQuery] = useState("");
  const [scales, setScales] = useState<Record<number, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sliderValue, setSliderValue] = useState(1);
  const [isAutoScaling, setIsAutoScaling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const lowercasedQuery = query.toLowerCase();

  const fzf = useFzf([data, { selector: (video) => video.title }]);

  const filteredVault = fzf.find(lowercasedQuery);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastClickedIndex = useRef<number | null>(null);

  const handleClick = (index: number, id: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndex.current !== null) {
      // Shift+click: select range
      const start = Math.min(lastClickedIndex.current, index);
      const end = Math.max(lastClickedIndex.current, index);
      const idsInRange = filteredVault
        .slice(start, end + 1)
        .map(({ item }) => item.id);

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const rangeId of idsInRange) {
          next.add(rangeId);
        }
        return next;
      });
    } else {
      // Normal click: toggle single
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastClickedIndex.current = index;
    }
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    setScales((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        next[id] = value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    // Get all videos that have been scaled (not at default 1)
    const scalesToSave: Record<string, number> = {};
    for (const [id, scale] of Object.entries(scales)) {
      if (scale !== 1) {
        scalesToSave[id] = scale;
      }
    }

    if (Object.keys(scalesToSave).length === 0) return;

    setIsSaving(true);
    try {
      const result = await saveUtvScalesServerFn({
        data: { scales: scalesToSave },
      });
      console.log(`Saved ${result.count} thumbnail scales to JSON file`);

      // Clear selection and reset scales state
      setSelectedIds(new Set());
      setScales({});
    } catch (error) {
      console.error("Failed to save scales:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoScaleAll = async () => {
    setIsAutoScaling(true);
    try {
      const newScales: Record<number, number> = { ...scales };

      for (const { item: video } of filteredVault) {
        if (!video.playbackId) continue;

        const imageUrl = getMuxPoster({
          playbackId: video.playbackId,
          time: 30,
          width: 320,
        });
        if (!imageUrl) continue;

        const scale = await computeAutoScale(imageUrl);
        if (scale > 1) {
          newScales[video.id] = scale;
        }
      }

      setScales(newScales);
    } finally {
      setIsAutoScaling(false);
    }
  };

  return (
    <div className="relative grow overflow-y-auto" ref={scrollRef}>
      <div className="mx-auto max-w-6xl p-4 pb-24">
        <Input
          id="vault-search"
          value={query}
          onChange={(evt) => setQuery(evt.target.value)}
          placeholder="search vault"
          className="mx-auto mb-4 max-w-2xl"
        />

        <Virtualizer scrollRef={scrollRef} overscan={12}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filteredVault.map(({ item: video }, index) => (
              <button
                key={video.id}
                type="button"
                onClick={(e) => handleClick(index, video.id, e.shiftKey)}
                className={cn(
                  "group relative overflow-clip rounded-lg border-2 transition-all",
                  selectedIds.has(video.id)
                    ? "ring-primary border-primary ring-2 ring-offset-2"
                    : "hover:border-muted-foreground/30 border-transparent",
                )}
              >
                <div className="aspect-video overflow-clip">
                  <img
                    src={getMuxPoster({
                      playbackId: video.playbackId,
                      time: 30,
                      width: 320,
                    })}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform"
                    style={{
                      transform: `scale(${scales[video.id] ?? video.scale})`,
                    }}
                  />
                </div>
                <div className="bg-background/80 absolute inset-x-0 bottom-0 px-2 py-1.5 backdrop-blur-sm">
                  <p className="truncate text-left text-xs font-medium">
                    {video.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Virtualizer>
      </div>

      {/* Floating slider */}
      <div className="bg-background/80 pointer-events-none fixed inset-x-0 bottom-0 flex justify-center pb-6 backdrop-blur-sm">
        <div className="bg-card pointer-events-auto flex items-center gap-4 rounded-full border px-6 py-3 shadow-lg">
          <span className="text-muted-foreground text-sm font-medium">
            Scale ({selectedIds.size} selected)
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={sliderValue}
            onChange={(e) =>
              handleSliderChange(Number.parseFloat(e.target.value))
            }
            className="accent-primary h-2 w-48 cursor-pointer"
            disabled={selectedIds.size === 0}
          />
          <span className="text-muted-foreground w-12 text-sm tabular-nums">
            {(sliderValue * 100).toFixed(0)}%
          </span>
          <Button
            variant="secondary"
            onClick={handleAutoScaleAll}
            disabled={isAutoScaling}
          >
            {isAutoScaling ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Auto-scaling...
              </>
            ) : (
              "Auto-scale All"
            )}
          </Button>
          <Button
            onClick={handleSave}
            disabled={Object.keys(scales).length === 0 || isSaving}
          >
            {isSaving ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
