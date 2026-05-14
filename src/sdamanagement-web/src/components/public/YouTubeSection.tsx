import { useTranslation } from "react-i18next";
import { useChurchInfo, useLiveStatus } from "@/hooks/usePublicDashboard";
import { parseYouTubeUrl } from "@/lib/youtube";
import { Eyebrow } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import LiveIndicator from "./LiveIndicator";

function YouTubeEmbed({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[var(--radius)] border border-[var(--ink-2)]">
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

export default function YouTubeSection() {
  const { t } = useTranslation();
  const { data: churchInfo } = useChurchInfo();
  const youTubeChannelUrl = churchInfo?.youTubeChannelUrl;
  const liveStatus = useLiveStatus(!!youTubeChannelUrl);

  if (!youTubeChannelUrl) {
    return null;
  }

  const parsed = parseYouTubeUrl(youTubeChannelUrl);
  const isLive = liveStatus.data?.isLive && liveStatus.data?.liveVideoId;

  // Hide entirely unless live. (The handoff says "show only when live".)
  // We keep a low-key offline state for static embeds; the live channel link
  // remains accessible on /live.
  if (!isLive && !parsed.videoId) {
    return null;
  }

  const videoId = isLive ? liveStatus.data!.liveVideoId! : parsed.videoId!;
  const embedTitle = isLive
    ? liveStatus.data?.liveTitle ?? t("pages.home.liveStreamTitle")
    : t("pages.home.liveStreamTitle");

  return (
    <section
      aria-labelledby="youtube-section-title"
      className="bg-[var(--ink)] text-[var(--parchment)]"
    >
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div>
            {isLive ? (
              <LiveIndicator />
            ) : (
              <Eyebrow className="text-[var(--gilt-soft)]">
                {t("pages.home.liveStreamDescription", "Rediffusion")}
              </Eyebrow>
            )}
            <h2
              id="youtube-section-title"
              className="mt-4 font-display text-4xl leading-tight text-[var(--parchment)] lg:text-5xl"
            >
              {isLive ? t("pages.home.liveStreamTitle") : t("pages.home.watchOnYouTube")}
              <span className="text-[var(--gilt)]">.</span>
            </h2>
            <p className="mt-5 max-w-md text-[var(--parchment)]/70">
              {t(
                "pages.home.liveStreamDescription",
                "Rejoignez-nous en direct chaque sabbat ou regardez la dernière prédication.",
              )}
            </p>
            <Button
              asChild
              variant="gilt"
              className="mt-7 border-[var(--gilt)] text-[var(--parchment)] hover:bg-[var(--gilt)]/15"
            >
              <a href={parsed.channelUrl} target="_blank" rel="noopener noreferrer">
                {t("pages.home.watchOnYouTube")} →
              </a>
            </Button>
          </div>

          <YouTubeEmbed videoId={videoId} title={embedTitle} />
        </div>
      </div>
    </section>
  );
}
