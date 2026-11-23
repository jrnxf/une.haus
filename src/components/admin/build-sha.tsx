/** The commit this build runs, as a link to it on GitHub. */
export function BuildSha() {
  if (!__COMMIT_SHA__ || __COMMIT_SHA__ === "unknown") return null

  return (
    <a
      href={`https://github.com/jrnxf/une.haus/commit/${__COMMIT_SHA__}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`build ${__COMMIT_SHA__}`}
      className="text-muted-foreground hover:text-foreground font-mono text-xs tabular-nums transition-colors"
    >
      {__COMMIT_SHA__}
    </a>
  )
}
