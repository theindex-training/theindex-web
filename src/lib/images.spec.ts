import { describe, expect, it } from 'vitest';
import { fallbackSrc, largestUrl, srcsetOf } from './images';
import type { PublicMedia } from './public-api';

const M = 'https://media.example.test/abc';

function image(width: number, variantWidths: number[]): PublicMedia {
  return {
    url: `${M}/master.jpg`,
    width,
    height: Math.round(width / 2),
    altText: 'Alt',
    variants: variantWidths.map((w) => ({
      url: `${M}/${w}.webp`,
      width: w,
      height: Math.round(w / 2),
    })),
    ogImage: { url: `${M}/og.jpg`, width: 1200, height: 630 },
  };
}

describe('srcsetOf', () => {
  it('lists every variant with its width', () => {
    expect(srcsetOf(image(3000, [480, 960, 1600, 2400]))).toBe(
      `${M}/480.webp 480w, ${M}/960.webp 960w, ${M}/1600.webp 1600w, ${M}/2400.webp 2400w`,
    );
  });

  it('is empty without variants', () => {
    expect(srcsetOf(image(300, []))).toBe('');
  });
});

describe('fallbackSrc', () => {
  it('takes the widest variant up to 1600 px, not the master', () => {
    expect(fallbackSrc(image(3000, [480, 960, 1600, 2400]))).toBe(
      `${M}/1600.webp`,
    );
    expect(fallbackSrc(image(1000, [480, 960]))).toBe(`${M}/960.webp`);
  });

  it('takes the narrowest variant when all are wider than the limit', () => {
    expect(fallbackSrc(image(3000, [2400]))).toBe(`${M}/2400.webp`);
  });

  it('falls back to the master without variants', () => {
    expect(fallbackSrc(image(300, []))).toBe(`${M}/master.jpg`);
  });
});

describe('largestUrl', () => {
  it('is the master when it is wider than every variant', () => {
    expect(largestUrl(image(3000, [480, 2400]))).toBe(`${M}/master.jpg`);
  });

  it('keeps the master when a variant is only as wide', () => {
    // A small image gets one variant at its own width; the master is the original file.
    expect(largestUrl(image(400, [400]))).toBe(`${M}/master.jpg`);
  });

  it('is the widest variant when that is wider than the master', () => {
    expect(largestUrl(image(400, [480]))).toBe(`${M}/480.webp`);
  });
});
