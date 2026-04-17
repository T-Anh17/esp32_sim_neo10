import { useCallback, useEffect, useRef, useState, type FC } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  Smartphone,
  Truck,
  X,
} from "lucide-react";
import {
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_ACCOUNT_NO,
  PAYMENT_BANK_BIN,
  PAYMENT_BANK_NAME,
  PAYMENT_COMPANY_PREFIX,
  PAYMENT_MOMO_PHONE,
} from "@/config";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PaymentMethod = "vietqr" | "manual" | "cod";

type QrStatus = "loading" | "ready" | "error";
type ConfirmState = "idle" | "confirming" | "done";

interface PaymentQRModalProps {
  isOpen: boolean;
  paymentMethod: PaymentMethod; // phương thức người dùng đã chọn
  amount: number;
  phone: string;
  name: string;
  address: string;
  orderId?: string; // Mã đơn hàng từ backend — dùng trong nội dung chuyển khoản
  onClose: () => void;
  onConfirm: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  return n.toLocaleString("vi-VN") + "₫";
}

function buildVietQRUrl(amount: number, addInfo: string): string {
  const base = "https://img.vietqr.io/image";
  const params = new URLSearchParams({
    accountName: PAYMENT_ACCOUNT_NAME,
    accountNo: PAYMENT_ACCOUNT_NO,
    amount: String(amount),
    addInfo,
    template: "compact2",
    // acqId = Mã ngân hàng BIN — dùng trong query param theo spec VietQR
    acqId: PAYMENT_BANK_BIN,
  });
  return `${base}/${PAYMENT_BANK_BIN}-${PAYMENT_ACCOUNT_NO}-compact2.png?${params.toString()}`;
}

/**
 * Tạo deep-link mở ứng dụng MoMo trực tiếp.
 * VietQR tương thích MoMo, nhưng nút này giúp user chuyển nhanh sang app MoMo
 * nếu điện thoại có cài đặt sẵn MoMo.
 */
function buildMoMoDeepLink(amount: number, addInfo: string): string {
  // MoMo nhận URL scheme: momo://... hoặc intent cho Android
  const raw = `momo://app?action=pay&serviceMode=STANDARD&merchantcode=${PAYMENT_BANK_BIN}&merchantname=${encodeURIComponent(PAYMENT_ACCOUNT_NAME)}&amount=${amount}&orderId=${Date.now()}&message=${encodeURIComponent(addInfo)}`;
  return raw;
}

/** Kiểm tra xem trình duyệt có thể mở được MoMo app hay không */
function canOpenMoMo(): boolean {
  // Trên mobile (React Native webview) thường hỗ trợ custom URL scheme
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
const CopyButton: FC<{ text: string; label?: string; small?: boolean }> = ({ text, label, small }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 rounded-md font-medium transition-all ${small
        ? `px-1.5 py-0.5 text-[10px] ${copied ? "bg-green-100 text-green-700" : "bg-[#8B5E3C]/10 text-[#8B5E3C] hover:bg-[#8B5E3C]/20"}`
        : `px-2 py-0.5 text-xs ${copied ? "bg-green-100 text-green-700" : "bg-[#8B5E3C]/10 text-[#8B5E3C] hover:bg-[#8B5E3C]/20"}`
        }`}
      title={`Sao chép ${label ?? ""}`}
    >
      {copied ? <><Check className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />Đã sao</> : <><Copy className={small ? "h-2.5 w-2.5" : "h-3 w-3"} />Sao chép</>}
    </button>
  );
};

// ─── InfoRow ─────────────────────────────────────────────────────────────────
const InfoRow: FC<{
  label: string;
  value: string;
  copyable?: boolean;
  highlight?: boolean;
  icon?: React.ElementType;
  iconClass?: string;
}> = ({ label, value, copyable, highlight, icon: Icon, iconClass }) => (
  <div className="flex items-center justify-between gap-3 py-2.5 px-1">
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass ?? "text-[#86868b]"}`} />}
      <span className="shrink-0 text-xs text-[#86868b]">{label}</span>
    </div>
    <div className="flex min-w-0 items-center gap-1.5">
      <span className={`truncate text-right text-sm font-semibold ${highlight ? "text-[#8B5E3C]" : "text-[#1d1d1f]"}`}>
        {value}
      </span>
      {copyable && <CopyButton text={value} />}
    </div>
  </div>
);

