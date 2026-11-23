import { GripVerticalIcon } from "lucide-react"
import { lazy, Suspense, useState } from "react"

import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import { Button } from "~/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel"
import { CodeViewer } from "~/components/ui/code-viewer"
import { DiffViewer } from "~/components/ui/diff-viewer"
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox"
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from "~/components/ui/sortable"

const MapSample = lazy(() =>
  import("~/components/sandbox/map-sample").then((module) => ({
    default: module.MapSample,
  })),
)

const SLIDES = [1, 2, 3, 4, 5]

const CODE_SAMPLE = JSON.stringify(
  { name: "sandbox", disciplines: ["street", "flatland"], public: true },
  null,
  2,
)

const CODE_CHANGED = JSON.stringify(
  { name: "sandbox", disciplines: ["street", "trials"], public: false },
  null,
  2,
)

const INITIAL_ITEMS = [
  { id: "a", label: "first rider" },
  { id: "b", label: "second rider" },
  { id: "c", label: "third rider" },
  { id: "d", label: "fourth rider" },
]

const COMBOBOX_OPTIONS = ["street", "flatland", "trials", "freestyle", "muni"]

export function RareSection() {
  return (
    <SandboxSection id="rare" title="rare">
      <CarouselSample />
      <SortableSample />
      <ComboboxSample />
      <Sample title="code viewer" wide>
        <CodeViewer value={CODE_SAMPLE} />
      </Sample>
      <Sample title="diff viewer" wide>
        <DiffViewer original={CODE_SAMPLE} modified={CODE_CHANGED} />
      </Sample>
      <MapLoader />
    </SandboxSection>
  )
}

function CarouselSample() {
  return (
    <Sample title="carousel">
      <div className="px-12">
        <Carousel opts={{ loop: true }}>
          <CarouselContent>
            {SLIDES.map((slide) => (
              <CarouselItem key={slide}>
                <div className="bg-muted flex aspect-video items-center justify-center rounded-md text-2xl font-semibold">
                  {slide}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </Sample>
  )
}

function SortableSample() {
  const [items, setItems] = useState(INITIAL_ITEMS)

  return (
    <Sample title="sortable">
      <p className="text-muted-foreground text-xs">drag a handle to reorder</p>
      <Sortable
        value={items}
        onValueChange={setItems}
        getItemValue={(item) => item.id}
        className="flex flex-col gap-2"
      >
        {items.map((item, index) => (
          <SortableItem
            key={item.id}
            value={item.id}
            className="bg-muted/70 flex items-center gap-2 rounded-md border px-2 py-1"
          >
            <SortableItemHandle>
              <GripVerticalIcon className="text-muted-foreground size-4" />
            </SortableItemHandle>
            <span className="text-muted-foreground w-4 text-center text-xs tabular-nums">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              {item.label}
            </span>
          </SortableItem>
        ))}
      </Sortable>
    </Sample>
  )
}

function ComboboxSample() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string | null>(null)

  return (
    <Sample title="responsive combobox">
      <SampleRow label="popover on desktop, drawer on mobile">
        <ResponsiveCombobox
          open={open}
          onOpenChange={setOpen}
          title="discipline"
          trigger={
            <Button variant="outline">{value ?? "pick a discipline"}</Button>
          }
        >
          <div className="flex flex-col p-1">
            {COMBOBOX_OPTIONS.map((option) => (
              <Button
                key={option}
                variant="ghost"
                className="justify-start"
                onClick={() => {
                  setValue(option)
                  setOpen(false)
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        </ResponsiveCombobox>
      </SampleRow>
    </Sample>
  )
}

// maplibre is large, so the map loads only after a click.
function MapLoader() {
  const [show, setShow] = useState(false)

  return (
    <Sample title="map" wide>
      {show ? (
        <Suspense
          fallback={<div className="bg-muted h-64 animate-pulse rounded-md" />}
        >
          <MapSample />
        </Suspense>
      ) : (
        <Button variant="outline" onClick={() => setShow(true)}>
          load
        </Button>
      )}
    </Sample>
  )
}
