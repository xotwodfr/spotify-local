/**
 * Apple Music-style TTML lyrics parser.
 *
 * TTML is the timed-text format behind Apple Music / AMLL word-synced lyrics.
 * Each `<p>` is a lyric line with begin/end; word timing lives on nested
 * `<span begin=".." end="..">` elements, with `ttm:role="x-translation"`,
 * `ttm:role="x-roman"` (romanization) and `ttm:role="x-bg"` (background
 * vocals) markers.
 *
 * Both second-decimal (`begin="9.731"`) and clock (`begin="00:00.000"`) time
 * bases are accepted so AMLL and Better Lyrics responses parse identically.
 */

import type { LyricLine, LyricWord } from "./model";

interface Attrs {
  [name: string]: string;
}

interface SpanElement {
  attrs: Attrs;
  inner: string;
  /** Index of the opening `<span`. */
  open: number;
  /** Index just past the closing tag. */
  end: number;
}

const attrPattern = /([\w.-]+(?::[\w.-]+)?)\s*=\s*"([^"]*)"/g;

function parseAttrs(raw: string): Attrs {
  const attrs: Attrs = {};
  if (!raw.trim()) return attrs;
  let match: RegExpExecArray | null;
  while ((match = attrPattern.exec(raw)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function attr(attrs: Attrs, name: string): string | null {
  const qualified = attrs[name];
  if (qualified !== undefined) return qualified;
  const bare = attrs[name.split(":").pop() ?? ""];
  return bare !== undefined ? bare : null;
}

/** Parse a TTML time value: decimal seconds or clock (mm:ss.fff / hh:mm:ss.fff). */
export function parseTtmlTime(value: string | null | undefined): number {
  const trimmed = value?.trim();
  if (!trimmed) return 0;
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] ?? 0;
}

function extractText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Join word text back into a line. Whitespace goes between real words
 * (including after trailing punctuation like commas), while CJK segments and
 * merged syllable tokens read without spaces.
 */
function joinWords(words: LyricWord[]): string {
  let text = "";
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i].text;
    const previous = i > 0 ? words[i - 1].text : "";
    const prevLast = previous[previous.length - 1];
    const nextFirst = word[0];
    const needsSpace =
      previous &&
      /[A-Za-z0-9,.;:!?…'")\]}%…-]/.test(prevLast) &&
      /[A-Za-z0-9("'[\-]/.test(nextFirst);
    text += needsSpace ? ` ${word}` : word;
  }
  return text.trim();
}

/**
 * Find the next balanced `<span ...>...</span>` at or after `from`.
 * Nested spans (e.g. `x-bg` wrappers around word spans) are handled.
 */
function findSpan(content: string, from: number): SpanElement | null {
  let i = from;
  while (i < content.length) {
    const openStart = content.indexOf("<span", i);
    if (openStart === -1) return null;
    const tagEnd = content.indexOf(">", openStart);
    if (tagEnd === -1) return null;
    const openTag = content.slice(openStart, tagEnd + 1);
    if (/\s\/>$/.test(openTag)) {
      i = tagEnd + 1;
      continue;
    }
    const attrs = parseAttrs(openTag.slice("<span".length, -1));

    let depth = 1;
    let j = tagEnd + 1;
    while (j < content.length && depth > 0) {
      const nextOpen = content.indexOf("<span", j);
      const nextClose = content.indexOf("</span>", j);
      if (nextClose === -1) return null;
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth += 1;
        const closeBracket = content.indexOf(">", nextOpen);
        j = closeBracket === -1 ? content.length : closeBracket + 1;
      } else {
        depth -= 1;
        if (depth === 0) {
          return { attrs, inner: content.slice(tagEnd + 1, nextClose), open: openStart, end: nextClose + "</span>".length };
        }
        j = nextClose + "</span>".length;
      }
    }
    return null;
  }
  return null;
}

interface CollectedLine {
  words: LyricWord[];
  background: boolean;
  translation?: string;
  romanization?: string;
}

/**
 * A `word` in Apple's TTML is any individually-timed `<span>`. Whole words
 * arrive as single spans, but multi-syllable words are sometimes split across
 * adjacent spans with no whitespace between them (`e` + `nough`). Those merge
 * back into one word (start from the first syllable, end from the last) so the
 * display text reads correctly while keeping the genuine source timing.
 */

/** Append a token, merging it into the previous word when not space-separated. */
function appendToken(words: LyricWord[], token: string, start: number, end: number, separated: boolean): void {
  const text = token.trim();
  if (!text) return;
  const previous = words[words.length - 1];
  const mergeable = !separated && previous && /[A-Za-z0-9]$/.test(previous.text);
  if (mergeable) {
    previous.text += text;
    previous.end = Math.max(previous.end, end);
  } else {
    words.push({ text, start, end });
  }
}

/** Collect word spans from a `<p>` body in document order. */
function collectLine(inner: string): CollectedLine {
  const words: LyricWord[] = [];
  const out: CollectedLine = { words, background: false };

  let cursor = 0;
  while (cursor < inner.length) {
    const span = findSpan(inner, cursor);
    if (!span) break;

    const role = attr(span.attrs, "ttm:role") ?? attr(span.attrs, "role") ?? "";
    const beginRaw = attr(span.attrs, "begin");
    const endRaw = attr(span.attrs, "end");
    const begin = beginRaw !== null ? parseTtmlTime(beginRaw) : null;
    const end = endRaw !== null ? parseTtmlTime(endRaw) : null;
    const separated = /\s/.test(inner.slice(cursor, span.open));

    if (role === "x-translation") {
      const text = extractText(span.inner);
      if (text && !out.translation) out.translation = text;
    } else if (role === "x-roman") {
      const text = extractText(span.inner);
      if (text && !out.romanization) out.romanization = text;
    } else if (role === "x-bg") {
      out.background = true;
      let sub = 0;
      let first = true;
      while (sub < span.inner.length) {
        const subSpan = findSpan(span.inner, sub);
        if (!subSpan) break;
        const subBeginRaw = attr(subSpan.attrs, "begin");
        const subEndRaw = attr(subSpan.attrs, "end");
        const subBegin = subBeginRaw !== null ? parseTtmlTime(subBeginRaw) : null;
        const subText = extractText(subSpan.inner);
        if (subBegin !== null && subText) {
          const separated = first || /\s/.test(span.inner.slice(sub, subSpan.open));
          appendToken(words, subText, subBegin, subEndRaw !== null ? parseTtmlTime(subEndRaw) : subBegin + 0.5, separated);
          first = false;
        }
        sub = subSpan.end;
      }
    } else if (begin !== null) {
      const text = extractText(span.inner);
      if (text) {
        appendToken(words, text, begin, end !== null ? end : begin + 0.5, separated);
      }
    }

    cursor = span.end;
  }

  return out;
}

interface Paragraph {
  begin: number | null;
  end: number | null;
  inner: string;
  line: CollectedLine;
  /** Index just past the element's closing tag. */
  next: number;
}

/** Find the next `<p ...>...</p>` at or after `from`. */
function findP(content: string, from: number): Paragraph | null {
  const openStart = content.indexOf("<p", from);
  if (openStart === -1) return null;
  const tagEnd = content.indexOf(">", openStart);
  if (tagEnd === -1) return null;
  const openTag = content.slice(openStart, tagEnd + 1);
  const attrs = parseAttrs(openTag.slice("<p".length, -1));
  const closeStart = content.indexOf("</p>", tagEnd + 1);
  const inner = closeStart === -1 ? content.slice(tagEnd + 1) : content.slice(tagEnd + 1, closeStart);

  return {
    begin: attr(attrs, "begin") !== null ? parseTtmlTime(attr(attrs, "begin")) : null,
    end: attr(attrs, "end") !== null ? parseTtmlTime(attr(attrs, "end")) : null,
    inner,
    line: collectLine(inner),
    next: closeStart === -1 ? content.length : closeStart + "</p>".length,
  };
}

export interface TtmlParsed {
  lines: LyricLine[];
  plainText: string;
}

/** Parse an Apple Music-style TTML document into normalized lyric lines. */
export function parseTtml(value: string): TtmlParsed {
  const lines: LyricLine[] = [];

  let cursor = 0;
  while (cursor < value.length) {
    const p = findP(value, cursor);
    if (!p) break;

    const words = p.line.words;
    const fallbackText = extractText(p.inner);
    const text = words.length ? joinWords(words) : fallbackText;

    if (text) {
      lines.push({
        time: p.begin ?? 0,
        text,
        ...(p.end !== null ? { end: p.end } : {}),
        ...(words.length >= 1 ? { words } : {}),
        ...(p.line.background ? { background: true } : {}),
        ...(p.line.translation ? { translation: p.line.translation } : {}),
        ...(p.line.romanization ? { romanization: p.line.romanization } : {}),
      });
    }

    cursor = p.next;
  }

  const plainText = lines.map((line) => line.text).join("\n");

  return { lines, plainText };
}