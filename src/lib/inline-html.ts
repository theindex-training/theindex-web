import sanitizeHtml from 'sanitize-html';

/**
 * Inline HTML of article text (paragraphs, headings, list items, quotes, captions), cleaned again
 * before it is rendered (docs/decision-record.md, section 7). The API already sanitizes it when an
 * admin saves; this is the second line, so a bug or a hand-edited row there can't put a script on
 * a public page.
 *
 * Same allowlist as theindex-api's `sanitizeInline` (`src/articles/article-content.ts`): `<b>`,
 * `<i>`, `<a href>` with http, https or mailto links, and `<br>`. Anything else is dropped, and
 * so is the content of script, style and similar tags.
 */
const INLINE_HTML: sanitizeHtml.IOptions = {
  allowedTags: ['b', 'i', 'a', 'br'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: { strong: 'b', em: 'i' },
};

export function sanitizeInline(html: string | null | undefined): string {
  return sanitizeHtml(html ?? '', INLINE_HTML).trim();
}

/** True when the HTML shows no text (empty, spaces, or only line breaks). */
export function isBlankInline(html: string): boolean {
  return (
    html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/g, ' ')
      .trim() === ''
  );
}
