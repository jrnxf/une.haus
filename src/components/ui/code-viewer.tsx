import { lazy, Suspense } from "react"

import { useTheme } from "~/lib/theme/context"
import { cn } from "~/lib/utils"

const LazyCodeInner = lazy(async () => {
  const [
    { default: CodeMirror, EditorView, EditorState },
    { githubLight, githubDark },
  ] = await Promise.all([
    import("@uiw/react-codemirror"),
    import("@uiw/codemirror-theme-github"),
  ])

  function CodeViewerInner({
    value,
    theme,
  }: {
    value: string
    theme: "light" | "dark"
  }) {
    return (
      <CodeMirror
        value={value}
        theme={theme === "dark" ? githubDark : githubLight}
        extensions={[
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          EditorView.lineWrapping,
        ]}
        basicSetup={{ lineNumbers: false, foldGutter: false }}
      />
    )
  }

  return { default: CodeViewerInner }
})

export function CodeViewer({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const { resolvedTheme } = useTheme()

  return (
    <div className={cn("overflow-hidden rounded-md border text-sm", className)}>
      <Suspense
        fallback={<div className="bg-muted h-24 animate-pulse rounded" />}
      >
        <LazyCodeInner
          value={value}
          theme={(resolvedTheme as "light" | "dark") ?? "light"}
        />
      </Suspense>
    </div>
  )
}
