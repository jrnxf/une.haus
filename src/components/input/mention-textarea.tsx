import { computePosition, flip, shift } from "@floating-ui/dom"
import { type Editor, Extension } from "@tiptap/core"
import { Mention } from "@tiptap/extension-mention"
import { Placeholder } from "@tiptap/extension-placeholder"
import { Underline } from "@tiptap/extension-underline"
import {
  EditorContent,
  posToDOMRect,
  ReactRenderer,
  useEditor,
} from "@tiptap/react"
import { BubbleMenu } from "@tiptap/react/menus"
import { StarterKit } from "@tiptap/starter-kit"
import { type SuggestionOptions } from "@tiptap/suggestion"
import {
  BoldIcon,
  ItalicIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from "lucide-react"
import { type CSSProperties, useEffect, useRef } from "react"

import {
  type MentionListRef,
  type MentionSuggestion,
  MentionList,
} from "~/components/input/mention-list"
import {
  extractMentionedUserIds,
  storageToHTML,
  tiptapToStorage,
} from "~/lib/mentions/parse"
import { useUserMap } from "~/lib/users/use-user-map"
import { cn } from "~/lib/utils"

type MentionTextareaProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onFocus?: () => void
  onSubmit?: () => void
  submitOnEnter?: boolean
  id?: string
  disabled?: boolean
  rows?: number
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

/**
 * Textarea with @mention support via tiptap.
 *
 * Accepts and emits storage format (@[userId]).
 * Supports bold/italic formatting with keyboard shortcuts and markdown input rules.
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder = "",
  rows = 3,
  className,
  onFocus,
  onSubmit,
  submitOnEnter = true,
  id,
  disabled,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: MentionTextareaProps) {
  const { userMap, isReady } = useUserMap()
  const userMapRef = useRef(userMap)
  userMapRef.current = userMap

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const onSubmitRef = useRef(onSubmit)
  onSubmitRef.current = onSubmit

  const valueRef = useRef(value)
  valueRef.current = value

  const suggestionOpenRef = useRef(false)

  const editor = useEditor({
    extensions: [
      // @ts-expect-error - tiptap/starter-kit bundles its own @tiptap/core causing type mismatch
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
        code: false,
        dropcursor: false,
        gapcursor: false,
      }),
      Underline,
      Mention.configure({
        HTMLAttributes: { class: "rounded-sm bg-blue-800 px-0.5" },
        renderText({ node }) {
          return `@${node.attrs.label ?? node.attrs.id}`
        },
        suggestion: createSuggestionConfig(
          userMapRef,
          valueRef,
          suggestionOpenRef,
        ),
      }),
      Placeholder.configure({ placeholder }),
      Extension.create({
        name: "submitOnEnter",
        addKeyboardShortcuts() {
          return {
            Enter: () => {
              if (suggestionOpenRef.current) return false
              if (!submitOnEnter || !onSubmitRef.current) return false
              onSubmitRef.current()
              return true
            },
            "Mod-Enter": () => {
              if (!onSubmitRef.current) return false
              onSubmitRef.current()
              return true
            },
          }
        },
      }),
    ],
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "outline-none",
        role: "textbox",
        placeholder,
        ...(id ? { id } : {}),
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
        ...(ariaDescribedBy ? { "aria-describedby": ariaDescribedBy } : {}),
        ...(ariaInvalid ? { "aria-invalid": String(ariaInvalid) } : {}),
      },
    },
    content: storageToHTML(value, userMap),
    onUpdate: ({ editor: e }) => {
      onChangeRef.current(tiptapToStorage(e.getJSON()))
    },
    onFocus: () => {
      onFocus?.()
    },
  })

  // Sync disabled state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  return (
    <div
      data-mention-ready={isReady ? "true" : undefined}
      style={{ "--mention-rows": rows } as CSSProperties}
      className={cn(
        "tiptap-wrapper [&_.tiptap]:min-h-[calc(var(--mention-rows)*1.5rem)] [&_.tiptap]:break-words [&_.tiptap]:outline-none [&_.tiptap_p]:m-0",
        "[&_.tiptap_.is-editor-empty:first-child::before]:text-muted-foreground [&_.tiptap_.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_.is-editor-empty:first-child::before]:float-left [&_.tiptap_.is-editor-empty:first-child::before]:h-0 [&_.tiptap_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",

        // standard textarea
        "border-input ring-offset-background dark:bg-input/30 flex w-full flex-col rounded-md border bg-transparent px-3 py-2 text-base",
        "placeholder:text-muted-foreground",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {editor ? (
        <>
          <BubbleMenu
            editor={editor}
            appendTo={document.body}
            options={{
              placement: "top",
              offset: 8,
            }}
            className="bg-popover text-popover-foreground z-50 flex items-center gap-0.5 rounded-lg border p-1 shadow-md"
          >
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              label="Bold"
            >
              <BoldIcon className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              label="Italic"
            >
              <ItalicIcon className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              label="Underline"
            >
              <UnderlineIcon className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              active={editor.isActive("strike")}
              onClick={() => editor.chain().focus().toggleStrike().run()}
              label="Strikethrough"
            >
              <StrikethroughIcon className="size-3.5" />
            </ToolbarButton>
          </BubbleMenu>
          <EditorContent editor={editor} />
        </>
      ) : (
        <div
          className="tiptap outline-none"
          role="textbox"
          aria-hidden
          {...(id ? { id } : {})}
          {...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {})}
        >
          <p className="text-muted-foreground m-0 [font-variant-ligatures:none]">
            {placeholder}
          </p>
        </div>
      )}
    </div>
  )
}

function createSuggestionConfig(
  userMapRef: React.RefObject<
    Map<number, { id: number; name: string; avatarId: string | null }>
  >,
  valueRef: React.RefObject<string>,
  suggestionOpenRef: React.RefObject<boolean>,
): Omit<SuggestionOptions<MentionSuggestion>, "editor"> {
  return {
    char: "@",
    allowSpaces: true,
    items: ({ query }) => {
      const map = userMapRef.current
      if (!map) return []

      const mentionedIds = new Set(extractMentionedUserIds(valueRef.current))
      const q = query.toLowerCase()

      return [...map.values()]
        .filter(
          (u) =>
            u.name &&
            !mentionedIds.has(u.id) &&
            u.name.toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((u) => ({ id: u.id, name: u.name, avatarId: u.avatarId }))
    },
    command: ({ editor, range, props }) => {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: { id: props.id, label: props.name },
          },
          { type: "text", text: " " },
        ])
        .run()
    },
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null

      return {
        onStart: (props) => {
          ;(suggestionOpenRef as React.MutableRefObject<boolean>).current = true

          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) return

          component.element.style.position = "absolute"
          component.element.style.zIndex = "50"
          document.body.appendChild(component.element)

          updateFloatingPosition(props.editor, component.element)
        },
        onUpdate: (props) => {
          component?.updateProps(props)

          if (!props.clientRect) return

          updateFloatingPosition(props.editor, component!.element)
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            ;(suggestionOpenRef as React.MutableRefObject<boolean>).current =
              false
            component?.destroy()
            component = null
            return true
          }
          return component?.ref?.onKeyDown(props) ?? false
        },
        onExit: () => {
          ;(suggestionOpenRef as React.MutableRefObject<boolean>).current =
            false
          component?.element.remove()
          component?.destroy()
          component = null
        },
      }
    },
  }
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-muted-foreground",
      )}
    >
      {children}
    </button>
  )
}

function updateFloatingPosition(editor: Editor, element: HTMLElement) {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
  }

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content"
    element.style.position = strategy
    element.style.left = `${x}px`
    element.style.top = `${y}px`
  })
}
