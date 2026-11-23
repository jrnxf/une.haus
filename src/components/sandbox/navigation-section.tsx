import { Link } from "@tanstack/react-router"
import { CalendarIcon, SettingsIcon, UserIcon } from "lucide-react"
import { useState } from "react"

import {
  type ActiveFilter,
  type FilterField,
  Filters,
} from "~/components/filters/filters"
import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "~/components/ui/command"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"

const TAB_NAMES = ["alpha", "beta", "gamma", "delta", "epsilon"]

const MANY_TABS = [
  "overview",
  "tricks",
  "videos",
  "posts",
  "games",
  "tourneys",
  "followers",
  "following",
  "settings",
]

const FILTER_FIELDS: FilterField[] = [
  {
    key: "name",
    label: "name",
    type: "text",
    placeholder: "search...",
    operators: [{ value: "contains", label: "contains" }],
    defaultOperator: "contains",
  },
  {
    key: "disciplines",
    label: "disciplines",
    type: "multiselect",
    operators: [
      { value: "contain", label: "contain" },
      { value: "equal", label: "equal" },
    ],
    defaultOperator: "contain",
    options: ["street", "flatland", "trials", "freestyle", "muni"].map(
      (discipline) => ({ value: discipline, label: discipline }),
    ),
  },
]

export function NavigationSection() {
  return (
    <SandboxSection id="navigation" title="navigation">
      <BreadcrumbSample />
      <TabsSample />
      <FiltersSample />
      <CommandSample />
    </SandboxSection>
  )
}

function BreadcrumbSample() {
  return (
    <Sample title="breadcrumb">
      <p className="text-muted-foreground text-xs">
        the page header at the top of this page is the live sample of
        PageHeader. this is the primitive under it.
      </p>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/admin" />}>admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link to="/admin/sandbox" />}>
              sandbox
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="min-w-0">
              <span className="block truncate">
                a very long current page title that has to truncate
              </span>
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </Sample>
  )
}

function TabsSample() {
  const [tab, setTab] = useState("alpha")

  return (
    <Sample title="tabs" wide>
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
        <SampleRow label="default (controlled), one disabled">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TAB_NAMES.map((name) => (
                <TabsTrigger
                  key={name}
                  value={name}
                  disabled={name === "gamma"}
                >
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SampleRow>
        <SampleRow label="underline">
          <Tabs defaultValue="alpha">
            <TabsList variant="underline">
              {TAB_NAMES.map((name) => (
                <TabsTrigger
                  key={name}
                  value={name}
                  disabled={name === "gamma"}
                >
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SampleRow>
        <SampleRow label="with icons">
          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">
                <UserIcon />
                profile
              </TabsTrigger>
              <TabsTrigger value="events">
                <CalendarIcon />
                events
              </TabsTrigger>
              <TabsTrigger value="settings">
                <SettingsIcon />
                settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SampleRow>
        <SampleRow label="vertical">
          <Tabs defaultValue="alpha" orientation="vertical">
            <TabsList variant="underline">
              {TAB_NAMES.slice(0, 3).map((name) => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SampleRow>
      </div>
      <SampleRow label="overflow (scrolls sideways)">
        <div className="w-full overflow-x-auto">
          <Tabs defaultValue="overview">
            <TabsList>
              {MANY_TABS.map((name) => (
                <TabsTrigger key={name} value={name}>
                  {name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </SampleRow>
    </Sample>
  )
}

function FiltersSample() {
  const [filters, setFilters] = useState<ActiveFilter[]>([
    {
      id: "sample-disciplines",
      field: "disciplines",
      operator: "contain",
      values: ["street", "flatland"],
    },
  ])

  return (
    <Sample title="filters chip bar">
      <SampleRow label="default">
        <Filters
          fields={FILTER_FIELDS}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </SampleRow>
      <SampleRow label="small, empty">
        <Filters
          fields={FILTER_FIELDS}
          filters={[]}
          onFiltersChange={() => {}}
          size="sm"
        />
      </SampleRow>
    </Sample>
  )
}

function CommandSample() {
  return (
    <Sample title="command">
      <div className="overflow-hidden rounded-lg border">
        <Command>
          <CommandInput placeholder="type a command or search..." />
          <CommandList>
            <CommandEmpty>no results found</CommandEmpty>
            <CommandGroup heading="pages">
              <CommandItem>
                <UserIcon />
                users
              </CommandItem>
              <CommandItem>
                <CalendarIcon />
                tourneys
              </CommandItem>
              <CommandItem disabled>
                <SettingsIcon />
                settings (disabled)
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="actions">
              <CommandItem>
                new post
                <CommandShortcut>⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem>
                search
                <CommandShortcut>⌘K</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </Sample>
  )
}
