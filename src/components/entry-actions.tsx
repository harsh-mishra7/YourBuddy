"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  CalendarOff,
  CalendarPlus,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteEntry, toggleEntryDate } from "@/app/actions/entries";

const menuClass =
  "z-50 min-w-52 rounded-lg border border-border bg-card p-1 shadow-lg";
const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-muted";

export function EntryActions({
  entryId,
  isDated,
  onDeleted,
}: {
  entryId: string;
  isDated: boolean;
  /** Where to go after deleting — list pages just refresh. */
  onDeleted?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggleDate() {
    startTransition(async () => {
      const result = await toggleEntryDate(entryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        isDated
          ? "Moved to the undated shelf"
          : "Dated again — back on the timeline",
      );
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this entry? This can't be undone.")) return;
    startTransition(async () => {
      const result = await deleteEntry(entryId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Entry deleted");
      if (onDeleted) router.push(onDeleted);
      else router.refresh();
    });
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Entry actions"
        disabled={pending}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MoreHorizontal className="size-4" />
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className={menuClass}>
          <DropdownMenu.Item className={itemClass} onSelect={handleToggleDate}>
            {isDated ? (
              <>
                <CalendarOff className="size-4" />
                Remove date
              </>
            ) : (
              <>
                <CalendarPlus className="size-4" />
                Put it back on a date
              </>
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className={`${itemClass} text-danger data-[highlighted]:bg-danger/10`}
            onSelect={handleDelete}
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
