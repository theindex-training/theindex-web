import { describe, expect, it } from 'vitest';
import { isBlankInline, sanitizeInline } from './inline-html';

describe('sanitizeInline', () => {
  it('keeps bold, italic, links and line breaks as the API stores them', () => {
    const html =
      'Текст с <b>удебеляване</b>, <i>курсив</i>,<br /><a href="https://example.com/a?b=1&amp;c=2">връзка</a> и <a href="mailto:info@example.com">поща</a>.';
    expect(sanitizeInline(html)).toBe(html);
  });

  it('turns strong and em into b and i, as the API does', () => {
    expect(sanitizeInline('<strong>a</strong> <em>b</em>')).toBe(
      '<b>a</b> <i>b</i>',
    );
  });

  it('drops scripts with their content and other tags without theirs', () => {
    expect(
      sanitizeInline(
        'a<script>alert(1)</script><style>p{}</style> <img src="x" onerror="alert(1)"><span>b</span>',
      ),
    ).toBe('a b');
  });

  it('drops every attribute but href, and links that are not http, https or mailto', () => {
    expect(
      sanitizeInline(
        '<b onclick="x()" class="c">a</b> <a href="javascript:alert(1)">b</a> <a href="//evil.example">c</a> <a href="https://ok.example" target="_blank" onmouseover="x()">d</a>',
      ),
    ).toBe('<b>a</b> <a>b</a> <a>c</a> <a href="https://ok.example">d</a>');
  });

  it('escapes text that only looks like markup and closes open tags', () => {
    expect(sanitizeInline('1 < 2 & <b>3')).toBe('1 &lt; 2 &amp; <b>3</b>');
  });

  it('treats a missing text as empty', () => {
    expect(sanitizeInline(undefined)).toBe('');
    expect(sanitizeInline(null)).toBe('');
  });
});

describe('isBlankInline', () => {
  it('is true for text that shows nothing', () => {
    expect(isBlankInline('')).toBe(true);
    expect(isBlankInline('  <br> <br/>&nbsp;')).toBe(true);
  });

  it('is false for any text, even inside a tag', () => {
    expect(isBlankInline('<b>a</b>')).toBe(false);
    expect(isBlankInline('.')).toBe(false);
  });
});
