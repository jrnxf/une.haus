import {
  ArrowRightIcon,
  BoldIcon,
  ItalicIcon,
  Loader2Icon,
  MailIcon,
  PlusIcon,
  SearchIcon,
  UnderlineIcon,
} from "lucide-react"

import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import { Button } from "~/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "~/components/ui/button-group"
import { Input } from "~/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

const VARIANTS = [
  "default",
  "secondary",
  "outline",
  "ghost",
  "destructive",
  "link",
] as const

export function ButtonsSection() {
  return (
    <SandboxSection id="buttons" title="buttons">
      <Sample title="variants">
        <SampleRow label="variant">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </SampleRow>
        <SampleRow label="disabled">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {variant}
            </Button>
          ))}
        </SampleRow>
        <SampleRow label="invalid">
          <Button variant="outline" aria-invalid="true">
            outline
          </Button>
          <Button variant="secondary" aria-invalid="true">
            secondary
          </Button>
        </SampleRow>
      </Sample>

      <Sample title="sizes & icons">
        <SampleRow label="size">
          <Button size="sm">small</Button>
          <Button>default</Button>
          <Button size="icon" aria-label="mail">
            <MailIcon />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="search">
            <SearchIcon />
          </Button>
          <Button size="icon-xs" variant="secondary" aria-label="bold">
            <BoldIcon />
          </Button>
        </SampleRow>
        <SampleRow label="icon left & right">
          <Button variant="outline" iconLeft={<PlusIcon />}>
            create
          </Button>
          <Button variant="secondary" iconRight={<ArrowRightIcon />}>
            next
          </Button>
        </SampleRow>
        <SampleRow label="pending">
          <Button disabled iconLeft={<Loader2Icon className="animate-spin" />}>
            saving
          </Button>
        </SampleRow>
      </Sample>

      <Sample title="card & unstyled">
        <SampleRow label="variant card (size auto)">
          <Button variant="card" className="w-full">
            <span className="flex flex-col gap-1 p-4">
              <span className="font-medium">a whole card is the button</span>
              <span className="text-muted-foreground text-xs">
                the text wraps, and it aligns to the start
              </span>
            </span>
          </Button>
        </SampleRow>
        <SampleRow label="variant unstyled, size auto">
          <Button variant="unstyled" size="auto">
            no chrome at all
          </Button>
        </SampleRow>
      </Sample>

      <Sample title="button group" wide>
        <SampleRow label="horizontal">
          <ButtonGroup>
            <Button variant="outline" size="icon-sm" aria-label="bold">
              <BoldIcon />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="italic">
              <ItalicIcon />
            </Button>
            <Button variant="outline" size="icon-sm" aria-label="underline">
              <UnderlineIcon />
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Button variant="outline" size="sm">
              left
            </Button>
            <Button variant="outline" size="sm">
              center
            </Button>
            <Button variant="outline" size="sm">
              right
            </Button>
          </ButtonGroup>
        </SampleRow>
        <SampleRow label="vertical">
          <ButtonGroup orientation="vertical">
            <Button variant="outline" size="sm">
              top
            </Button>
            <Button variant="outline" size="sm">
              middle
            </Button>
            <Button variant="outline" size="sm">
              bottom
            </Button>
          </ButtonGroup>
        </SampleRow>
        <SampleRow label="with text, input & select">
          <ButtonGroup>
            <ButtonGroupText>https://</ButtonGroupText>
            <Input
              data-slot="input"
              aria-label="url"
              placeholder="example.com"
            />
            <Button data-slot="button" variant="outline">
              go
            </Button>
          </ButtonGroup>
          <ButtonGroup>
            <Select defaultValue="week">
              <SelectTrigger aria-label="range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">day</SelectItem>
                <SelectItem value="week">week</SelectItem>
                <SelectItem value="month">month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">apply</Button>
          </ButtonGroup>
        </SampleRow>
      </Sample>
    </SandboxSection>
  )
}
