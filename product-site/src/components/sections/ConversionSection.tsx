import type { FC } from "react";
import { Check, ShoppingBag, Shield, Tag } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { trackCTA } from "@/services/analytics/webAnalytics";
import { useInView } from "@/hooks/useInView";
import imgMain from "@/assets/img_main.png";

interface ConversionSectionProps {
  onOrderClick?: () => void;
}

const ConversionSection: FC<ConversionSectionProps> = ({ onOrderClick }) => {
  const { t } = useI18n();
  const [cardRef, cardVisible] = useInView<HTMLDivElement>();
  const [headerRef, headerVisible] = useInView<HTMLDivElement>();

  return (
    <section id="pricing-order" className="scroll-mt-12">
      <div className="bg-white py-24 lg:py-32">
        <div className="container">

          {/* ── Section header ── */}
          <div
            ref={headerRef}
            className={`text-center reveal${headerVisible ? " is-visible" : ""}`}
          >
            <h2 className="text-section-title text-[#1d1d1f]">
              {t.pricingOrder.heading}
            </h2>
            <p className="mx-auto mt-4 max-w-[28rem] text-[17px] leading-relaxed text-[#86868b]">
              {t.pricingOrder.sub}
            </p>
          </div>

          {/* ── Main card: 2 cột — ảnh trái | giá phải ── */}
          <div
            ref={cardRef}
            className={`mx-auto mt-12 flex max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-[#f5f5f7] apple-shadow sm:flex-row reveal reveal-scale${cardVisible ? " is-visible" : ""}`}
          >

            {/* LEFT — hình ảnh thực tế sản phẩm */}
            <div className="flex items-center justify-center bg-white p-10 sm:w-[45%]">
              <img
                src={imgMain}
                alt="Thiết bị BA.SEW"
                width={260}
                height={260}
                className="h-56 w-auto object-contain transition-transform duration-700 hover:scale-105 sm:h-64"
              />
            </div>

            {/* RIGHT — thông tin giá & tính năng */}
            <div className="flex flex-1 flex-col p-8 sm:p-10 lg:p-12">

              {/* Badge GIÁ ƯU ĐÃI — màu đen mờ */}
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#1d1d1f] px-3 py-1.5 text-white">
                <Tag className="h-3.5 w-3.5" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Giá ưu đãi
                </span>
              </span>

              {/* Giá — font-black để số to, đậm, nổi bật */}
              <div className="mt-5">
                <p className="text-[clamp(2.8rem,8vw,4.5rem)] font-bold tracking-tight text-[#1d1d1f]">
                  {t.pricingOrder.price}
                </p>
                <p className="mt-1 text-[15px] font-medium text-[#86868b]">{t.pricingOrder.unit}</p>
              </div>

              {/* Danh sách tính năng */}
              <div className="mt-6 space-y-3">
                {t.pricingOrder.includes.map((item) => (
                  <div key={item} className="flex items-center gap-3 text-[15px] text-[#1d1d1f]">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>

              {/* Nút đặt hàng */}
              <button
                type="button"
                onClick={() => {
                  onOrderClick?.();
                  trackCTA("open_order_modal", "pricing");
                }}
                className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0066cc] text-[15px] font-medium text-white transition-all hover:bg-[#005bb5] hover:scale-[1.02] active:scale-[0.98]"
              >
                <ShoppingBag className="h-5 w-5" />
                Đặt hàng ngay
              </button>

              {/* Dòng bảo hành — trust signal */}
              <div className="mt-5 flex items-center gap-2 text-xs text-[#86868b]">
                <Shield className="h-4 w-4 shrink-0 text-[#1d1d1f]" />
                <span>
                  Bảo hành <strong className="text-[#1d1d1f]">12 tháng</strong> — 1 đổi 1 nếu lỗi sản xuất
                </span>
              </div>

            </div>
          </div>

          {/* ── Social-proof strip phía dưới card ── */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px] font-medium text-[#86868b]">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#1d1d1f]" /> Đã triển khai thực tế
            </span>
            <span className="hidden text-[#d2d2d7] md:inline">|</span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#1d1d1f]" /> Giao hàng toàn quốc
            </span>
            <span className="hidden text-[#d2d2d7] md:inline">|</span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[#1d1d1f]" /> Thanh toán an toàn
            </span>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ConversionSection;
