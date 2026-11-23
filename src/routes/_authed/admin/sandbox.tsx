import { createFileRoute } from "@tanstack/react-router"

import { PageHeader } from "~/components/page-header"
import { ButtonsSection } from "~/components/sandbox/buttons-section"
import { ContentSection } from "~/components/sandbox/content-section"
import { DatavizSection } from "~/components/sandbox/dataviz-section"
import { DisplaySection } from "~/components/sandbox/display-section"
import { FeedbackSection } from "~/components/sandbox/feedback-section"
import { FormSection } from "~/components/sandbox/form-section"
import { NavigationSection } from "~/components/sandbox/navigation-section"
import { OverlaysSection } from "~/components/sandbox/overlays-section"
import { RareSection } from "~/components/sandbox/rare-section"
import { TokensSection } from "~/components/sandbox/tokens-section"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import { useTheme } from "~/lib/theme/context"

export const Route = createFileRoute("/_authed/admin/sandbox")({
  component: RouteComponent,
})

const SECTIONS = [
  { id: "tokens", label: "tokens" },
  { id: "buttons", label: "buttons" },
  { id: "form", label: "form" },
  { id: "navigation", label: "navigation" },
  { id: "overlays", label: "overlays" },
  { id: "feedback", label: "feedback" },
  { id: "display", label: "display" },
  { id: "dataviz", label: "data viz" },
  { id: "content", label: "content" },
  { id: "rare", label: "rare" },
]

const THEMES = ["light", "dark", "system"] as const

function RouteComponent() {
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/admin">admin</PageHeader.Crumb>
          <PageHeader.Crumb>sandbox</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="@container w-full space-y-6 p-4 md:p-6">
        <Toolbar />
        <TokensSection />
        <ButtonsSection />
        <FormSection />
        <NavigationSection />
        <OverlaysSection />
        <FeedbackSection />
        <DisplaySection />
        <DatavizSection />
        <ContentSection />
        <RareSection />
      </div>
    </>
  )
}

function Toolbar() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex flex-col gap-2 @2xl:flex-row @2xl:items-center @2xl:justify-between">
      <nav aria-label="sections" className="flex flex-wrap gap-1">
        {SECTIONS.map((section) => (
          <Button key={section.id} variant="ghost" size="sm" asChild>
            <a href={`#${section.id}`}>{section.label}</a>
          </Button>
        ))}
      </nav>
      <ButtonGroup aria-label="theme">
        {THEMES.map((option) => (
          <Button
            key={option}
            variant={theme === option ? "secondary" : "outline"}
            size="sm"
            aria-pressed={theme === option}
            onClick={() => setTheme(option)}
          >
            {option}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  )
}
