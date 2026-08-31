import { describe, expect, it, mock } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

mock.module("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
  Link: ({
    children,
    params,
  }: {
    children: unknown
    params?: { submissionId?: number; setId?: number }
  }) => (
    <a
      href={
        params?.submissionId
          ? `/games/rius/submissions/${params.submissionId}`
          : `/games/rius/sets/${params?.setId}`
      }
    >
      {children}
    </a>
  ),
}))

mock.module("~/components/ui/accordion", () => ({
  Accordion: ({ children }: { children: unknown }) => <div>{children}</div>,
  AccordionContent: ({ children }: { children: unknown }) => (
    <div>{children}</div>
  ),
  AccordionItem: ({ children }: { children: unknown }) => <div>{children}</div>,
  AccordionTrigger: ({ children }: { children: unknown }) => (
    <button type="button">{children}</button>
  ),
}))

mock.module("./set-card", () => ({
  SetCard: ({ set }: { set: { name: string } }) => (
    <div data-slot="set-card">{set.name}</div>
  ),
}))

describe("RankedRiders", () => {
  it("renders set cards before submission cards in mixed rider rows", async () => {
    const { RankedRiders } = await import("./ranked-riders")

    const markup = renderToStaticMarkup(
      <RankedRiders
        basePath="/games/rius/active"
        rankedRiders={[
          {
            user: { id: 1, name: "Rider One", avatarId: null },
            sets: [
              {
                id: 10,
                name: "Set Alpha",
                instructions: null,
                createdAt: new Date("2024-01-01T10:00:00Z"),
                user: { id: 1, name: "Rider One", avatarId: null },
                likes: [],
                submissions: [],
              },
            ],
            submissions: [
              {
                id: 101,
                createdAt: new Date("2024-01-01T12:00:00Z"),
                user: { id: 1, name: "Rider One", avatarId: null },
                likes: [{ id: 1 }],
                messages: [{ id: 1 }],
                riuSet: {
                  id: 12,
                  name: "Target Set",
                  instructions: null,
                  user: { id: 3, name: "Setter", avatarId: null },
                },
              },
            ],
            ranking: {
              user: { id: 1, name: "Rider One", avatarId: null },
              setsCount: 1,
              submissionsCount: 1,
              points: 2,
              lastSetAt: new Date("2024-01-01T10:00:00Z"),
              lastSubmissionAt: new Date("2024-01-01T12:00:00Z"),
              rank: 1,
            },
          },
        ]}
      />,
    )

    expect(markup).toContain(">sets<")
    expect(markup).toContain(">submissions<")
    expect(markup).toContain('data-slot="set-card"')
    expect(markup).toContain('href="/games/rius/submissions/101"')
    expect(markup.indexOf("Set Alpha")).toBeLessThan(
      markup.indexOf("Target Set"),
    )
  })

  it("renders submission cards instead of the submissions-only text", async () => {
    const { RankedRiders } = await import("./ranked-riders")

    const markup = renderToStaticMarkup(
      <RankedRiders
        basePath="/games/rius/active"
        rankedRiders={[
          {
            user: { id: 2, name: "Submitter", avatarId: null },
            sets: [],
            submissions: [
              {
                id: 201,
                createdAt: new Date("2024-01-02T12:00:00Z"),
                user: { id: 2, name: "Submitter", avatarId: null },
                likes: [{ id: 1 }, { id: 2 }],
                messages: [{ id: 1 }],
                riuSet: {
                  id: 20,
                  name: "Submission Target",
                  instructions: null,
                  user: { id: 4, name: "Setter 2", avatarId: null },
                },
              },
            ],
            ranking: {
              user: { id: 2, name: "Submitter", avatarId: null },
              setsCount: 0,
              submissionsCount: 1,
              points: 1,
              lastSetAt: null,
              lastSubmissionAt: new Date("2024-01-02T12:00:00Z"),
              rank: 1,
            },
          },
        ]}
      />,
    )

    expect(markup).toContain("Submission Target")
    expect(markup).toContain(">submissions<")
    expect(markup).not.toContain("submissions only")
  })
})
