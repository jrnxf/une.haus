import { lazy, Suspense } from "react"

import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

const LazyMergeInner = lazy(async () => {
  const [
    { default: CodeMirrorMerge },
    { EditorView, EditorState },
    { githubLight, githubDark },
  ] = await Promise.all([
    import("react-codemirror-merge"),
    import("@uiw/react-codemirror"),
    import("@uiw/codemirror-theme-github"),
  ])

  const Original = CodeMirrorMerge.Original
  const Modified = CodeMirrorMerge.Modified

  function DiffViewerInner({
    original,
    modified,
    theme,
  }: {
    original: string
    modified: string
    theme: "light" | "dark"
  }) {
    const readOnly = [
      EditorView.editable.of(false),
      EditorState.readOnly.of(true),
    ]

    return (
      <CodeMirrorMerge
        orientation="a-b"
        theme={theme === "dark" ? githubDark : githubLight}
        collapseUnchanged={{ margin: 2, minSize: 3 }}
        highlightChanges
      >
        <Original
          value={original}
          extensions={[...readOnly, EditorView.lineWrapping]}
        />
        <Modified
          value={modified}
          extensions={[...readOnly, EditorView.lineWrapping]}
        />
      </CodeMirrorMerge>
    )
  }

  return { default: DiffViewerInner }
})

export function DiffViewer({
  original,
  modified,
  className,
}: {
  original: string
  modified: string
  className?: string
}) {
  const { resolvedTheme } = useTheme()

  return (
    <div className={cn("overflow-hidden rounded-md border text-sm", className)}>
      <Suspense
        fallback={<div className="bg-muted h-24 animate-pulse rounded" />}
      >
        <LazyMergeInner
          original={original}
          modified={modified}
          theme={(resolvedTheme as "light" | "dark") ?? "light"}
        />
      </Suspense>
    </div>
  )
}
