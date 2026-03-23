import { createFileRoute } from "@tanstack/react-router"
import {
  AlertCircleIcon,
  BoldIcon,
  ChevronDownIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  HeartIcon,
  InboxIcon,
  ItalicIcon,
  MailIcon,
  MessageSquareIcon,
  PencilIcon,
  SearchIcon,
  ShareIcon,
  TrashIcon,
  UnderlineIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { Tray, TrayContent, TrayTitle, TrayTrigger } from "~/components/tray"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"
import { Alert, AlertDescription } from "~/components/ui/alert"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Checkbox } from "~/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible"
import { CountChip } from "~/components/ui/count-chip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "~/components/ui/field"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card"
import { Input } from "~/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
import { Kbd, KbdGroup } from "~/components/ui/kbd"
import { Metaline } from "~/components/ui/metaline"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Progress } from "~/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group"
import { ScrollArea } from "~/components/ui/scroll-area"
import { SectionDivider } from "~/components/ui/section-divider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Separator } from "~/components/ui/separator"
import { StatBadge } from "~/components/ui/stat-badge"
import { StatusIndicator } from "~/components/ui/status"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip"

export const Route = createFileRoute("/_authed/admin/sandbox")({
  component: RouteComponent,
})

function RouteComponent() {
  const [tab, setTab] = useState("one")
  const [plan, setPlan] = useState("free")
  const [agreed, setAgreed] = useState(false)
  const [otp, setOtp] = useState("")
  const [collapsibleOpen, setCollapsibleOpen] = useState(false)

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/admin">admin</PageHeader.Crumb>
          <PageHeader.Crumb>sandbox</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="@container w-full space-y-6 p-4 md:p-6">
        {/* 3 columns */}
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>input</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel>name</FieldLabel>
                    <Input placeholder="enter your name" />
                    <FieldDescription>your display name</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>email</FieldLabel>
                    <Input type="email" placeholder="you@example.com" />
                  </Field>
                  <Field>
                    <FieldLabel>search</FieldLabel>
                    <Input placeholder="search..." />
                  </Field>
                  <Field>
                    <FieldLabel>disabled</FieldLabel>
                    <Input placeholder="can't edit this" disabled />
                  </Field>
                  <Field>
                    <FieldLabel>with error</FieldLabel>
                    <Input placeholder="invalid" aria-invalid="true" />
                    <FieldError>this field is required</FieldError>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>textarea & select</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field>
                    <FieldLabel>bio</FieldLabel>
                    <Textarea placeholder="tell us about yourself" />
                    <FieldDescription>max 200 characters</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>category</FieldLabel>
                    <Select defaultValue="general">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="general">general</SelectItem>
                          <SelectItem value="feedback">feedback</SelectItem>
                          <SelectItem value="bug">bug report</SelectItem>
                          <SelectItem value="feature">
                            feature request
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel>disabled select</FieldLabel>
                    <Select defaultValue="locked" disabled>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="locked">locked</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>checkbox, radio & otp</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldSet>
                <FieldGroup>
                  <Field orientation="horizontal">
                    <Checkbox
                      checked={agreed}
                      onCheckedChange={(checked) => setAgreed(Boolean(checked))}
                    />
                    <FieldLabel>i agree to the terms</FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox checked disabled />
                    <FieldLabel>disabled checked</FieldLabel>
                  </Field>
                  <Separator />
                  <RadioGroup value={plan} onValueChange={setPlan}>
                    <Field orientation="horizontal">
                      <RadioGroupItem value="free" />
                      <FieldLabel>free</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <RadioGroupItem value="pro" />
                      <FieldLabel>pro</FieldLabel>
                    </Field>
                    <Field orientation="horizontal">
                      <RadioGroupItem value="enterprise" />
                      <FieldLabel>enterprise</FieldLabel>
                    </Field>
                  </RadioGroup>
                  <Separator />
                  <Field>
                    <FieldLabel>verification code</FieldLabel>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </CardContent>
          </Card>
        </div>

        {/* 2 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>buttons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>default</Button>
                <Button variant="secondary">secondary</Button>
                <Button variant="outline">outline</Button>
                <Button variant="ghost">ghost</Button>
                <Button variant="destructive">destructive</Button>
                <Button variant="link">link</Button>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button size="sm">small</Button>
                <Button>default</Button>
                <Button size="icon">
                  <MailIcon className="size-4" />
                </Button>
                <Button size="icon-sm" variant="outline">
                  <SearchIcon className="size-4" />
                </Button>
                <Button size="icon-xs" variant="secondary">
                  <BoldIcon className="size-3" />
                </Button>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button disabled>disabled</Button>
                <Button variant="secondary" disabled>
                  disabled
                </Button>
                <Button variant="outline" disabled>
                  disabled
                </Button>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <ButtonGroup>
                  <Button variant="outline" size="icon-sm">
                    <BoldIcon className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm">
                    <ItalicIcon className="size-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm">
                    <UnderlineIcon className="size-4" />
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>tabs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-2 text-sm">default</p>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="one">alpha</TabsTrigger>
                    <TabsTrigger value="two">beta</TabsTrigger>
                    <TabsTrigger value="three" disabled>
                      gamma
                    </TabsTrigger>
                    <TabsTrigger value="four">delta</TabsTrigger>
                    <TabsTrigger value="five">epsilon</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground mb-2 text-sm">underline</p>
                <Tabs defaultValue="alpha">
                  <TabsList variant="underline">
                    <TabsTrigger value="alpha">alpha</TabsTrigger>
                    <TabsTrigger value="beta">beta</TabsTrigger>
                    <TabsTrigger value="gamma" disabled>
                      gamma
                    </TabsTrigger>
                    <TabsTrigger value="delta">delta</TabsTrigger>
                    <TabsTrigger value="epsilon">epsilon</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2 @5xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>dropdown menu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="outline" size="sm" />}
                  >
                    actions
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>actions</DropdownMenuLabel>
                      <DropdownMenuItem>
                        <CopyIcon />
                        copy
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ShareIcon />
                        share
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <PencilIcon />
                        edit
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive">
                      <TrashIcon />
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="more"
                      />
                    }
                  >
                    <EllipsisVerticalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <ShareIcon />
                      share
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <PencilIcon />
                      edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>popover & hover card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      popover
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <div className="space-y-2">
                      <p className="font-medium">popover title</p>
                      <p className="text-muted-foreground text-sm">
                        this is a popover with some content inside it
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                <HoverCard>
                  <HoverCardTrigger
                    render={
                      <Button variant="outline" size="sm">
                        hover card
                      </Button>
                    }
                  />
                  <HoverCardContent>
                    <div className="flex items-center gap-3">
                      <Avatar alt="colby" className="size-10">
                        <AvatarFallback name="colby" />
                      </Avatar>
                      <div>
                        <p className="font-medium">colby</p>
                        <p className="text-muted-foreground text-sm">
                          hover cards show on hover
                        </p>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>toast</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
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
                  onClick={() => toast("default toast")}
                >
                  default
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>dialog, drawer & tray</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      dialog
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>dialog title</DialogTitle>
                      <DialogDescription>
                        this is a dialog with a title and description
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm">
                        cancel
                      </Button>
                      <Button size="sm">confirm</Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="outline" size="sm">
                      drawer
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="px-4">
                      <DrawerTitle>drawer title</DrawerTitle>
                      <p className="text-muted-foreground mt-2 text-sm">
                        this is a bottom drawer that slides up from the bottom
                        of the screen
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          cancel
                        </Button>
                        <Button size="sm">confirm</Button>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
                <Tray>
                  <TrayTrigger asChild>
                    <Button variant="outline" size="sm">
                      tray
                    </Button>
                  </TrayTrigger>
                  <TrayContent>
                    <TrayTitle>tray title</TrayTitle>
                    <p className="text-muted-foreground text-sm">
                      drawer on mobile, dialog on desktop
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        cancel
                      </Button>
                      <Button size="sm">confirm</Button>
                    </div>
                  </TrayContent>
                </Tray>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>avatar & status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Avatar alt="colby" className="size-8">
                  <AvatarFallback name="colby" />
                </Avatar>
                <Avatar alt="jane doe" className="size-8">
                  <AvatarFallback name="jane doe" />
                </Avatar>
                <Avatar alt="ab" className="size-10">
                  <AvatarFallback name="ab" />
                </Avatar>
                <Avatar alt="test user" className="size-12">
                  <AvatarFallback name="test user" />
                </Avatar>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <StatusIndicator className="bg-green-500" />
                  <span className="text-sm">online</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator className="bg-yellow-500" />
                  <span className="text-sm">away</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIndicator className="bg-red-500" />
                  <span className="text-sm">busy</span>
                </div>
              </div>
              <Separator />
              <Metaline parts={["colby", "3 tricks", "12 videos"]} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>accordion & collapsible</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Accordion multiple>
                <div className="space-y-2">
                  <AccordionItem
                    value="one"
                    className="bg-card rounded-lg border"
                  >
                    <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                      first item
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0.5">
                      content for the first accordion item
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="two"
                    className="bg-card rounded-lg border"
                  >
                    <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                      second item
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0.5">
                      content for the second accordion item
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem
                    value="three"
                    className="bg-card rounded-lg border"
                  >
                    <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                      third item
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0.5">
                      content for the third accordion item
                    </AccordionContent>
                  </AccordionItem>
                </div>
              </Accordion>
              <Separator />
              <Collapsible
                open={collapsibleOpen}
                onOpenChange={setCollapsibleOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ChevronDownIcon
                      className={`size-4 transition-transform ${collapsibleOpen ? "rotate-180" : ""}`}
                    />
                    collapsible
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="text-muted-foreground mt-2 rounded-md border p-4 text-sm">
                    this content can be toggled open and closed
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>

        {/* 2 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>badges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge>default</Badge>
                <Badge variant="secondary">secondary</Badge>
                <Badge variant="outline">outline</Badge>
                <Badge variant="destructive">destructive</Badge>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                <CountChip>3</CountChip>
                <CountChip>12</CountChip>
                <CountChip>99+</CountChip>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <StatBadge icon={HeartIcon} count={42} label="like" />
                <StatBadge icon={MessageSquareIcon} count={7} label="comment" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>kbd & tooltip</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
                <KbdGroup>
                  <Kbd>⌘</Kbd>
                  <Kbd>⇧</Kbd>
                  <Kbd>P</Kbd>
                </KbdGroup>
                <Kbd>esc</Kbd>
                <Kbd>enter</Kbd>
              </div>
              <Separator />
              <TooltipProvider>
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        hover me
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>tooltip content</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon-sm">
                        <MailIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>send email</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        </div>

        {/* 2 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={25} />
              <Progress value={50} />
              <Progress value={75} />
              <Progress value={100} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircleIcon />
                <AlertDescription>
                  this is a default alert message
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>
                  this is a destructive alert message
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* 2 columns */}
        <div className="grid grid-cols-1 gap-4 @lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>empty state</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>scroll area</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded-md border p-4">
                <div className="space-y-2">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="text-muted-foreground text-sm">
                      scrollable item {i + 1}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 1 column */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>separator & section divider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-8">
              <div className="flex-1">
                <SectionDivider>section divider</SectionDivider>
              </div>
              <div className="flex-1">
                <div>
                  horizontal
                  <Separator />
                  horizontal
                </div>
              </div>
              <div className="flex flex-1 items-center gap-2">
                vertical
                <Separator orientation="vertical" className="h-8" />
                vertical
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
