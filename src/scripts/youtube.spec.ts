// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  isYoutubeId,
  youtubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from '../lib/youtube';
import { PLAYER_ALLOW, initYoutubeVideos } from './youtube';

/** The markup YouTubeVideo.astro renders (with Astro's scoped-style attribute). */
function render(videoId: string, { caption = true } = {}) {
  document.body.innerHTML = `
    <figure class="video">
      <div class="video__frame" data-youtube="${videoId}" data-youtube-play="Пусни видеото" data-youtube-title="Видео от YouTube">
        <a class="video__play" href="${youtubeWatchUrl('dQw4w9WgXcQ')}" ${caption ? 'aria-describedby="block-3-caption"' : ''} data-youtube-link data-astro-cid-abc>
          <img class="video__thumb" src="${youtubeThumbnailUrl('dQw4w9WgXcQ')}" alt="">
          <span class="visually-hidden" data-youtube-label>Гледай видеото в YouTube</span>
        </a>
      </div>
      ${caption ? '<figcaption id="block-3-caption">Тренировка</figcaption>' : ''}
    </figure>`;
}

describe('initYoutubeVideos', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('turns the link to YouTube into a play button and loads nothing else', () => {
    render('dQw4w9WgXcQ');
    initYoutubeVideos(document, document);

    expect(document.querySelector('a')).toBeNull();
    const button = document.querySelector('button');
    expect(button?.type).toBe('button');
    expect(button?.className).toBe('video__play');
    expect(button?.textContent?.trim()).toBe('Пусни видеото');
    expect(button?.getAttribute('aria-describedby')).toBe('block-3-caption');
    expect(button?.hasAttribute('data-astro-cid-abc')).toBe(true);
    expect(button?.hasAttribute('href')).toBe(false);
    expect(button?.querySelector('img.video__thumb')).not.toBeNull();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('puts the youtube-nocookie player in place of the button on play, and focuses it', () => {
    render('dQw4w9WgXcQ');
    initYoutubeVideos(document, document);
    document.querySelector('button')?.click();

    expect(document.querySelector('button')).toBeNull();
    const player = document.querySelector('iframe');
    expect(player?.src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    );
    expect(player?.title).toBe('Видео от YouTube');
    expect(player?.getAttribute('allow')).toBe(PLAYER_ALLOW);
    expect(player?.hasAttribute('allowfullscreen')).toBe(true);
    expect(player?.getAttribute('referrerpolicy')).toBe(
      'strict-origin-when-cross-origin',
    );
    expect(document.activeElement).toBe(player);
  });

  it('leaves the plain link for an id that is not a YouTube video id', () => {
    render('javascript:alert(1)');
    initYoutubeVideos(document, document);

    expect(document.querySelector('button')).toBeNull();
    expect(document.querySelector('a')?.getAttribute('href')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
  });

  it('enhances each video once, even when called again', () => {
    render('dQw4w9WgXcQ', { caption: false });
    initYoutubeVideos(document, document);
    initYoutubeVideos(document, document);

    expect(document.querySelectorAll('button')).toHaveLength(1);
    expect(
      document.querySelector('button')?.hasAttribute('aria-describedby'),
    ).toBe(false);
  });
});

describe('YouTube URLs', () => {
  it('accepts only 11-character video ids', () => {
    expect(isYoutubeId('dQw4w9WgXcQ')).toBe(true);
    expect(isYoutubeId('aqz-KE-bpKQ')).toBe(true);
    expect(isYoutubeId('dQw4w9WgXc')).toBe(false);
    expect(isYoutubeId('dQw4w9WgXcQ"')).toBe(false);
    expect(isYoutubeId(undefined)).toBe(false);
  });

  it('builds the watch, thumbnail and player URLs from the id', () => {
    expect(youtubeWatchUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    expect(youtubeThumbnailUrl('dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    );
    expect(youtubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0',
    );
  });
});
