import {
  CopyIcon,
  EllipsisVerticalIcon,
  MailIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog-handle"
import { Sample, SampleRow, SandboxSection } from "~/components/sandbox/sample"
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray"
import { Avatar, AvatarFallback } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"

const SIDES = ["top", "right", "bottom", "left"] as const
const DIRECTIONS = ["bottom", "top", "left", "right"] as const

export function OverlaysSection() {
  return (
    <SandboxSection id="overlays" title="overlays">
      <DialogSample />
      <DrawerSample />
      <DropdownSample />
      <PopoverSample />
      <TooltipSample />
    </SandboxSection>
  )
}

function DialogSample() {
  return (
    <Sample title="dialog, tray & confirm">
      <SampleRow label="dialog">
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
              <DialogClose render={<Button variant="outline" size="sm" />}>
                cancel
              </DialogClose>
              <DialogClose render={<Button size="sm" />}>confirm</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              no close button
            </Button>
          </DialogTrigger>
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>no close button</DialogTitle>
              <DialogDescription>
                close it with the button below, escape, or a click outside
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <DialogClose render={<Button size="sm" />}>done</DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </SampleRow>
      <SampleRow label="tray (drawer on mobile, dialog on desktop)">
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
              <TrayClose render={<Button variant="outline" size="sm" />}>
                cancel
              </TrayClose>
              <TrayClose render={<Button size="sm" />}>confirm</TrayClose>
            </div>
          </TrayContent>
        </Tray>
      </SampleRow>
      <SampleRow label="confirm dialog">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            confirm.open({
              title: "publish this post?",
              description: "everyone can see it after you publish",
              confirmText: "publish",
              onConfirm: () => toast.success("published"),
            })
          }
        >
          default
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() =>
            confirm.open({
              title: "delete this post?",
              description: "you can't undo this",
              confirmText: "delete",
              variant: "destructive",
              onConfirm: () => toast.success("deleted"),
            })
          }
        >
          destructive
        </Button>
      </SampleRow>
    </Sample>
  )
}

function DrawerSample() {
  return (
    <Sample title="drawer">
      <SampleRow label="direction">
        {DIRECTIONS.map((direction) => (
          <Drawer key={direction} direction={direction}>
            <DrawerTrigger asChild>
              <Button variant="outline" size="sm">
                {direction}
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="flex flex-col gap-4 px-4">
                <DrawerTitle>drawer from the {direction}</DrawerTitle>
                <p className="text-muted-foreground text-sm">
                  swipe it away, or use a button below
                </p>
                <div className="flex gap-2">
                  <DrawerClose render={<Button variant="outline" size="sm" />}>
                    cancel
                  </DrawerClose>
                  <DrawerClose render={<Button size="sm" />}>
                    confirm
                  </DrawerClose>
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        ))}
      </SampleRow>
    </Sample>
  )
}

function DropdownSample() {
  const [showHidden, setShowHidden] = useState(false)
  const [compact, setCompact] = useState(true)
  const [sort, setSort] = useState("newest")

  return (
    <Sample title="dropdown menu">
      <SampleRow label="actions, sub menu, shortcuts">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            actions
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <CopyIcon />
                copy
                <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <PencilIcon />
                edit
                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ShareIcon />
                  share
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>
                    <MailIcon />
                    email
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CopyIcon />
                    copy link
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem disabled>archive (disabled)</DropdownMenuItem>
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
              <Button variant="outline" size="icon-sm" aria-label="view" />
            }
          >
            <EllipsisVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>view</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={compact}
                onCheckedChange={setCompact}
              >
                compact
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showHidden}
                onCheckedChange={setShowHidden}
              >
                show hidden
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>sort</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
                <DropdownMenuRadioItem value="newest">
                  newest
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="oldest">
                  oldest
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="popular">
                  popular
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SampleRow>
    </Sample>
  )
}

function PopoverSample() {
  return (
    <Sample title="popover & hover card">
      <SampleRow label="popover side">
        {SIDES.map((side) => (
          <Popover key={side}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                {side}
              </Button>
            </PopoverTrigger>
            <PopoverContent side={side}>
              <div className="space-y-2">
                <p className="font-medium">popover title</p>
                <p className="text-muted-foreground text-sm">
                  this popover opens on the {side}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        ))}
      </SampleRow>
      <SampleRow label="hover card">
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
              <Avatar alt="jane doe" className="size-10">
                <AvatarFallback name="jane doe" />
              </Avatar>
              <div>
                <p className="font-medium">jane doe</p>
                <p className="text-muted-foreground text-sm">
                  hover cards show on hover
                </p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </SampleRow>
    </Sample>
  )
}

function TooltipSample() {
  return (
    <Sample title="tooltip">
      <SampleRow label="side">
        {SIDES.map((side) => (
          <Tooltip key={side}>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm">
                {side}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={side}>tooltip on the {side}</TooltipContent>
          </Tooltip>
        ))}
      </SampleRow>
      <SampleRow label="icon button & long text">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" aria-label="send email">
              <MailIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>send email</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              long
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            a long tooltip wraps at its max width so it never runs off the
            screen, even with a lot of words in it
          </TooltipContent>
        </Tooltip>
      </SampleRow>
    </Sample>
  )
}
