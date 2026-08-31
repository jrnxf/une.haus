import * as Sentry from "@sentry/tanstackstart-react"
import { Component, type ReactNode } from "react"

import { Button } from "~/components/ui/button"

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

// catches render errors thrown by the app shell itself (providers, sidebar,
// nav chrome) — route-level errors are handled by the router's
// defaultErrorComponent, which cannot cover the shell that renders around it
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    Sentry.captureException(error)
  }

  retry = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
          <p className="text-muted-foreground text-sm">something went wrong</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={this.retry}>
              retry
            </Button>
            <Button
              onClick={() => {
                globalThis.location.reload()
              }}
            >
              reload
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
