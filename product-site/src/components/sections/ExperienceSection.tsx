import type { FC } from "react";
import {
  ExternalLink,
  MapPinned,
  MonitorSmartphone,
  PlayCircle,
  Radar,
  Video,
} from "lucide-react";
import { useI18n } from "@/i18n/context";
import { trackCTA } from "@/services/analytics/webAnalytics";
import { DEMO_VIDEO_EMBED_URL, TRACKING_WEB_URL } from "@/config/env";
import { useInView } from "@/hooks/useInView";

function resolvePublicUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;

  const baseUrl = "/";
  const publicPath = trimmed.replace(/^\/?public\//, "").replace(/^\.?\//, "");
  const basePath = baseUrl.replace(/^\/+|\/+$/g, "");

  if (basePath && publicPath.startsWith(`${basePath}/`)) {
    return `/${publicPath}`;
  }

  return `${baseUrl}${publicPath}`;
}

const ExperienceSection: FC = () => {
  const { t } = useI18n();
  const [cardRef, cardVisible] = useInView<HTMLElement>();
  const trackingUrl = TRACKING_WEB_URL;
  const videoUrl = resolvePublicUrl(DEMO_VIDEO_EMBED_URL.trim());
  const isVideoFile = /\.(mp4|webm|ogg)([?#].*)?$/i.test(videoUrl);

  return (
    <section id="experience" className="scroll-mt-12">
      <div className="bg-[#f5f5f7] py-20 lg:py-32">
        <div className="container">
          <article
            ref={cardRef}
            className={`overflow-hidden rounded-[2rem] bg-white apple-shadow reveal reveal-scale${cardVisible ? " is-visible" : ""}`}
          >
            {/* Header */}
            <div className="border-b border-[#f5f5f7] p-8 text-center sm:p-12">
              <h3 className="mt-4 text-section-title text-[#1d1d1f]">
                {t.experience.heading}
              </h3>
              <p className="text-[16px] leading-relaxed text-[#86868b]">
                {t.experience.desc}
              </p>
            </div>

            {/* 2 cột: Video (trái) + Tracking (phải) */}
            <div className="grid lg:grid-cols-2">
              {/* Video - bên trái */}
              <div className="border-b border-[#f5f5f7] p-8 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="mb-6 flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-[#1d1d1f]">
                    {t.experience.videoTitle}
                  </h3>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f]">
                    <Video className="h-6 w-6" />
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl bg-[#f5f5f7]">
                  <div className="aspect-video">
                    {videoUrl && isVideoFile ? (
                      <video
                        src={videoUrl}
                        className="h-full w-full bg-black object-contain"
                        controls
                        preload="metadata"
                      />
                    ) : videoUrl ? (
                      <iframe
                        title="BA.SEW guide video"
                        src={videoUrl}
                        className="h-full w-full border-0"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#FDF6F0] to-[#f5f5f7] p-6 text-center">
                        <div className="relative">
                          <span className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#8B5E3C] shadow-sm">
                            <PlayCircle className="h-7 w-7" />
                          </span>
                          <h4 className="text-sm font-semibold text-[#1d1d1f]">
                            {t.experience.videoPlaceholderTitle}
                          </h4>
                          <p className="mt-1 max-w-xs text-xs leading-relaxed text-[#6e6e73]">
                            {t.experience.videoPlaceholderDesc}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {videoUrl ? (
                  <div className="mt-4">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => trackCTA("guide_video", "experience_section")}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8B5E3C] transition-colors hover:underline"
                    >
                      {t.experience.videoCta}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : null}
              </div>

              {/* Tracking - bên phải */}
              <div className="p-8 sm:p-10">
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#1d1d1f]">
                      {t.experience.trackingTitle}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-[#86868b]">
                      {t.experience.trackingDesc}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#1d1d1f]">
                    <MonitorSmartphone className="h-6 w-6" />
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {t.experience.trackingHighlights.map((item: string, index: number) => {
                    const Icon = index % 2 === 0 ? MapPinned : Radar;
                    return (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl bg-[#f5f5f7] p-5 text-sm leading-relaxed text-[#1d1d1f]"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#1d1d1f]" />
                        <span className="font-medium">{item}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-5 rounded-2xl bg-[#f5f5f7] p-6">
                  <p className="text-sm text-[#86868b] flex-1 text-center sm:text-left">
                    {t.experience.trackingNote}
                  </p>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackCTA("tracking_experience", "experience_section")}
                    className="inline-flex h-12 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] px-6 text-[15px] font-medium text-white transition-all hover:bg-[#3a3a3c] hover:scale-105"
                  >
                    {t.experience.trackingCta}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default ExperienceSection;
