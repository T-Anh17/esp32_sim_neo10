import type { FC } from "react";
import type { LucideIcon } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import {
  CheckCircle2,
  MapPinCheck,
  Radio,
  ShieldAlert,
  Siren,
  Smartphone,
  Waves,
  Webhook,
} from "lucide-react";
import { useI18n } from "@/i18n/context";
import fullProcess from "@/assets/full_process.jpg";
import step01 from "@/assets/step1.jpg";
import step02 from "@/assets/step2.jpg";
import step03 from "@/assets/step3.jpg";
import step04 from "@/assets/step4.jpg";

interface ProcessImage {
  src: string;
  alt: string;
}

const processImages: ProcessImage[] = [
  { src: step01, alt: "Bước 1: Chuẩn bị linh kiện & phần cứng" },
  { src: step02, alt: "Bước 2: Chế tạo điện mạch trên Perboard" },
  { src: step03, alt: "Bước 3: Chế tạo Vỏ & Tích hợp" },
  { src: step04, alt: "Bước 4: Lắp ráp & kiểm tra" },
];

const uspIcons: LucideIcon[] = [Webhook, ShieldAlert, MapPinCheck, Waves];
const featureIcons: LucideIcon[] = [Siren, Smartphone, Radio, CheckCircle2];

const OverviewSection: FC = () => {
  const { t } = useI18n();
  const [headRef, headVisible] = useInView<HTMLDivElement>();
  const [uspRef, uspVisible] = useInView<HTMLDivElement>();
  const [stepsRef, stepsVisible] = useInView<HTMLDivElement>();
  const [processRef, processVisible] = useInView<HTMLDivElement>();

  return (
    <section id="device" className="scroll-mt-12">
      {/* Main heading */}
      <div className="bg-[#f5f5f7] py-24 text-center lg:py-32">
        <div
          ref={headRef}
          className={`container reveal${headVisible ? " is-visible" : ""}`}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-[#86868b]">
            {t.overview.processHeading}
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl text-section-title text-[#1d1d1f]">
            {t.overview.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-[#86868b]">
            {t.overview.desc}
          </p>
        </div>
      </div>

      {/* Điểm khác biệt + Cách hoạt động - gộp chung */}
      <div className="bg-white py-20 lg:py-32">
        <div className="container">

          {/* USPs */}
          <h3 className="mb-10 text-center text-2xl font-semibold text-[#1d1d1f] sm:text-3xl">
            {t.overview.uspHeading}
          </h3>
          <div
            ref={uspRef}
            className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-4 reveal-group${uspVisible ? " is-visible" : ""
              }`}
          >
            {t.overview.usps.map((item, index) => {
              const Icon = uspIcons[index] ?? CheckCircle2;
              return (
                <div
                  key={item}
                  className="rounded-3xl bg-[#f5f5f7] p-8 text-center transition-all duration-300 apple-shadow-hover"
                >
                  <span className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm text-[#1d1d1f]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <p className="text-[15px] font-semibold leading-snug text-[#1d1d1f]">{item}</p>
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="my-16 border-t border-[#f5f5f7]" />

          {/* How it works */}
          <h3 className="mb-10 text-center text-2xl font-semibold text-[#1d1d1f] sm:text-3xl">
            {t.overview.howHeading}
          </h3>
          <div
            ref={stepsRef}
            className={`grid gap-6 lg:grid-cols-3 reveal-group${stepsVisible ? " is-visible" : ""
              }`}
          >
            {t.overview.steps.map((step, index) => {
              const Icon = featureIcons[index] ?? CheckCircle2;
              return (
                <div key={step.title} className="relative flex flex-col items-center gap-4 rounded-3xl bg-[#f5f5f7] p-8 text-center overflow-hidden transition-all duration-300 apple-shadow-hover">
                  {/* Step number watermark */}
                  <span className="absolute -right-4 -top-4 text-[100px] font-black text-black/5 select-none leading-none">
                    {index + 1}
                  </span>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1d1d1f] text-white shadow-md relative z-10">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="relative z-10 text-xs font-bold uppercase tracking-widest text-[#86868b]">
                    Bước {index + 1}
                  </span>
                  <h4 className="relative z-10 text-lg font-semibold text-[#1d1d1f]">
                    {step.title.replace(/^\d+\.\s*/, "")}
                  </h4>
                  <p className="relative z-10 text-sm leading-relaxed text-[#86868b]">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Process images - Gray section */}
      <div className="bg-[#f5f5f7] py-20 lg:py-32">
        <div
          ref={processRef}
          className={`container reveal${processVisible ? " is-visible" : ""}`}
        >
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[#86868b]">
            {t.overview.processHeading}
          </p>
          <p className="mx-auto mb-12 max-w-2xl text-center text-[17px] leading-relaxed text-[#1d1d1f] font-medium">
            {t.overview.processDesc}
          </p>
          {/* Full process image - tổng hợp 4 quy trình */}
          <div className="mb-8 overflow-hidden rounded-[2rem] bg-white apple-shadow">
            <img
              src={fullProcess}
              alt="Toàn bộ quy trình sản xuất BA.SEW"
              loading="lazy"
              className="w-full object-contain"
            />
          </div>

          {/* 4 step images - tỉ lệ 4:3 */}
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {processImages.map((image) => (
              <figure key={image.src} className="overflow-hidden rounded-[1.5rem] bg-white apple-shadow-hover transition-all duration-300">
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
                <figcaption className="px-4 py-3 text-sm font-semibold leading-snug text-[#1d1d1f] text-center">
                  {image.alt}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OverviewSection;
