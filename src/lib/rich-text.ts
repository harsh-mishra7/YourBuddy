/**
 * Bold, italic, underline — and nothing else.
 *
 * An entry keeps two copies of what you wrote:
 *
 *   `body`     plain text, always. Search, previews for unformatted entries,
 *              voice transcripts and anything added later all read this, so
 *              formatting can never make a sentence unfindable (§4).
 *   `bodyRich` the same sentence with its marks, as a tiny HTML subset — and
 *              NULL whenever nothing is actually formatted, so the common
 *              entry costs nothing extra.
 *
 * The rich copy is injected with `dangerouslySetInnerHTML`, so this file is a
 * security boundary: `sanitizeRichText` is the only thing standing between a
 * posted string and the page. It works by allowlist, not by blocklist — every
 * tag is dropped except the three marks, and every remaining character is
 * escaped afterwards. There is no path through it that emits an attribute, a
 * URL, or a tag that wasn't put there deliberately below.
 */

export type RichTag = "strong" | "em" | "u";

/** Editors emit `<b>`/`<i>`; both mean the same mark. Store one spelling. */
const TAG_ALIASES: Record<string, RichTag> = {
  b: "strong",
  strong: "strong",
  i: "em",
  em: "em",
  u: "u",
  ins: "u",
};

/**
 * Kept tags are parked as `\0strong\0` while the text around them is escaped,
 * then turned back into real tags at the very end. Control characters are
 * stripped from the input first and entity decoding refuses to produce one, so
 * nothing a user can type ever reaches this file as a sentinel.
 */
const S = "\u0000";
const TOKEN = /\u0000(\/?)(strong|em|u)\u0000/g;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** A block start, which may or may not begin a line — see `foldBlockStarts`. */
const SOFT = "\u0001";

const COMMENT = /<!--[\s\S]*?-->/g;
const SCRIPTISH = /<(script|style)\b[\s\S]*?(?:<\/\1\s*>|$)/gi;
const BREAK = /<br\s*\/?>/gi;

const BLOCKS =
  "div|p|li|ul|ol|h[1-6]|blockquote|section|article|figure|tr|table|pre";
const BLOCK_END = new RegExp(`</(?:${BLOCKS})\\s*>`, "gi");
const BLOCK_START = new RegExp(
  `<(?:${BLOCKS})\\b(?:"[^"]*"|'[^']*'|[^>])*>`,
  "gi",
);
/**
 * The `<br>` a browser parks inside an otherwise empty line so the line can be
 * clicked into. It is scaffolding, not a break the writer asked for.
 */
const FILLER_BREAK = new RegExp(`<br\\s*/?>\\s*(?=</(?:${BLOCKS})\\s*>)`, "gi");
/** Any tag, with attributes that may legally contain `>` inside quotes. */
const ANY_TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:"[^"]*"|'[^']*'|[^>])*>/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Entities are decoded before the text is re-escaped, so a body that has been
 * through the editor twenty times still reads `&`, not `&amp;amp;…`.
 *
 * Numeric escapes that would produce a control character resolve to nothing:
 * `&#0;` must not become a sentinel.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_m, digits: string) => fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) =>
      fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    // Last, always: decoding it earlier would let `&amp;lt;` become a `<`.
    .replace(/&amp;/gi, "&");
}

function fromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code > 0x10ffff) return "";
  if (code < 0x20 && code !== 0x09 && code !== 0x0a) return "";
  return String.fromCodePoint(code);
}

/**
 * Where a block begins, decide whether that is a new line.
 *
 * `</div>` always ends one. `<div>` only starts one when a line isn't already
 * open — otherwise `<div>a</div><div>b</div>`, which is how a browser stores
 * two ordinary lines, would come back with a blank line between them.
 */
function foldBlockStarts(text: string): string {
  const parts = text.split(SOFT);
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    if (out !== "" && !out.endsWith("\n")) out += "\n";
    out += parts[i];
  }
  return out;
}

/**
 * Close what was opened, in the right order.
 *
 * Browsers hand back balanced markup, but a hand-rolled POST does not have to,
 * and an unclosed `<strong>` would bold the rest of the card it lands in.
 */
