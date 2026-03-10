import { LogOut, Mail, Settings, User } from "lucide-react"

import { Button } from "~/components/ui/base-button"
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
} from "~/components/ui/base-menu"
import { useModifierKey } from "~/hooks/use-modifier-key"

export default function MenuDemo() {
  const mod = useModifierKey()

  return (
    <Menu>
      <MenuTrigger render={<Button variant="outline">show menu</Button>} />
      <MenuContent sideOffset={4} className="w-64">
        {/* Account Section */}
        <MenuGroup>
          <MenuGroupLabel>my account</MenuGroupLabel>
          <MenuSeparator />
          <MenuItem>
            <User />
            <span>profile</span>
            <MenuShortcut>⇧{mod}P</MenuShortcut>
          </MenuItem>
          <MenuItem>
            <Mail />
            <span>inbox</span>
            <MenuShortcut>{mod}I</MenuShortcut>
          </MenuItem>
          <MenuItem>
            <Settings />
            <span>settings</span>
            <MenuShortcut>{mod}S</MenuShortcut>
          </MenuItem>
        </MenuGroup>

        {/* Logout */}
        <MenuSeparator />
        <MenuGroup>
          <MenuItem>
            <LogOut />
            <span>log out</span>
            <MenuShortcut>⇧{mod}Q</MenuShortcut>
          </MenuItem>
        </MenuGroup>
      </MenuContent>
    </Menu>
  )
}
