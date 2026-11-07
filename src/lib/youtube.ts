/**
 * YouTube videos in articles (docs/decision-record.md, D10): the page shows a thumbnail, and the
 * player (an iframe from youtube-nocookie.com) loads only when the reader presses play. The API
 * stores just the video id; every URL is built here, never taken from content.
 */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isYoutubeId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID.test(value);
}

/** The video on youtube.com: where the thumbnail links when JavaScript doesn't run. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** 480×360 thumbnail; unlike the larger sizes, YouTube has it for every video. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** The player, started at once (the reader just pressed play), without related videos from other channels. */
export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}
