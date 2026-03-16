import { describe, expect, it, mock } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

mock.module("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
  Link: ({
    children,
    params,
  }: {
    children: unknown
    params: { submissionId: number }
  }) => (
    <a href={`/games/rius/submissions/${params.submissionId}`}>{children}</a>
  ),
}))

describe("RiuSubmissionCard", () => {
  it("renders the submission route and stat badges", async () => {
    const { RiuSubmissionCard } = await import("./riu-submission-card")

    const markup = renderToStaticMarkup(
      <RiuSubmissionCard
        submission={{
          id: 42,
          likes: [{ id: 1 }, { id: 2 }, { id: 3 }],
          messages: [{ id: 1 }, { id: 2 }],
        }}
        set={{
          user: {
            id: 1,
            name: "Jane",
          },
          name: "Target Set",
          instructions: null,
        }}
      />,
    )

    expect(markup).toContain('href="/games/rius/submissions/42"')
    expect(markup).toContain("Target Set")
    expect(markup).toContain("3 likes")
    expect(markup).toContain("2 messages")
    // User name is no longer rendered in the card
    expect(markup).not.toContain("Jane")
  })
})
