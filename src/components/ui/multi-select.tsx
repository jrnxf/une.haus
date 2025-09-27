import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="w-full justify-between"
          role="combobox"
          size="lg"
          variant="outline"
        >
          {buttonLabel}
          {selections.length > 0 && (
            <Badge variant="secondary">
              {selections.length}/{options.length}
            </Badge>
          )}
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="Filter..." />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>
            <CommandGroup heading="foo">
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
      </PopoverContent>
    </Popover>
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
