"use client";

import { Menu } from "@base-ui/react/menu";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: Menu.Trigger.Props) {
  return <Menu.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  ...props
}: Menu.Popup.Props & { sideOffset?: number; align?: Menu.Positioner.Props["align"] }) {
  return (
    <Menu.Portal>
      <Menu.Positioner sideOffset={sideOffset} align={align} className="z-50 outline-none">
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-36 origin-[var(--transform-origin)] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md transition-[opacity,transform] outline-none",
            "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuRadioGroup(props: Menu.RadioGroup.Props) {
  return <Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: Menu.RadioItem.Props) {
  return (
    <Menu.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <Menu.RadioItemIndicator>
          <CheckIcon className="size-4" />
        </Menu.RadioItemIndicator>
      </span>
      {children}
    </Menu.RadioItem>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
