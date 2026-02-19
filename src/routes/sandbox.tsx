import { createFileRoute } from "@tanstack/react-router";
import { CoinsIcon, TimerIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";

import { LinkCard } from "~/components/link-card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Kbd } from "~/components/ui/kbd";
import { Label } from "~/components/ui/label";
import { Progress } from "~/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Toggle } from "~/components/ui/toggle";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/sandbox")({
  component: RouteComponent,
});

const PANGRAM = "a quick brown fox jumps over the lazy dog";

const pairedColors = [
  { name: "background", bg: "var(--background)", fg: "var(--foreground)" },
  { name: "primary", bg: "var(--primary)", fg: "var(--primary-foreground)" },
  {
    name: "secondary",
    bg: "var(--secondary)",
    fg: "var(--secondary-foreground)",
  },
  { name: "muted", bg: "var(--muted)", fg: "var(--muted-foreground)" },
  { name: "accent", bg: "var(--accent)", fg: "var(--accent-foreground)" },
  {
    name: "destructive",
    bg: "var(--destructive)",
    fg: "var(--destructive-foreground)",
  },
  { name: "card", bg: "var(--card)", fg: "var(--card-foreground)" },
  { name: "popover", bg: "var(--popover)", fg: "var(--popover-foreground)" },
  { name: "sidebar", bg: "var(--sidebar)", fg: "var(--sidebar-foreground)" },
  {
    name: "sidebar-primary",
    bg: "var(--sidebar-primary)",
    fg: "var(--sidebar-primary-foreground)",
  },
  {
    name: "sidebar-accent",
    bg: "var(--sidebar-accent)",
    fg: "var(--sidebar-accent-foreground)",
  },
];

