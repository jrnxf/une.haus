import { lazy, Suspense } from "react";

const LazyInner = lazy(async () => {
  const [{ default: CodeMirror }, { json }, { githubLight, githubDark }] =
    await Promise.all([
      import("@uiw/react-codemirror"),
      import("@codemirror/lang-json"),
      import("@uiw/codemirror-theme-github"),
    ]);

  function CodeMirrorJson(
    props: Omit<
      React.ComponentProps<typeof CodeMirror>,
      "extensions" | "theme"
    > & { theme?: "light" | "dark" },
  ) {
    const { theme = "light", ...rest } = props;
    return (
      <CodeMirror
        extensions={[json()]}
        theme={theme === "dark" ? githubDark : githubLight}
        {...rest}
      />
    );
  }

  return { default: CodeMirrorJson };
});

export function LazyCodeMirror(props: React.ComponentProps<typeof LazyInner>) {
  return (
    <Suspense
      fallback={<div className="bg-muted size-full animate-pulse rounded" />}
    >
      <LazyInner {...props} />
    </Suspense>
  );
}
