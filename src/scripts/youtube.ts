import { isYoutubeId, youtubeEmbedUrl } from '../lib/youtube';

/**
 * Click-to-play YouTube videos (docs/decision-record.md, D10), wired by YouTubeVideo.astro.
 *
 * The server renders each video as a link to youtube.com around its thumbnail, so it works
 * without JavaScript. This script turns the link into a play button; pressing it puts the player
 * (an iframe from youtube-nocookie.com) in its place and moves focus to it. Nothing from YouTube
 * but the thumbnail loads before that.
 *
 * Markup: `[data-youtube="<video id>"]` with `data-youtube-play` (the button's name) and
 * `data-youtube-title` (the player's title), holding `a[data-youtube-link]` and, inside it,
 * `[data-youtube-label]` (the link's text, replaced by the button's name).
 */
export const PLAYER_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

export function initYoutubeVideos(root: ParentNode, doc: Document): void {
  for (const frame of root.querySelectorAll<HTMLElement>('[data-youtube]')) {
    enhance(frame, doc);
  }
}

function enhance(frame: HTMLElement, doc: Document): void {
  const videoId = frame.dataset['youtube'];
  const link = frame.querySelector<HTMLAnchorElement>('a[data-youtube-link]');
  // Leave anything unexpected as the plain link (it still opens the video on YouTube).
  if (!isYoutubeId(videoId) || !link || frame.dataset['youtubeReady']) return;
  frame.dataset['youtubeReady'] = 'true';

  const button = doc.createElement('button');
  // The link's class, aria-describedby and Astro's scoped-style attribute carry over.
  for (const { name, value } of Array.from(link.attributes)) {
    if (name !== 'href' && name !== 'data-youtube-link') {
      button.setAttribute(name, value);
    }
  }
  button.type = 'button';
  button.append(...Array.from(link.childNodes));
  const label = button.querySelector('[data-youtube-label]');
  if (label) label.textContent = frame.dataset['youtubePlay'] ?? '';
  link.replaceWith(button);

  button.addEventListener('click', () => {
    const player = doc.createElement('iframe');
    player.className = 'video__player';
    player.src = youtubeEmbedUrl(videoId);
    player.title = frame.dataset['youtubeTitle'] ?? '';
    player.setAttribute('allow', PLAYER_ALLOW);
    player.setAttribute('allowfullscreen', '');
    // YouTube's player refuses to start without the embedding page's origin as referrer.
    player.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    button.replaceWith(player);
    player.focus();
  });
}