function balance(text: string): string {
  const open: RichTag[] = [];
  const token = (tag: RichTag, closing: boolean) =>
    `${S}${closing ? "/" : ""}${tag}${S}`;

  let out = "";
  let cursor = 0;
  let match: RegExpExecArray | null;
  TOKEN.lastIndex = 0;

  while ((match = TOKEN.exec(text)) !== null) {
    out += text.slice(cursor, match.index);
    cursor = TOKEN.lastIndex;

    const closing = match[1] === "/";
    const tag = match[2] as RichTag;

    if (!closing) {
      open.push(tag);
      out += token(tag, false);
      continue;
    }

    const at = open.lastIndexOf(tag);
    if (at === -1) continue; // A close with no open: drop it.

    // Close down to it, then reopen whatever it was nested inside of.
    const inner = open.slice(at + 1);
    for (let i = open.length - 1; i >= at; i--) out += token(open[i], true);
    open.length = at;
    for (const nested of inner) {
      open.push(nested);
      out += token(nested, false);
    }
  }

  out += text.slice(cursor);
  for (let i = open.length - 1; i >= 0; i--) out += token(open[i], true);
  return out;
}

/**
 * Anything → the stored subset: text, `<strong>`, `<em>`, `<u>`, `<br />`.
 *
 * Runs on the server for every save. The client runs it too, so that what is
 * held in React state is already the canonical form — but that is a
 * convenience, and this is the copy that decides what reaches the database.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return "";

  let text = input.replace(CONTROL, "");
  text = text.replace(COMMENT, "").replace(SCRIPTISH, "");

  // Line structure first, while the tags that carry it still exist.
  text = text
    .replace(FILLER_BREAK, "")
    .replace(BREAK, "\n")
    .replace(BLOCK_END, "\n")
    .replace(BLOCK_START, SOFT);
  text = foldBlockStarts(text);

  text = text.replace(ANY_TAG, (_m, slash: string, name: string) => {
    const tag = TAG_ALIASES[name.toLowerCase()];
    return tag ? `${S}${slash}${tag}${S}` : "";
  });

  text = balance(decodeEntities(text));

  // Sentinels carry no `&`, `<` or `>`, so escaping the whole string escapes
  // exactly the text and leaves the marks intact.
  text = escapeHtml(text)
    .replace(/^\n+/, "")
    .replace(/\n+$/, "")
    .replace(/\n/g, "<br />")
    .replace(TOKEN, (_m, slash: string, tag: string) => `<${slash}${tag}>`);

  // "Turn bold on, change your mind, turn it off" leaves empty marks behind.
  let previous: string;
  do {
    previous = text;
    text = text.replace(/<(strong|em|u)><\/\1>/g, "");
  } while (text !== previous);

  return text;
}

/** True once anything is actually marked — decides whether to store a rich copy. */
export function hasFormatting(html: string): boolean {
  return /<(?:strong|em|u)>/.test(html);
}

/** The rich copy → the plain one that gets searched. */
export function richTextToPlain(html: string): string {
  if (!html) return "";
  return decodeEntities(
    html.replace(BREAK, "\n").replace(BLOCK_END, "\n").replace(ANY_TAG, ""),
  );
}

/** Plain text → the subset, for entries written before formatting existed. */
export function plainToRichText(text: string): string {
  if (!text) return "";
  return escapeHtml(text).replace(/\r\n?|\n/g, "<br />");
}

/**
 * A preview that keeps its marks.
 *
 * Cutting HTML at a character count is the part that goes wrong: stop inside
 * a tag and the card ships a broken element, so the budget is spent on *text*
 * and whatever is still open at the cut is closed explicitly.
 */
export function richExcerpt(html: string, max = 180): string {
  if (!html) return "";

  // The card is a three-line preview, so breaks flatten to spaces exactly as
  // `excerpt()` flattens them for plain bodies.
  const flat = html.replace(BREAK, " ");
  const plain = richTextToPlain(flat).replace(/\s+/g, " ").trim();
  if (!plain) return "";
  // Nothing to cut, and the marks are already balanced: ship it as it is.
  if (plain.length <= max) return flat.trim();

  const marks = /<(\/?)(strong|em|u)>/g;
  const open: RichTag[] = [];
  let out = "";
  let used = 0;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const take = (chunk: string) => {
    const text = decodeEntities(chunk).replace(/\s+/g, " ");
    const room = max - used;
    if (room <= 0) return "";
    const kept = text.length <= room ? text : text.slice(0, room).trimEnd();
    used += kept.length;
    return escapeHtml(kept);
  };

  while ((match = marks.exec(flat)) !== null) {
    out += take(flat.slice(cursor, match.index));
    cursor = marks.lastIndex;
    if (used >= max) break;

    const tag = match[2] as RichTag;
    if (match[1] === "/") {
      const at = open.lastIndexOf(tag);
      if (at !== -1) open.splice(at, 1);
    } else {
      open.push(tag);
    }
    out += match[0];
  }

  if (used < max) out += take(flat.slice(cursor));
  for (let i = open.length - 1; i >= 0; i--) out += `</${open[i]}>`;

  return (used < plain.length ? `${out.trimEnd()}…` : out).trim();
}
