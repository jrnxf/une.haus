import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox";
import { cn } from "~/lib/utils";

export function MultiSelect<T extends string>({
  buttonLabel,
  onOptionCheckedChange,
  options,
  selections,
}: {
  buttonLabel: string;
  onOptionCheckedChange: (option: T, checked: boolean) => void;
  options: readonly T[];
  selections: T[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <ResponsiveCombobox
      open={open}
      onOpenChange={setOpen}
      title={buttonLabel}
      trigger={
        <Button
          className="w-full justify-between"
          role="combobox"
          size="lg"
          variant="outline"
        >
          {buttonLabel}
          <div className="flex items-center gap-2">
            {selections.length > 0 && (
              <Badge variant="secondary">
                {selections.length}/{options.length}
              </Badge>
            )}
            <ChevronsUpDown className="size-4 opacity-50" />
          </div>
        </Button>
      }
    >
      <Command>
        <CommandInput placeholder="Filter..." />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup>
            {options.map((option) => {
              const isChecked = selections.includes(option);
              return (
                <CommandItem
                  key={option}
                  onSelect={() => {
                    onOptionCheckedChange(option, !isChecked);
                  }}
                  value={option}
                >
                  {option}
                  <Check
                    className={cn(
                      "ml-auto",
                      isChecked ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </ResponsiveCombobox>
    // <DropdownMenu>
    //   <DropdownMenuTrigger asChild>
    //     <Button size="lg" variant="outline">
    //       {buttonLabel}

    //       {selections.length > 0 && (
    //         <Badge variant="secondary">
    //           {selections.length}/{options.length}
    //         </Badge>
    //       )}
    //     </Button>
    //   </DropdownMenuTrigger>
    //   <DropdownMenuContent className="w-56">
    //     {options.map((option) => (
    //       <DropdownMenuCheckboxItem
    //         checked={selections.includes(option)}
    //         key={option}
    //         onCheckedChange={(checked) => {
    //           onOptionCheckedChange(option, checked);
    //         }}
    //         onSelect={(evt) => evt.preventDefault()}
    //       >
    //         {option}
    //       </DropdownMenuCheckboxItem>
    //     ))}
    //   </DropdownMenuContent>
    // </DropdownMenu>
  );
}
