import { useTranslation } from "react-i18next";
import { useChurchInfo, useLiveStatus } from "@/hooks/usePublicDashboard";
import { parseYouTubeUrl } from "@/lib/youtube";
import LiveIndicator from "./LiveIndicator";

function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-lg">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        className="h-full w-full"
      />
    </div>
  );
}

function LinkCard({ channelUrl, label }: { channelUrl: string; label: string }) {
  return (
    <a
      href={channelUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:bg-slate-100 hover:shadow-md sm:p-8"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4">
        {/* YouTube play icon */}
        <svg
          viewBox="0 0 68 48"
          className="h-12 w-16"
          aria-hidden="true"
        >
          <path
            d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
            fill="#FF0000"
          />
          <path d="M45 24 27 14v20" fill="#fff" />
        </svg>
        <span className="text-base font-semibold text-slate-700">
          {label}
        </span>
      </div>
    </a>
  );
}

export default function YouTubeSection() {
  const { t } = useTranslation();
  const { data: churchInfo } = useChurchInfo();
  const youTubeChannelUrl = churchInfo?.youTubeChannelUrl;
  const liveStatus = useLiveStatus(!!youTubeChannelUrl);

  // AC #3: If no YouTube URL configured, completely hidden
  if (!youTubeChannelUrl) {
    return null;
  }

  const sectionTitle = t("pages.home.liveStreamTitle");
  const parsed = parseYouTubeUrl(youTubeChannelUrl);
  const isLive = liveStatus.data?.isLive && liveStatus.data?.liveVideoId;

  // Determine display mode
  let content: React.ReactNode;

  if (isLive && liveStatus.data?.liveVideoId) {
    // LIVE EMBED MODE
    content = (
      <YouTubeEmbed
        videoId={liveStatus.data.liveVideoId}
        title={liveStatus.data.liveTitle || sectionTitle}
      />
    );
  } else if (parsed.videoId) {
    // STATIC EMBED MODE
    content = (
      <YouTubeEmbed videoId={parsed.videoId} title={sectionTitle} />
    );
  } else {
    // LINK CARD MODE
    content = (
      <LinkCard
        channelUrl={parsed.channelUrl}
        label={t("pages.home.watchOnYouTube")}
      />
    );
  }

  return (
    <section aria-labelledby="youtube-section-title" className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-3">
          <h2
            id="youtube-section-title"
            className="text-2xl font-bold text-slate-900"
          >
            {sectionTitle}
          </h2>
          {isLive && <LiveIndicator />}
        </div>
        {content}
      </div>
    </section>
  );
}
