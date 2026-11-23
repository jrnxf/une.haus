import { CheckIcon, ChevronDownIcon, SearchIcon, XIcon } from "lucide-react"
import { useState } from "react"

import { RichText } from "~/components/rich-text"
import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"
import { Bubble, BubbleContent } from "~/components/ui/bubble"
import { Button } from "~/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { Message, MessageContent } from "~/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller"
import { ScrollArea } from "~/components/ui/scroll-area"
import { SectionDivider } from "~/components/ui/section-divider"
import { Separator } from "~/components/ui/separator"
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "~/components/ui/trace"
import { cn } from "~/lib/utils"

const BUBBLE_VARIANTS = [
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
] as const

const ACCORDION_ITEMS = ["first", "second", "third"]

const RICH_TEXT_SAMPLE =
  "rich text turns links into anchors: https://example.com/a/very/long/path/that/should/wrap/when/it/does/not/fit\n\nit keeps line breaks, and a mention of user 1 reads @[1]"

export function ContentSection() {
  return (
    <SandboxSection id="content" title="content">
      <Sample title="rich text">
        <RichText content={RICH_TEXT_SAMPLE} />
      </Sample>
      <BubbleSample />
      <ScrollerSample />
      <TraceSample />
      <AccordionSample />
      <ScrollAreaSample />
      <SeparatorSample />
    </SandboxSection>
  )
}

function BubbleSample() {
  return (
    <Sample title="message & bubble">
      <div className="flex flex-col gap-2">
        {BUBBLE_VARIANTS.map((variant, index) => (
          <Message key={variant} align={index % 2 === 0 ? "start" : "end"}>
            <MessageContent>
              <Bubble
                variant={variant}
                align={index % 2 === 0 ? "start" : "end"}
              >
                <BubbleContent>{variant} bubble</BubbleContent>
              </Bubble>
            </MessageContent>
          </Message>
        ))}
        <Message>
          <MessageContent>
            <Bubble variant="secondary">
              <BubbleContent>
                a long message wraps at most at 80% of the row, so it never
                fills the whole width, even with a lot of text in it
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </div>
    </Sample>
  )
}

// The scroller that the ask page uses. Add a message to see it stick to
// the end, or scroll up to see the jump button.
function ScrollerSample() {
  const [count, setCount] = useState(6)

  return (
    <Sample title="message scroller">
      <MessageScrollerProvider>
        <div className="flex h-56 flex-col rounded-md border">
          <MessageScroller>
            <MessageScrollerViewport>
              <MessageScrollerContent>
                {Array.from({ length: count }, (_, index) => (
                  <MessageScrollerItem
                    key={index}
                    messageId={`sandbox-${index}`}
                    scrollAnchor={index === count - 1}
                  >
                    <div className="px-4 py-1">
                      <Bubble
                        variant={index % 2 === 0 ? "muted" : "default"}
                        align={index % 2 === 0 ? "start" : "end"}
                      >
                        <BubbleContent>message {index + 1}</BubbleContent>
                      </Bubble>
                    </div>
                  </MessageScrollerItem>
                ))}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </div>
      </MessageScrollerProvider>
      <Button variant="outline" size="sm" onClick={() => setCount(count + 1)}>
        add
      </Button>
    </Sample>
  )
}

function TraceSample() {
  return (
    <Sample title="trace">
      <Trace>
        <TraceLine>
          <TraceIcon>
            <CheckIcon />
          </TraceIcon>
          <TraceTitle>done step</TraceTitle>
        </TraceLine>
        <TraceLine status="running">
          <TraceIcon>
            <SearchIcon />
          </TraceIcon>
          <TraceTitle>running step</TraceTitle>
        </TraceLine>
        <TraceLine status="error">
          <TraceIcon>
            <XIcon />
          </TraceIcon>
          <TraceTitle>failed step</TraceTitle>
        </TraceLine>
        <TraceLine status="pending">
          <TraceTitle>pending step</TraceTitle>
        </TraceLine>
        <TraceCollapsible>
          <TraceCollapsibleTrigger>
            <TraceLine>
              <TraceIcon>
                <SearchIcon />
              </TraceIcon>
              <TraceTitle>collapsible step (click it)</TraceTitle>
            </TraceLine>
          </TraceCollapsibleTrigger>
          <TraceCollapsibleContent>
            <p className="text-muted-foreground text-sm">
              the details of the step show here
            </p>
          </TraceCollapsibleContent>
        </TraceCollapsible>
      </Trace>
    </Sample>
  )
}

function AccordionSample() {
  const [open, setOpen] = useState(false)

  return (
    <Sample title="accordion & collapsible">
      <SampleRow label="accordion, default variant">
        <Accordion className="w-full">
          {ACCORDION_ITEMS.map((item) => (
            <AccordionItem key={item} value={item}>
              <AccordionTrigger>{item} item</AccordionTrigger>
              <AccordionContent>content for the {item} item</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SampleRow>
      <SampleRow label="accordion, card variant, many open">
        <Accordion multiple variant="card" className="w-full">
          {ACCORDION_ITEMS.map((item) => (
            <AccordionItem key={item} value={item}>
              <AccordionTrigger>{item} item</AccordionTrigger>
              <AccordionContent>content for the {item} item</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </SampleRow>
      <SampleRow label="collapsible">
        <Collapsible open={open} onOpenChange={setOpen} className="w-full">
          <div className="flex flex-col gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-fit">
                <ChevronDownIcon
                  data-icon="inline-start"
                  className={cn(
                    "size-4 transition-transform",
                    open && "rotate-180",
                  )}
                />
                collapsible
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-muted-foreground rounded-md border p-4 text-sm">
                this content can be toggled open and closed
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </SampleRow>
    </Sample>
  )
}

function ScrollAreaSample() {
  return (
    <Sample title="scroll area">
      <div className="rounded-md border">
        <ScrollArea className="h-48">
          <div className="space-y-2 p-4">
            {Array.from({ length: 20 }, (_, index) => (
              <div key={index} className="text-muted-foreground text-sm">
                scrollable item {index + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Sample>
  )
}

function SeparatorSample() {
  return (
    <Sample title="separator & section divider">
      <SectionDivider>section divider</SectionDivider>
      <div className="space-y-2 text-sm">
        <p>horizontal</p>
        <Separator />
        <p>horizontal</p>
      </div>
      <div className="flex items-center gap-2 text-sm">
        vertical
        <Separator orientation="vertical" className="h-8" />
        vertical
      </div>
    </Sample>
  )
}
