import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { InfoIcon } from "lucide-react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { useSessionUser } from "~/lib/session/hooks"

export const Route = createFileRoute("/tricks/glossary/_list")({
  component: GlossaryListLayout,
})

function GlossaryListLayout() {
  const router = useRouter()
  const user = useSessionUser()
  const pathname = useLocation({ select: (l) => l.pathname })
  const currentTab = pathname.includes("/elements") ? "elements" : "modifiers"

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>glossary</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
        <ContentHeaderRow
          className="max-w-none"
          left={
            <div className="flex items-center gap-2">
              <Tabs
                value={currentTab}
                onValueChange={(value) => {
                  router.navigate({ to: `/tricks/glossary/${value}` })
                }}
              >
                <TabsList>
                  <TabsTrigger value="elements">elements</TabsTrigger>
                  <TabsTrigger value="modifiers">modifiers</TabsTrigger>
                </TabsList>
              </Tabs>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="text-muted-foreground size-4" />
                </TooltipTrigger>
                <TooltipContent side="right" className="space-y-1">
                  <p>
                    <span className="font-semibold">elements</span> represent
                    the building blocks of a trick. adding or removing an
                    element transforms a trick into a new one.
                  </p>
                  <p>
                    <span className="font-semibold">modifiers</span> describe
                    the different ways you can perform a trick. they change the
                    way the trick is done, but not signifcantly enough to
                    warrant a new entry.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          }
          right={
            user ? (
              <Button asChild>
                <Link to={`/tricks/glossary/${currentTab}/create`}>create</Link>
              </Button>
            ) : null
          }
        />

        <div>
          <Outlet />
        </div>
      </div>
    </>
  )
}