const Divider: FC = () => <div className="border-t border-[#f0f0f0]" />;

// ─── VietQR Panel ─────────────────────────────────────────────────────────────
const VietQRPanel: FC<{ amount: number; addInfo: string }> = ({ amount, addInfo }) => {
  const qrUrl = buildVietQRUrl(amount, addInfo);
  const [qrStatus, setQrStatus] = useState<QrStatus>("loading");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setQrStatus("loading");
  }, [qrUrl]);

  const hasBank = Boolean(PAYMENT_ACCOUNT_NO);

  if (!hasBank) {
    return (
      <div className="mx-5 my-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-700">⚠️ Chưa cấu hình tài khoản ngân hàng</p>
        <p className="mt-1 text-xs text-amber-600">
          Thêm <code className="rounded bg-amber-100 px-1">VITE_PAYMENT_ACCOUNT_NO</code> và{" "}
          <code className="rounded bg-amber-100 px-1">VITE_PAYMENT_BANK_BIN</code> vào file <code className="rounded bg-amber-100 px-1">.env</code>.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Amount badge */}
      <div className="mx-5 mt-1 flex justify-center">
        <div className="rounded-2xl bg-[#FDF6F0] px-6 py-3 text-center ring-1 ring-[#8B5E3C]/15">
          <p className="text-xs font-medium text-[#8B5E3C]">Số tiền cần chuyển</p>
          <p className="mt-0.5 text-2xl font-black tracking-tight text-[#1d1d1f]">
            {formatPrice(amount)}
          </p>
        </div>
      </div>

      {/* QR image */}
      <div className="mx-5 mt-4 flex justify-center">
        <div className="relative flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl bg-[#f8f8f8] ring-1 ring-[#d2d2d7] sm:h-60 sm:w-60">
          {qrStatus === "loading" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f8f8f8]">
              <Loader2 className="h-8 w-8 animate-spin text-[#8B5E3C]" />
              <span className="text-xs text-[#86868b]">Đang tạo mã QR…</span>
            </div>
          )}
          {qrStatus === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#f8f8f8] px-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <span className="text-xs text-[#86868b]">
                Không tải được QR.<br />Vui lòng dùng chuyển khoản thủ công.
              </span>
            </div>
          )}
          <img
            ref={imgRef}
            src={qrUrl}
            alt="Mã VietQR thanh toán BA.SEW"
            className={`h-full w-full object-contain transition-opacity duration-300 ${qrStatus === "ready" ? "opacity-100" : "opacity-0"
              }`}
            onLoad={() => setQrStatus("ready")}
            onError={() => setQrStatus("error")}
          />
        </div>
      </div>

      {/* App compatibility badges */}
      <div className="mx-5 mt-3 flex flex-wrap items-center justify-center gap-2">
        {[
          { label: "VietQR", emoji: "📱", bg: "bg-blue-50", text: "text-blue-600" },
          { label: "MoMo", emoji: "💜", bg: "bg-purple-50", text: "text-purple-600" },
          { label: "ZaloPay", emoji: "🔵", bg: "bg-blue-50", text: "text-blue-500" },
          { label: "VNPay", emoji: "💳", bg: "bg-orange-50", text: "text-orange-500" },
        ].map(({ label, emoji, bg, text }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${bg} ${text}`}
          >
            {emoji} {label}
          </span>
        ))}
      </div>

      {/* MoMo deep-link button — chỉ hiện trên mobile */}
      {canOpenMoMo() && PAYMENT_MOMO_PHONE && (
        <div className="mx-5 mt-3 flex justify-center">
          <a
            href={buildMoMoDeepLink(amount, addInfo)}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#a0156a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#8B104F] active:scale-95"
          >
            <span className="text-base">💜</span>
            Mở ứng dụng MoMo để quét
          </a>
        </div>
      )}

      {/* Transfer details */}
      <div className="mx-5 mt-4 space-y-0.5 rounded-2xl bg-[#f8f8f8] px-4">
        <InfoRow label="Ngân hàng" value={PAYMENT_BANK_NAME} />
        <Divider />
        <InfoRow label="Số tài khoản" value={PAYMENT_ACCOUNT_NO} copyable />
        <Divider />
        <InfoRow label="Tên tài khoản" value={PAYMENT_ACCOUNT_NAME} />
        <Divider />
        <InfoRow label="Số tiền" value={formatPrice(amount)} copyable highlight />
        <Divider />
        <InfoRow label="Nội dung CK" value={addInfo} copyable highlight />
        {PAYMENT_MOMO_PHONE && (
          <>
            <Divider />
            <InfoRow label="MoMo" value={PAYMENT_MOMO_PHONE} copyable />
          </>
        )}
      </div>

      {/* Hint */}
      <p className="mx-5 mt-3 text-center text-xs leading-relaxed text-[#86868b]">
        Quét mã bằng <strong className="text-[#6e6e73]">App Ngân hàng</strong> hoặc{" "}
        <strong className="text-[#6e6e73]">MoMo</strong>. Số tiền &amp; nội dung được điền tự động.
      </p>
    </>
  );
};

// ─── Manual Transfer Panel ────────────────────────────────────────────────────
const ManualPanel: FC<{ amount: number; addInfo: string }> = ({ amount, addInfo }) => {
  const hasBank = Boolean(PAYMENT_ACCOUNT_NO);
  const hasMomo = Boolean(PAYMENT_MOMO_PHONE);

  return (
    <div className="mx-5 mt-1 space-y-3">
      {/* Amount */}
      <div className="flex items-center justify-between rounded-2xl bg-[#FDF6F0] px-5 py-4 ring-1 ring-[#8B5E3C]/15">
        <span className="text-xs font-medium text-[#8B5E3C]">Số tiền cần chuyển</span>
        <span className="text-xl font-black text-[#1d1d1f]">{formatPrice(amount)}</span>
      </div>

      {hasBank && (
        <div className="rounded-2xl bg-[#f8f8f8] px-4">
          <p className="flex items-center gap-1.5 py-2.5 text-xs font-semibold text-[#8B5E3C]">
            <Banknote className="h-3.5 w-3.5" />
            Chuyển khoản ngân hàng
          </p>
          <Divider />
          <InfoRow label="Ngân hàng" value={PAYMENT_BANK_NAME} />
          <Divider />
          <InfoRow label="Số tài khoản" value={PAYMENT_ACCOUNT_NO} copyable />
          <Divider />
          <InfoRow label="Tên tài khoản" value={PAYMENT_ACCOUNT_NAME} />
          <Divider />
          <InfoRow label="Số tiền" value={formatPrice(amount)} copyable highlight />
          <Divider />
          <InfoRow label="Nội dung CK" value={addInfo} copyable highlight />
        </div>
      )}

      {hasMomo && (
        <div className="rounded-2xl bg-[#f8f8f8] px-4">
          <p className="flex items-center gap-1.5 py-2.5 text-xs font-semibold text-[#aa00ff]">
            <Smartphone className="h-3.5 w-3.5" />
            Chuyển khoản MoMo
          </p>
          <Divider />
          <InfoRow label="Số điện thoại" value={PAYMENT_MOMO_PHONE} copyable />
          <Divider />
          <InfoRow label="Tên tài khoản" value={PAYMENT_ACCOUNT_NAME} />
          <Divider />
          <InfoRow label="Số tiền" value={formatPrice(amount)} copyable highlight />
          <Divider />
          <InfoRow label="Nội dung CK" value={addInfo} copyable highlight />
        </div>
      )}

      {!hasBank && !hasMomo && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-700">⚠️ Chưa cấu hình tài khoản</p>
          <p className="mt-1 text-xs text-amber-600">
            Thêm <code className="rounded bg-amber-100 px-1">VITE_PAYMENT_ACCOUNT_NO</code> vào file <code className="rounded bg-amber-100 px-1">.env</code>.
          </p>
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-2 rounded-xl border border-[#d2d2d7] bg-white p-3.5">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs leading-relaxed text-[#6e6e73]">
          Vui lòng nhập <strong className="text-[#1d1d1f]">chính xác</strong> số tiền và nội dung để chúng tôi xác nhận đơn hàng nhanh nhất.
        </p>
      </div>
    </div>
  );
};

// ─── COD Panel ────────────────────────────────────────────────────────────────
const CODPanel: FC<{ amount: number }> = ({ amount }) => (
  <div className="mx-5 mt-1 space-y-4">
    <div className="flex items-center justify-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7]">
        <Truck className="h-8 w-8 text-[#6e6e73]" />
      </div>
    </div>

    <div className="rounded-2xl bg-[#f8f8f8] px-5 py-4 text-center">
      <p className="text-sm font-semibold text-[#1d1d1f]">Thanh toán khi nhận hàng (COD)</p>
      <p className="mt-2 text-sm text-[#6e6e73]">
        Bạn sẽ trả <strong className="text-[#1d1d1f]">{formatPrice(amount)}</strong> trực tiếp cho nhân viên giao hàng khi nhận được sản phẩm.
      </p>
    </div>

    <div className="space-y-1 rounded-2xl bg-[#f5f5f7] px-4">
      {[
        { icon: ShieldCheck, text: "Miễn phí giao hàng toàn quốc", iconClass: "text-green-500" },
        { icon: Check, text: "Kiểm tra sản phẩm trước khi thanh toán", iconClass: "text-green-500" },
        { icon: Check, text: "Hỗ trợ đổi/trả trong 7 ngày nếu lỗi nhà sản xuất", iconClass: "text-green-500" },
      ].map(({ icon: Icon, text, iconClass }) => (
        <div key={text} className="flex items-center gap-2 py-2.5">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          <span className="text-xs text-[#6e6e73]">{text}</span>
        </div>
      ))}
    </div>

    <p className="text-center text-xs text-[#86868b]">
      Shipper sẽ gọi điện xác nhận trước khi giao hàng.
    </p>
  </div>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
const PaymentQRModal: FC<PaymentQRModalProps> = ({
  isOpen,
  paymentMethod,
  amount,
  phone,
  name,
  address,
  orderId,
  onClose,
  onConfirm,
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  // Nội dung chuyển khoản: "BASEW [orderId]" nếu có orderId, fallback "BASEW [phone]"
  const addInfo = orderId
    ? `${PAYMENT_COMPANY_PREFIX} ${orderId}`
    : `${PAYMENT_COMPANY_PREFIX} ${phone}`;

  // Reset on open
  useEffect(() => {
    if (isOpen) setConfirmState("idle");
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleConfirm = useCallback(() => {
    setConfirmState("confirming");
    setTimeout(() => {
      setConfirmState("done");
      setTimeout(() => onConfirm(), 700);
    }, 1200);
  }, [onConfirm]);

  if (!isOpen) return null;

  const panelConfig = {
    vietqr: { icon: QrCode, title: "Quét mã thanh toán VietQR", desc: "Dùng App Ngân hàng hoặc MoMo để quét mã QR" },
    manual: { icon: Banknote, title: "Thông tin chuyển khoản", desc: "Nhập thông tin thủ công vào App Ngân hàng hoặc MoMo" },
    cod: { icon: Truck, title: "Thanh toán khi nhận hàng", desc: "Trả tiền mặt khi nhận được hàng" },
  }[paymentMethod];

  const IconEl = panelConfig.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-[70] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4">
        <div
          /* Responsive: rounded-t-3xl trên mobile (bottom-sheet), rounded-3xl trên desktop */
          className="relative mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-[slideUp_0.28s_ease-out] sm:rounded-3xl sm:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5E3C]/10 text-[#8B5E3C]">
                <IconEl className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#1d1d1f]">{panelConfig.title}</h3>
                <p className="text-xs text-[#86868b]">{panelConfig.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={confirmState !== "idle"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#86868b] hover:bg-[#f5f5f7] disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Method tabs — indicate active, no navigation */}
          <div className="flex border-b border-[#f0f0f0]">
            {([
              { value: "vietqr" as PaymentMethod, icon: QrCode, label: "VietQR / MoMo" },
              { value: "manual" as PaymentMethod, icon: Banknote, label: "Chuyển khoản" },
              { value: "cod" as PaymentMethod, icon: Truck, label: "COD" },
            ] as const).map(({ value, icon: TIcon, label }) => (
              <button
                key={value}
                type="button"
                className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${paymentMethod === value
                  ? "border-b-2 border-[#8B5E3C] text-[#8B5E3C]"
                  : "text-[#86868b]"
                  }`}
              >
                <TIcon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div
            style={{ maxHeight: "calc(100vh - 280px)", minHeight: "200px" }}
            className="overflow-y-auto"
          >

            {/* Customer address strip */}
            <div className="mx-5 mt-4 flex items-center gap-2.5 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-4 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-xs text-[#86868b]">Giao đến</span>
                <span className="truncate text-sm font-medium text-[#1d1d1f]">{name}</span>
                <span className="truncate text-xs text-[#86868b]">{address}</span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#d2d2d7]" />
            </div>

            {/* Method content */}
            <div className="pb-2">
              {paymentMethod === "vietqr" && <VietQRPanel amount={amount} addInfo={addInfo} />}
              {paymentMethod === "manual" && <ManualPanel amount={amount} addInfo={addInfo} />}
              {paymentMethod === "cod" && <CODPanel amount={amount} />}
            </div>

            {/* Sticky CTA */}
            <div className="sticky bottom-0 flex flex-col gap-3 border-t border-[#f0f0f0] bg-white px-5 py-4">
              {/* Payment timer hint */}
              {(paymentMethod === "vietqr" || paymentMethod === "manual") && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-[#fff9e6] px-4 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <p className="text-xs text-amber-700">
                    Mã QR có hiệu lực trong <strong>15 phút</strong> — vui lòng chuyển khoản sớm
                  </p>
                </div>
              )}
              {/* Confirm button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmState !== "idle"}
                className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-all disabled:cursor-not-allowed ${confirmState === "idle"
                  ? "bg-[#8B5E3C] hover:bg-[#6F4A2F] active:scale-[0.97] shadow-sm"
                  : confirmState === "confirming"
                    ? "bg-[#8B5E3C]/80"
                    : "bg-green-500"
                  }`}
              >
                {confirmState === "idle" && (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    {paymentMethod === "cod" ? "Xác nhận đặt hàng COD" : "Tôi đã chuyển khoản"}
                  </>
                )}
                {confirmState === "confirming" && <><Loader2 className="h-5 w-5 animate-spin" />Đang xác nhận…</>}
                {confirmState === "done" && <><CheckCircle2 className="h-5 w-5" />Đã xác nhận!</>}
              </button>

              {/* Back button */}
              <button
                type="button"
                onClick={onClose}
                disabled={confirmState !== "idle"}
                className="inline-flex h-10 w-full items-center justify-center rounded-full border border-[#d2d2d7] text-sm text-[#6e6e73] transition-all hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {confirmState === "idle" ? "Quay lại chỉnh sửa" : "…"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentQRModal;