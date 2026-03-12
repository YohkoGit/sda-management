export function parseYouTubeUrl(url: string): {
  videoId: string | null;
  embedUrl: string | null;
  channelUrl: string;
} {
  const match = url.match(
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) {
    return {
      videoId: match[1],
      embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      channelUrl: url,
    };
  }
  return { videoId: null, embedUrl: null, channelUrl: url };
}
