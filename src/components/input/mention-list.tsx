import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { cn } from "~/lib/utils"

import type { SuggestionProps } from "@tiptap/suggestion"

export type MentionSuggestion = {
  id: number
  name: string
  avatarId: string | null
}

export type MentionListRef = {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<
  MentionListRef,
  SuggestionProps<MentionSuggestion>
>(function MentionList(props, ref) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex(
          (prev) => (prev + props.items.length - 1) % props.items.length,
        )
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((prev) => (prev + 1) % props.items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  // Scroll selected item into view
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const item = container.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (props.items.length === 0) return null

  return (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Suggested users"
      className="border-border bg-popover max-h-60 overflow-y-auto rounded-md border p-1 shadow-md"
    >
      {props.items.map((item, index) => (
        <div
          key={item.id}
          role="option"
          aria-label={item.name}
          aria-selected={index === selectedIndex}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
            index === selectedIndex && "bg-accent text-accent-foreground",
          )}
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <Avatar
            className="size-5"
            cloudflareId={item.avatarId}
            alt={item.name}
          >
            <AvatarImage width={40} quality={80} />
            <AvatarFallback className="text-[10px]" name={item.name} />
          </Avatar>
          {item.name}
        </div>
      ))}
    </div>
  )
})
