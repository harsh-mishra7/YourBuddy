"use client";

import * as React from "react";
import { Bold, Italic, Underline } from "lucide-react";
import { cn } from "@/lib/utils";
import { richTextToPlain, sanitizeRichText } from "@/lib/rich-text";

/**
 * A writing surface with three marks: bold, italic, underline.
 *
 * Deliberately not a controlled input. Writing `innerHTML` back on every
 * keystroke would drop the caret to the end of the text mid-sentence, so the
 * DOM owns the content while you type and `value` only reaches it again when
 * it changes from the outside — a save that clears the composer, or another
 * entry loaded into the editor.
 *
 * `document.execCommand` is deprecated and has no replacement; it is still the
 * only way to toggle a mark across an arbitrary selection without shipping an
 * editor framework. Everything it produces goes through `sanitizeRichText`
 * before it becomes state, so the browser's markup quirks never leave here.
 */

type Command = "bold" | "italic" | "underline";

const MARKS: { command: Command; icon: typeof Bold; label: string; key: string }[] =
  [
    { command: "bold", icon: Bold, label: "Bold", key: "B" },
    { command: "italic", icon: Italic, label: "Italic", key: "I" },
    { command: "underline", icon: Underline, label: "Underline", key: "U" },
  ];

export interface RichTextEditorProps {
  /** The stored subset — see `src/lib/rich-text.ts`. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Hidden until the composer expands; the marks still work by shortcut. */
  showToolbar?: boolean;
  className?: string;
  ariaLabel?: string;
  onFocus?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  showToolbar = true,
  className,
  ariaLabel,
  onFocus,
  onKeyDown,
}: RichTextEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  /** What we last handed to `onChange`, so our own edits don't re-enter. */
  const emitted = React.useRef(value);
  /**
   * Captured once. React only rewrites `dangerouslySetInnerHTML` when the
   * string it was given changes, so holding the first one still means it never
   * reaches in and replaces what is being typed.
   */
  const [initialHtml] = React.useState(value);

  const [active, setActive] = React.useState<Record<Command, boolean>>({
    bold: false,
    italic: false,
    underline: false,
  });

  const empty = richTextToPlain(value).trim() === "";

  const emit = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const html = sanitizeRichText(el.innerHTML);
    emitted.current = html;
    onChange(html);
  }, [onChange]);

  const syncActive = React.useCallback(() => {
    const el = ref.current;
    if (!el || !el.contains(document.activeElement)) return;
    setActive({
      bold: queryState("bold"),
      italic: queryState("italic"),
      underline: queryState("underline"),
    });
  }, []);

  // The DOM is the source of truth while you type; this only catches value
  // changes that came from somewhere else.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || value === emitted.current) return;
    el.innerHTML = value;
    emitted.current = value;
  }, [value]);

  // A selection can move by mouse, keyboard or touch — one listener covers all
  // three, and it only asks the document while this editor holds the caret.
  React.useEffect(() => {
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, [syncActive]);

  function apply(command: Command) {
    const el = ref.current;
    if (!el || disabled) return;
    el.focus();
    try {
      // Ask for <b>/<i>/<u> rather than inline styles, which sanitizing drops.
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      // Not every engine has it; the mark below is what actually matters.
    }
    try {
      document.execCommand(command);
    } catch {
      return;
    }
    emit();
    syncActive();
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? placeholder}
        data-placeholder={placeholder}
        data-empty={empty || undefined}
        spellCheck
        onInput={emit}
        onBlur={emit}
        onFocus={() => {
          onFocus?.();
          syncActive();
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && !event.altKey) {
            const mark = MARKS.find(
              (m) => m.key.toLowerCase() === event.key.toLowerCase(),
            );
            if (mark) {
              event.preventDefault();
              apply(mark.command);
              return;
            }
          }
          onKeyDown?.(event);
        }}
        onPaste={(event) => {
          // Paste keeps the three marks and drops everything else — colours,
          // fonts and tracking pixels from a web page are not your writing.
          event.preventDefault();
          const html = sanitizeRichText(
            event.clipboardData.getData("text/html"),
          );
          const text = event.clipboardData.getData("text/plain");
          if (html) {
            document.execCommand("insertHTML", false, html);
          } else if (text) {
            document.execCommand("insertText", false, text);
          }
          emit();
        }}
        className={cn(
          "rich-text w-full min-h-10 whitespace-pre-wrap break-words text-sm leading-relaxed",
          disabled && "opacity-50",
          className,
        )}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />

      {showToolbar ? (
        <div className="flex items-center gap-0.5">
          {MARKS.map(({ command, icon: Icon, label, key }) => (
            <button
              key={command}
              type="button"
              // Keep the selection: focus must not leave the text to press this.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => apply(command)}
              disabled={disabled}
              aria-label={label}
              aria-pressed={active[command]}
              title={`${label} (⌘/Ctrl+${key})`}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
                active[command] && "bg-muted text-foreground",
              )}
            >
              <Icon className="size-3.5" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function queryState(command: Command): boolean {
  try {
    return document.queryCommandState(command);
  } catch {
    return false;
  }
}
