"use client";
import * as React from "react";
import * as DM from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ children, align = "end", className }: { children: React.ReactNode; align?: "start" | "end" | "center"; className?: string }) {
  return (
    <DM.Portal>
      <DM.Content align={align} sideOffset={6} className={cn("z-50 min-w-44 rounded-lg border border-border bg-white p-1 shadow-pop", className)}>
        {children}
      </DM.Content>
    </DM.Portal>
  );
}

export function DropdownMenuItem({ children, onSelect, destructive, disabled, asChild }: {
  children: React.ReactNode; onSelect?: () => void; destructive?: boolean; disabled?: boolean; asChild?: boolean;
}) {
  return (
    <DM.Item
      asChild={asChild}
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 [&_svg]:size-4",
        destructive ? "text-red-600 data-[highlighted]:bg-red-50" : "text-navy-800 data-[highlighted]:bg-surface",
      )}
    >
      {children}
    </DM.Item>
  );
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />;
}
export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <DM.Label className="px-2.5 py-1.5 text-xs font-medium text-muted">{children}</DM.Label>;
}
