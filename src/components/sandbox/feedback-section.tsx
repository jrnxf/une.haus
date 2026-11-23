import { AlertCircleIcon, InboxIcon, InfoIcon } from "lucide-react"
import { toast } from "sonner"

import { NoResultsEmpty } from "~/components/no-results-empty"
import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { Progress } from "~/components/ui/progress"

const PROGRESS_STEPS = [0, 25, 50, 75, 100]

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function FeedbackSection() {
  return (
    <SandboxSection id="feedback" title="feedback">
      <ToastSample />
      <AlertSample />
      <ProgressSample />
      <EmptySample />
    </SandboxSection>
  )
}

function ToastSample() {
  return (
    <Sample title="toast">
      <SampleRow label="type">
        <Button variant="outline" size="sm" onClick={() => toast("default")}>
          default
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("action completed")}
        >
          success
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.error("something went wrong")}
        >
          error
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("here's some info")}
        >
          info
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.warning("check this first")}
        >
          warning
        </Button>
      </SampleRow>
      <SampleRow label="description, action & promise">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast("post saved", {
              description: "it shows on your profile now",
            })
          }
        >
          description
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast("post deleted", {
              action: {
                label: "undo",
                onClick: () => toast.success("restored"),
              },
            })
          }
        >
          action
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            toast.promise(wait(1500), {
              loading: "saving",
              success: "saved",
              error: "could not save",
            })
          }
        >
          promise
        </Button>
      </SampleRow>
    </Sample>
  )
}

function AlertSample() {
  return (
    <Sample title="alerts">
      <Alert>
        <InfoIcon />
        <AlertDescription>this is a default alert message</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>this is a destructive alert message</AlertDescription>
      </Alert>
      <Alert>
        <AlertDescription>
          an alert with no icon and a long message that wraps onto a second line
          so we can check the spacing of the text
        </AlertDescription>
      </Alert>
    </Sample>
  )
}

function ProgressSample() {
  return (
    <Sample title="progress">
      {PROGRESS_STEPS.map((value) => (
        <Progress key={value} value={value} aria-label={`${value} percent`}>
          <span className="text-muted-foreground w-full text-xs">{value}%</span>
        </Progress>
      ))}
      <Progress value={null} aria-label="loading">
        <span className="text-muted-foreground w-full text-xs">
          indeterminate (value null)
        </span>
      </Progress>
    </Sample>
  )
}

function EmptySample() {
  return (
    <Sample title="empty state" wide>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-3">
        <div className="flex rounded-lg border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <InboxIcon />
              </EmptyMedia>
              <EmptyTitle>no items yet</EmptyTitle>
              <EmptyDescription>
                items will appear here once they're created
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
        <div className="flex rounded-lg border">
          <Empty>
            <EmptyHeader>
              <EmptyMedia>
                <InboxIcon className="text-muted-foreground size-8" />
              </EmptyMedia>
              <EmptyTitle>default media, with content</EmptyTitle>
              <EmptyDescription>
                empty content holds the actions
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button>Create</Button>
            </EmptyContent>
          </Empty>
        </div>
        <div className="rounded-lg border">
          <NoResultsEmpty />
        </div>
      </div>
    </Sample>
  )
}
