import sanitizeHtml from 'sanitize-html';

/**
 * Inline HTML of article text (paragraphs, headings, list items, quotes, captions), cleaned again
 * before it is rendered (docs/decision-record.md, section 7). The API already sanitizes it when an
 * admin saves; this is the second line, so a bug or a hand-edited row there can't put a script on
 * a public page.
 *
 * The allowlist is theindex-api's `sanitizeInline` (`src/articles/article-content.ts`): bold,
 * italic, `<a href>` with http, https or mailto links, and `<br>`. Anything else is dropped, and
 * so is the content of script, style and similar tags.
 *
 * Bold and italic are stored as `<b>` and `<i>` (what Editor.js writes; the API turns `<strong>`
 * and `<em>` into them), but readers get `<strong>` and `<em>`: in an article, bold marks what is
 * important and italic what is stressed, which is what those elements mean.
 */
const INLINE_HTML: sanitizeHtml.IOptions = {
  allowedTags: ['strong', 'em', 'a', 'br'],
  allowedAttributes: { a: ['href'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  transformTags: { b: 'strong', i: 'em' },
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
