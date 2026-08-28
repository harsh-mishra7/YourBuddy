import { describe, expect, it } from "vitest";

import {
  hasFormatting,
  plainToRichText,
  richExcerpt,
  richTextToPlain,
  sanitizeRichText,
} from "@/lib/rich-text";

/**
 * `sanitizeRichText` output is injected with `dangerouslySetInnerHTML`, so this
 * file is testing a security boundary. The module claims there is "no path
 * through it that emits an attribute, a URL, or a tag that wasn't put there
 * deliberately" — these tests are that claim, written down.
 */
describe("sanitizeRichText", () => {
  describe("keeps the three marks", () => {
    it("passes through the canonical spellings", () => {
      expect(sanitizeRichText("<strong>a</strong>")).toBe("<strong>a</strong>");
      expect(sanitizeRichText("<em>a</em>")).toBe("<em>a</em>");
      expect(sanitizeRichText("<u>a</u>")).toBe("<u>a</u>");
    });

    it("normalises editor aliases to one spelling", () => {
      expect(sanitizeRichText("<b>a</b>")).toBe("<strong>a</strong>");
      expect(sanitizeRichText("<i>a</i>")).toBe("<em>a</em>");
      expect(sanitizeRichText("<ins>a</ins>")).toBe("<u>a</u>");
    });

    it("keeps nesting", () => {
      expect(sanitizeRichText("<strong><em>a</em></strong>")).toBe(
        "<strong><em>a</em></strong>",
      );
    });
  });

  describe("drops everything else", () => {
    it("removes a script tag and its contents", () => {
      expect(sanitizeRichText("<script>alert(1)</script>")).toBe("");
      expect(sanitizeRichText("a<script>alert(1)</script>b")).toBe("ab");
    });

    it("removes a style tag and its contents", () => {
      expect(sanitizeRichText("a<style>body{}</style>b")).toBe("ab");
    });

    it("removes an unterminated script tag", () => {
      expect(sanitizeRichText("a<script>alert(1)")).toBe("a");
    });

    it("removes comments", () => {
      expect(sanitizeRichText("<!-- sneaky -->a")).toBe("a");
    });

    it("removes an event-handler attribute but keeps the mark", () => {
      expect(sanitizeRichText('<strong onclick="evil()">a</strong>')).toBe(
        "<strong>a</strong>",
      );
    });

    it("removes an image payload entirely", () => {
      expect(sanitizeRichText('<img src=x onerror="alert(1)">')).toBe("");
    });

    it("removes an anchor but keeps its text, so no URL survives", () => {
      expect(sanitizeRichText('<a href="javascript:alert(1)">click</a>')).toBe(
        "click",
      );
    });

    it("removes an svg/onload payload", () => {
      expect(sanitizeRichText('<svg onload="alert(1)"></svg>')).toBe("");
    });
  });

  describe("escapes what is left", () => {
    it("escapes bare angle brackets and ampersands", () => {
      expect(sanitizeRichText("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
    });

    it("decodes entities once, then re-escapes, so text does not double-escape", () => {
      expect(sanitizeRichText("&amp;")).toBe("&amp;");
      expect(sanitizeRichText("&amp;amp;")).toBe("&amp;amp;");
    });

    it("does not let an encoded tag decode into a real one", () => {
      expect(sanitizeRichText("&lt;script&gt;alert(1)&lt;/script&gt;")).toBe(
        "&lt;script&gt;alert(1)&lt;/script&gt;",
      );
    });
  });

  describe("sentinel injection", () => {
    // Kept tags are parked as \0strong\0 mid-pipeline. If a user could get a
    // NUL into the string they could forge a mark, so both routes are closed.
    it("strips literal control characters from input", () => {
      expect(sanitizeRichText("a\u0000strong\u0000b")).toBe("astrongb");
    });

    it("refuses to decode a numeric entity into a control character", () => {
      expect(sanitizeRichText("a&#0;strong&#0;b")).toBe("astrongb");
      expect(sanitizeRichText("a&#x0;strong&#x0;b")).toBe("astrongb");
    });
  });

  describe("balancing", () => {
    it("closes a mark left open", () => {
      expect(sanitizeRichText("<strong>a")).toBe("<strong>a</strong>");
    });

    it("drops a close with no matching open", () => {
      expect(sanitizeRichText("a</strong>")).toBe("a");
    });

    it("repairs crossed nesting", () => {
      expect(sanitizeRichText("<strong><em>a</strong></em>")).toBe(
        "<strong><em>a</em></strong>",
      );
    });

    it("removes marks that ended up empty", () => {
      expect(sanitizeRichText("<strong></strong>")).toBe("");
      expect(sanitizeRichText("a<em></em>b")).toBe("ab");
    });
  });

  describe("line structure", () => {
    it("turns a break into the stored spelling", () => {
      expect(sanitizeRichText("a<br>b")).toBe("a<br />b");
    });

    it("treats two sibling divs as two lines, not three", () => {
      expect(sanitizeRichText("<div>a</div><div>b</div>")).toBe("a<br />b");
    });

    it("drops the filler break a browser parks in an empty line", () => {
      expect(sanitizeRichText("<div>a<br></div>")).toBe("a");
    });

    it("trims leading and trailing blank lines", () => {
      expect(sanitizeRichText("<br><br>a<br><br>")).toBe("a");
    });
  });

  it("is idempotent — re-saving an entry does not change it", () => {
    const inputs = [
      "<strong>a</strong> &amp; <em>b</em>",
      "<div>a</div><div><b>b</b></div>",
      "a < b",
      '<a href="javascript:alert(1)">x</a>',
    ];
    for (const input of inputs) {
      const once = sanitizeRichText(input);
      expect(sanitizeRichText(once)).toBe(once);
    }
  });

  it("never emits a tag outside the allowlist", () => {
    const hostile = [
      '<iframe src="evil"></iframe>',
      '<object data="evil"></object>',
      "<form><input name=x></form>",
      '<base href="//evil">',
      "<sTrOnG>a</sTrOnG>",
    ].join("");
    const out = sanitizeRichText(hostile);
    const tags = [...out.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/g)].map((m) =>
      m[1].toLowerCase(),
    );
    expect(new Set(tags).size).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(["strong", "em", "u", "br"]).toContain(tag);
    }
  });

  it("returns empty for empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });
});

describe("hasFormatting", () => {
  it("is true only when a mark is present", () => {
    expect(hasFormatting("<strong>a</strong>")).toBe(true);
    expect(hasFormatting("<em>a</em>")).toBe(true);
    expect(hasFormatting("<u>a</u>")).toBe(true);
    expect(hasFormatting("plain")).toBe(false);
    // A break alone is line structure, not formatting — storing a rich copy
    // for it would cost every multi-line entry an extra column for nothing.
    expect(hasFormatting("a<br />b")).toBe(false);
  });
});

describe("richTextToPlain", () => {
  it("strips marks and turns breaks into newlines", () => {
    expect(richTextToPlain("<strong>a</strong><br />b")).toBe("a\nb");
  });

  it("decodes entities so the plain copy is searchable", () => {
    expect(richTextToPlain("a &amp; b")).toBe("a & b");
    expect(richTextToPlain("&lt;script&gt;")).toBe("<script>");
  });

  it("returns empty for empty input", () => {
    expect(richTextToPlain("")).toBe("");
  });
});

describe("plainToRichText", () => {
  it("escapes text and converts newlines", () => {
    expect(plainToRichText("a<b")).toBe("a&lt;b");
    expect(plainToRichText("a\nb")).toBe("a<br />b");
    expect(plainToRichText("a\r\nb")).toBe("a<br />b");
  });

  it("round-trips back to the same plain text", () => {
    const plain = "a & b < c";
    expect(richTextToPlain(plainToRichText(plain))).toBe(plain);
  });
});

describe("richExcerpt", () => {
  it("passes short content through untouched", () => {
    expect(richExcerpt("<strong>short</strong>")).toBe("<strong>short</strong>");
  });

  it("closes marks that were still open at the cut", () => {
    const out = richExcerpt(`<strong>${"a".repeat(200)}</strong>`, 10);
    expect(out).toBe(`<strong>${"a".repeat(10)}</strong>…`);
  });

  it("spends the budget on text, not markup", () => {
    // 30 characters of text wrapped in marks: the marks must not count against
    // the budget, or a heavily formatted entry would preview as a few words.
    const html = `<strong><em>${"b".repeat(30)}</em></strong>`;
    const out = richExcerpt(html, 30);
    expect(richTextToPlain(out).replace("…", "")).toHaveLength(30);
  });

  it("flattens breaks to spaces for a card preview", () => {
    expect(richExcerpt("a<br />b")).toBe("a b");
  });

  it("returns empty for empty or whitespace-only input", () => {
    expect(richExcerpt("")).toBe("");
    expect(richExcerpt("<strong>   </strong>")).toBe("");
  });
});