const standaloneGroups = [
  {
    label: "border / input / ring",
    colors: [
      { name: "border", var: "var(--border)" },
      { name: "input", var: "var(--input)" },
      { name: "ring", var: "var(--ring)" },
    ],
  },
  {
    label: "chart",
    colors: [
      { name: "chart-1", var: "var(--chart-1)" },
      { name: "chart-2", var: "var(--chart-2)" },
      { name: "chart-3", var: "var(--chart-3)" },
      { name: "chart-4", var: "var(--chart-4)" },
      { name: "chart-5", var: "var(--chart-5)" },
    ],
  },
  {
    label: "sidebar utilities",
    colors: [
      { name: "sidebar-border", var: "var(--sidebar-border)" },
      { name: "sidebar-ring", var: "var(--sidebar-ring)" },
    ],
  },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function RouteComponent() {
  const [togglePressed, setTogglePressed] = useState(false);

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>sandbox</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div className="flex flex-col gap-6">
        {/* Buttons */}
        <Section title="buttons">
          <div className="flex flex-wrap gap-2">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Separator />

        {/* Badges */}
        <Section title="badges">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">default</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
          </div>
        </Section>

        <Separator />

        {/* Inputs */}
        <Section title="inputs">
          <div className="flex max-w-sm flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-input">label</Label>
              <Input id="demo-input" placeholder="placeholder text..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="demo-disabled">disabled</Label>
              <Input id="demo-disabled" placeholder="disabled" disabled />
            </div>
          </div>
        </Section>

        <Separator />

        {/* Textarea */}
        <Section title="textarea">
          <div className="max-w-sm">
            <Textarea placeholder="type something..." />
          </div>
        </Section>

        <Separator />

        {/* Select */}
        <Section title="select">
          <div className="max-w-sm">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="pick one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kickflip">kickflip</SelectItem>
                <SelectItem value="heelflip">heelflip</SelectItem>
                <SelectItem value="treflip">treflip</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Separator />

        {/* Checkbox */}
        <Section title="checkbox">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Checkbox id="check-1" />
              <Label htmlFor="check-1">unchecked</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check-2" defaultChecked />
              <Label htmlFor="check-2">checked</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check-3" disabled />
              <Label htmlFor="check-3">disabled</Label>
            </div>
          </div>
        </Section>

        <Separator />

        {/* Radio Group */}
        <Section title="radio group">
          <RadioGroup defaultValue="a">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="a" id="radio-a" />
              <Label htmlFor="radio-a">option a</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="b" id="radio-b" />
              <Label htmlFor="radio-b">option b</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="c" id="radio-c" />
              <Label htmlFor="radio-c">option c</Label>
            </div>
          </RadioGroup>
        </Section>

        <Separator />

        {/* Toggle */}
        <Section title="toggle">
          <div className="flex gap-2">
            <Toggle pressed={togglePressed} onPressedChange={setTogglePressed}>
              {togglePressed ? "on" : "off"}
            </Toggle>
            <Toggle variant="outline">outline</Toggle>
          </div>
        </Section>

        <Separator />

        {/* Tabs */}
        <Section title="tabs">
          <Tabs defaultValue="one">
            <TabsList>
              <TabsTab value="one">tab one</TabsTab>
              <TabsTab value="two">tab two</TabsTab>
              <TabsTab value="three">tab three</TabsTab>
            </TabsList>
            <TabsPanel value="one">
              <p className="text-muted-foreground p-4 text-sm">
                content for tab one
              </p>
            </TabsPanel>
            <TabsPanel value="two">
              <p className="text-muted-foreground p-4 text-sm">
                content for tab two
              </p>
            </TabsPanel>
            <TabsPanel value="three">
              <p className="text-muted-foreground p-4 text-sm">
                content for tab three
              </p>
            </TabsPanel>
          </Tabs>
          <div>
            <p className="text-muted-foreground mb-2 text-xs">
              underline variant
            </p>
            <Tabs defaultValue="a">
              <TabsList variant="underline">
                <TabsTab value="a">alpha</TabsTab>
                <TabsTab value="b">beta</TabsTab>
              </TabsList>
              <TabsPanel value="a">
                <p className="text-muted-foreground p-4 text-sm">
                  alpha content
                </p>
              </TabsPanel>
              <TabsPanel value="b">
                <p className="text-muted-foreground p-4 text-sm">
                  beta content
                </p>
              </TabsPanel>
            </Tabs>
          </div>
        </Section>

        <Separator />

        {/* Card */}
        <Section title="card">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>card title</CardTitle>
              <CardDescription>
                a short description of the card content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">card body content goes here.</p>
            </CardContent>
          </Card>
        </Section>

        <Separator />

        {/* Link Card */}
        <Section title="link card">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LinkCard.Root href="/sandbox">
              <LinkCard.Header icon={CoinsIcon} title="Default" />
              <LinkCard.Content>
                <LinkCard.Description>
                  A link card with icon, title, description, and call-to-action
                  arrow. Hover or tab to see effects.
                </LinkCard.Description>
                <LinkCard.Cta label="View" />
              </LinkCard.Content>
            </LinkCard.Root>

            <LinkCard.Root href="/sandbox">
              <LinkCard.Header icon={TimerIcon} title="With Content" />
              <LinkCard.Content>
                <LinkCard.Description>
                  Cards can include arbitrary content between the description
                  and the call-to-action.
                </LinkCard.Description>
                <div className="flex grow flex-col gap-2 border-t pt-4">
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-medium">12</span>{" "}
                    items
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <span className="text-foreground font-medium">4</span>{" "}
                    participants
                  </p>
                </div>
                <LinkCard.Cta label="Open" />
              </LinkCard.Content>
            </LinkCard.Root>

            <LinkCard.Root href="/sandbox" className="opacity-70">
              <LinkCard.Header
                icon={TrophyIcon}
                title="Muted"
                iconClassName="bg-muted text-muted-foreground"
              />
              <LinkCard.Content>
                <LinkCard.Description>
                  Pass className to Root and iconClassName to Header for
                  alternate styles like coming-soon states.
                </LinkCard.Description>
                <LinkCard.Cta label="Soon" />
              </LinkCard.Content>
            </LinkCard.Root>
          </div>
        </Section>

        <Separator />

        {/* Alert */}
        <Section title="alert">
          <div className="flex max-w-sm flex-col gap-2">
            <Alert>
              <AlertTitle>default alert</AlertTitle>
              <AlertDescription>
                this is a default alert message.
              </AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTitle>destructive alert</AlertTitle>
              <AlertDescription>something went wrong.</AlertDescription>
            </Alert>
          </div>
        </Section>

        <Separator />

        {/* Progress */}
        <Section title="progress">
          <div className="flex max-w-sm flex-col gap-2">
            <Progress value={0} />
            <Progress value={33} />
            <Progress value={66} />
            <Progress value={100} />
          </div>
        </Section>

        <Separator />

        {/* Skeleton */}
        <Section title="skeleton">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </Section>

        <Separator />

        {/* Kbd */}
        <Section title="keyboard shortcuts">
          <div className="flex flex-wrap gap-2">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>Enter</Kbd>
            <Kbd>Esc</Kbd>
          </div>
        </Section>

        <Separator />

        {/* Separator */}
        <Section title="separator">
          <div className="flex max-w-sm flex-col gap-2">
            <p className="text-sm">above</p>
            <Separator />
            <p className="text-sm">below</p>
          </div>
          <div className="flex h-6 items-center gap-2">
            <p className="text-sm">left</p>
            <Separator orientation="vertical" />
            <p className="text-sm">right</p>
          </div>
        </Section>

        <Separator />

        {/* Colors - Paired (bg + fg) */}
        <Section title="colors — paired">
          <div className="flex flex-col gap-4">
            {pairedColors.map((pair) => (
              <div key={pair.name} className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs font-medium">
                  {pair.name} / {pair.name}-foreground
                </p>
                <div
                  className="flex flex-col gap-2 rounded-lg border p-4"
                  style={{ backgroundColor: pair.bg, color: pair.fg }}
                >
                  <p className="text-xl font-bold">{PANGRAM}</p>
                  <p className="text-base font-medium">{PANGRAM}</p>
                  <p className="text-sm">{PANGRAM}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Separator />

        {/* Colors - Standalone swatches */}
        <Section title="colors — standalone">
          <div className="flex flex-col gap-4">
            {standaloneGroups.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-medium">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.colors.map((color) => (
                    <div key={color.name} className="flex flex-col gap-1">
                      <div
                        className="size-16 rounded-lg border"
                        style={{ backgroundColor: color.var }}
                      />
                      <p
                        className="text-muted-foreground max-w-16 truncate text-[10px]"
                        title={color.name}
                      >
                        {color.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
      </div>
    </>
  );
}
