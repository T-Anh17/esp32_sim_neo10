import { useState, type FC } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { useScrolled } from "@/hooks/useScrolled";
import { useCart } from "@/hooks/useCart";
import BrandLogo from "@/components/BrandLogo";
import CartDropdown from "@/components/CartDropdown";
import { trackCTA, trackNavbarClick } from "@/services/analytics/webAnalytics";

interface NavItem {
  id: string;
  key: "device" | "experience" | "pricing" | "contact";
}

const navItems: NavItem[] = [
  { id: "device", key: "device" },
  { id: "experience", key: "experience" },
  { id: "pricing-order", key: "pricing" },
  { id: "contact", key: "contact" },
];

interface NavbarProps {
  onHelpClick?: () => void;
  onOrderClick?: () => void;
  onCheckout?: () => void;
}

const Navbar: FC<NavbarProps> = ({ onHelpClick, onOrderClick, onCheckout }) => {
  const { t } = useI18n();
  const scrolled = useScrolled(16);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const { totalItems, toggleCart } = useCart();

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-white/85 backdrop-blur-2xl shadow-[0_1px_0_rgba(0,0,0,0.10)]"
        : "bg-white/70 backdrop-blur-xl"
        }`}
    >
      <div className="container flex h-12 items-center justify-between gap-4">
        <a href="#" className="shrink-0" aria-label="BA.SEW">
          <BrandLogo compact showSubtitle={false} />
        </a>

        <div className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => trackNavbarClick(item.id)}
              className="text-[13px] font-medium tracking-wide text-[#3a3a3c] transition-colors hover:text-[#000000]"
            >
              {t.nav[item.key]}
            </a>
          ))}
          <button
            type="button"
            onClick={onHelpClick}
            className="text-[13px] font-medium tracking-wide text-[#3a3a3c] transition-colors hover:text-[#000000]"
          >
            Trợ giúp
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Cart icon */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] transition-colors hover:bg-black/5"
            aria-label="Giỏ hàng"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            {totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#1d1d1f] px-1 text-[10px] font-bold text-white shadow-sm">
                {totalItems}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { onOrderClick?.(); trackCTA("order_nav", "navbar"); }}
            className="hidden h-8 items-center rounded-full bg-[#0066cc] px-4 text-[13px] font-medium tracking-wide text-white transition-all hover:bg-[#005bb5] md:inline-flex"
          >
            {t.nav.orderCta}
          </button>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1d1d1f] transition-colors hover:bg-black/5 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#f5f5f7] bg-white/95 backdrop-blur-2xl px-4 pb-5 pt-3 lg:hidden">
          <div className="container flex flex-col gap-1 px-0">
            {navItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => {
                  setMobileOpen(false);
                  trackNavbarClick(item.id);
                }}
                className="rounded-xl px-4 py-3 text-[15px] font-medium text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7]"
              >
                {t.nav[item.key]}
              </a>
            ))}
            <button
              type="button"
              onClick={() => { setMobileOpen(false); onHelpClick?.(); }}
              className="rounded-xl px-4 py-3 text-left text-[15px] font-medium text-[#0066cc] transition-colors hover:bg-[#f5f5f7]"
            >
              Trợ giúp
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOrderClick?.();
                trackCTA("order_nav_mobile", "navbar");
              }}
              className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-[#0066cc] px-6 text-[15px] font-semibold text-white transition-all hover:bg-[#005bb5]"
            >
              {t.nav.orderCta}
            </button>
          </div>
        </div>
      )}
      <CartDropdown onCheckout={onCheckout} />
    </nav>
  );
};

export default Navbar;
