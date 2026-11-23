import { Link } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"

import { confirm } from "~/components/confirm-dialog-handle"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Textarea } from "~/components/ui/textarea"
import { type ReviewField, type ReviewKind } from "~/lib/admin/review"

/** Approve or reject, with a note that goes to the rider who sent the item. */
export type ReviewDecision = {
  /** The word for the item in the confirm dialog, such as "submission". */
  noun: string
  rejectDescription: string
  /** A one-click note for a common reason to reject. */
  quickNote?: { label: string; text: string }
  isPending: boolean
  onApprove: (notes: string) => void
  onReject: (notes: string) => void
}

export function ReviewCard({
  kind,
  badge,
  title,
  submitter,
  createdAt,
  children,
  raw,
  decision,
  actions,
}: {
  kind: ReviewKind
  /** A second badge, for a detail such as "edit modifier". */
  badge?: string
  title: ReactNode
  submitter: { id: number; name: string }
  createdAt: Date
  children?: ReactNode
  /** The exact payload. It mounts only when the reviewer opens it. */
  raw?: ReactNode
  /** The usual approve and reject pair, with a notes field. */
  decision?: ReviewDecision
  /** Other buttons, for an item that is not approved or rejected. */
  actions?: ReactNode
}) {
  const [rawOpen, setRawOpen] = useState(false)
  const [notes, setNotes] = useState("")
  const trimmedNotes = notes.trim()

  return (
    <Card className="py-3">
      <CardContent className="space-y-4 px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="outline">{kind}</Badge>
            {badge && <Badge variant="secondary">{badge}</Badge>}
            <div className="truncate text-sm font-medium">{title}</div>
          </div>
          <Metaline
            className="shrink-0 text-xs"
            parts={[
              <Link
                key="name"
                to="/users/$userId"
                params={{ userId: submitter.id }}
                className="hover:text-foreground transition-colors"
              >
                {submitter.name}
              </Link>,
              <RelativeTimeCard key="time" date={createdAt} variant="muted" />,
            ]}
          />
        </div>

        {children}

        {raw && rawOpen && raw}

        <div className="flex flex-wrap items-end justify-end gap-2">
          {raw && (
            <Button
              variant="ghost"
              className="mr-auto -ml-2.5 sm:mr-0"
              aria-expanded={rawOpen}
              onClick={() => setRawOpen((open) => !open)}
            >
              raw
            </Button>
          )}
          {decision ? (
            <>
              <Textarea
                size="compact"
                className="order-first w-full sm:order-none sm:w-auto sm:min-w-48 sm:flex-1"
                aria-label="review notes"
                placeholder="notes (required to reject)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              {decision.quickNote && (
                <Button
                  variant="secondary"
                  onClick={() => setNotes(decision.quickNote?.text ?? "")}
                  disabled={decision.isPending}
                >
                  {decision.quickNote.label}
                </Button>
              )}
              <Button
                variant="destructive-ghost"
                onClick={() =>
                  confirm.open({
                    title: `reject ${decision.noun}?`,
                    description: decision.rejectDescription,
                    confirmText: "reject",
                    variant: "destructive",
                    onConfirm: () => decision.onReject(trimmedNotes),
                  })
                }
                disabled={decision.isPending || !trimmedNotes}
              >
                reject
              </Button>
              <Button
                onClick={() => decision.onApprove(trimmedNotes)}
                disabled={decision.isPending}
              >
                approve
              </Button>
            </>
          ) : (
            actions
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function ReviewReason({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground text-xs text-pretty italic">
      &quot;{children}&quot;
    </p>
  )
}

function FieldValue({ field }: { field: ReviewField }) {
  if (field.kind === "list") {
    return (
      <dd className="flex min-w-0 flex-wrap items-center gap-1">
        {field.kept.map((item) => (
          <Badge key={`kept-${item}`} variant="secondary">
            {item}
          </Badge>
        ))}
        {field.removed.map((item) => (
          <Badge key={`removed-${item}`} variant="destructive">
            <del>{item}</del>
          </Badge>
        ))}
        {field.added.map((item) => (
          <Badge key={`added-${item}`} variant="success">
            <ins className="no-underline">+ {item}</ins>
          </Badge>
        ))}
      </dd>
    )
  }

  if (field.before === field.after) {
    return (
      <dd className="min-w-0 wrap-anywhere">
        {field.href ? (
          <a
            href={field.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            {field.after}
          </a>
        ) : (
          field.after
        )}
      </dd>
    )
  }

  return (
    <dd className="flex min-w-0 flex-wrap items-baseline gap-1 wrap-anywhere">
      {field.before !== null && (
        <del className="bg-destructive-bg text-destructive rounded-sm px-1">
          {field.before}
        </del>
      )}
      {field.after !== null && (
        <ins className="bg-success-bg text-success rounded-sm px-1 no-underline">
          {field.after}
        </ins>
      )}
    </dd>
  )
}

export function ReviewFields({ fields }: { fields: ReviewField[] }) {
  if (fields.length === 0) {
    return <p className="text-muted-foreground text-sm">no changes</p>
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {fields.map((field) => (
        <div key={field.label} className="contents">
          <dt className="text-muted-foreground">{field.label}</dt>
          <FieldValue field={field} />
        </div>
      ))}
    </dl>
  )
}
