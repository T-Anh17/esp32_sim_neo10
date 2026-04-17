import { useCallback, useEffect, useRef, useState, type FC } from "react";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import {
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_ACCOUNT_NO,
  PAYMENT_BANK_BIN,
  PAYMENT_BANK_NAME,
  PAYMENT_BANK_LOGO_URL,
  PAYMENT_COMPANY_PREFIX,
  PAYMENT_MOMO_PHONE,
  PAYMENT_MOMO_QR_URL,
} from "@/config";

// ─── Types ────────────────────────────────────────────────────────────────────
export type PaymentMethod = "vietqr" | "manual" | "cod";

type QrStatus = "loading" | "ready" | "error";
type ConfirmState = "idle" | "submitting" | "done";

interface PaymentQRModalProps {
  isOpen: boolean;
  paymentMethod: PaymentMethod;
  amount: number;
  phone: string;
  onClose: () => void;
  /** Called after order is successfully posted — orderId from backend */
  onConfirm: (orderId: string) => void;
  /** Called when user clicks "Tôi đã chuyển khoản" — POSTs to Google Sheet */
  onSubmitOrder: () => Promise<{ orderId: string }>;
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
    acqId: PAYMENT_BANK_BIN,
  });
  return `${base}/${PAYMENT_BANK_BIN}-${PAYMENT_ACCOUNT_NO}-compact2.png?${params.toString()}`;
}

function buildMoMoDeepLink(amount: number, addInfo: string): string {
  return `momo://app?action=pay&serviceMode=STANDARD&merchantcode=${PAYMENT_BANK_BIN}&merchantname=${encodeURIComponent(PAYMENT_ACCOUNT_NAME)}&amount=${amount}&orderId=${Date.now()}&message=${encodeURIComponent(addInfo)}`;
}

function canOpenMoMo(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ─── CopyButton (compact) ────────────────────────────────────────────────────
const CopyBtn: FC<{ text: string }> = ({ text }) => {
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
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-all ${
        copied ? "bg-green-100 text-green-700" : "bg-[#8B5E3C]/10 text-[#8B5E3C] hover:bg-[#8B5E3C]/20"
      }`}
    >
      {copied ? <><Check className="h-2.5 w-2.5" />Đã sao</> : <><Copy className="h-2.5 w-2.5" />Copy</>}
    </button>
  );
};

// ─── Compact InfoRow ─────────────────────────────────────────────────────────
const InfoRow: FC<{
  label: string;
  value: string;
  copyable?: boolean;
  highlight?: boolean;
}> = ({ label, value, copyable, highlight }) => (
  <div className="flex items-center justify-between gap-2 py-2">
    <span className="shrink-0 text-xs text-[#86868b]">{label}</span>
    <div className="flex min-w-0 items-center gap-1">
      <span
        className={`truncate text-right text-sm font-semibold ${
          highlight ? "text-[#8B5E3C]" : "text-[#1d1d1f]"
        }`}
      >
        {value}
      </span>
      {copyable && <CopyBtn text={value} />}
    </div>
  </div>
);

// ─── VietQR Panel (compact, with VietQR + MoMo tabs) ─────────────────────────
const VietQRPanel: FC<{ amount: number; addInfo: string }> = ({ amount, addInfo }) => {
  const qrUrl = buildVietQRUrl(amount, addInfo);
  const [qrStatus, setQrStatus] = useState<QrStatus>("loading");
  const [momoQrStatus, setMomoQrStatus] = useState<QrStatus>("loading");
  const [activeQr, setActiveQr] = useState<"vietqr" | "momo">("vietqr");
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => { setQrStatus("loading"); }, [qrUrl]);

  const hasBank = Boolean(PAYMENT_ACCOUNT_NO);
  const hasMomoQr = Boolean(PAYMENT_MOMO_QR_URL);

  if (!hasBank) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700">⚠️ Chưa cấu hình tài khoản ngân hàng</p>
      </div>
    );
  }

  return (
    <>
      {/* QR Tab switcher */}
      {hasMomoQr && (
        <div className="mb-3 flex rounded-lg bg-[#f5f5f7] p-0.5">
          <button
            type="button"
            onClick={() => setActiveQr("vietqr")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
              activeQr === "vietqr" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
            }`}
          >
            📱 VietQR
          </button>
          <button
            type="button"
            onClick={() => setActiveQr("momo")}
            className={`flex-1 rounded-md py-2 text-xs font-semibold transition-all ${
              activeQr === "momo" ? "bg-white text-[#a0156a] shadow-sm" : "text-[#86868b]"
            }`}
          >
            💜 MoMo
          </button>
        </div>
      )}

      {/* QR code — compact */}
      <div className="mb-3 flex justify-center">
        <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-[#f8f8f8] ring-1 ring-[#d2d2d7]">
          {activeQr === "vietqr" ? (
            <>
              {qrStatus === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#f8f8f8]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8B5E3C]" />
                  <span className="text-[10px] text-[#86868b]">Đang tạo QR…</span>
                </div>
              )}
              {qrStatus === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#f8f8f8] px-3 text-center">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <span className="text-[10px] text-[#86868b]">Lỗi tải QR</span>
                </div>
              )}
              <img
                ref={imgRef}
                src={qrUrl}
                alt="VietQR"
                className={`h-full w-full object-contain transition-opacity ${
                  qrStatus === "ready" ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setQrStatus("ready")}
                onError={() => setQrStatus("error")}
              />
            </>
          ) : (
            <>
              {momoQrStatus === "loading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#f8f8f8]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#a0156a]" />
                  <span className="text-[10px] text-[#86868b]">Đang tải QR MoMo…</span>
                </div>
              )}
              {momoQrStatus === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-[#f8f8f8] px-3 text-center">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                  <span className="text-[10px] text-[#86868b]">Lỗi tải QR MoMo</span>
                </div>
              )}
              <img
                src={PAYMENT_MOMO_QR_URL}
                alt="MoMo QR"
                className={`h-full w-full object-contain transition-opacity ${
                  momoQrStatus === "ready" ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setMomoQrStatus("ready")}
                onError={() => setMomoQrStatus("error")}
              />
            </>
          )}
        </div>
      </div>

      {/* MoMo deep-link — mobile only, MoMo tab only */}
      {activeQr === "momo" && canOpenMoMo() && PAYMENT_MOMO_PHONE && (
        <div className="mb-3 flex justify-center">
          <a
            href={buildMoMoDeepLink(amount, addInfo)}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#a0156a] px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-95"
          >
            💜 Mở MoMo
          </a>
        </div>
      )}

      {/* Transfer info — compact card */}
      <div className="divide-y divide-[#e8e8e8] rounded-xl bg-[#f8f8f8] px-3">
        <InfoRow label="Ngân hàng" value={PAYMENT_BANK_NAME} />
        <InfoRow label="Số TK" value={PAYMENT_ACCOUNT_NO} copyable />
        <InfoRow label="Chủ TK" value={PAYMENT_ACCOUNT_NAME} />
        <InfoRow label="Số tiền" value={formatPrice(amount)} copyable highlight />
        <InfoRow label="Nội dung CK" value={addInfo} copyable highlight />
      </div>
    </>
  );
};

// ─── Manual Transfer Panel (compact, bank logo + account info) ────────────────
const ManualPanel: FC<{ amount: number; addInfo: string }> = ({ amount, addInfo }) => {
  const hasBank = Boolean(PAYMENT_ACCOUNT_NO);

  if (!hasBank) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700">⚠️ Chưa cấu hình tài khoản</p>
      </div>
    );
  }

  return (
    <>
      {/* Bank identity */}
      <div className="mb-3 flex flex-col items-center gap-2 py-3">
        {PAYMENT_BANK_LOGO_URL ? (
          <img
            src={PAYMENT_BANK_LOGO_URL}
            alt={PAYMENT_BANK_NAME}
            className="h-10 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5E3C]/10">
            <Banknote className="h-6 w-6 text-[#8B5E3C]" />
          </div>
        )}
        <p className="text-sm font-bold text-[#1d1d1f]">{PAYMENT_BANK_NAME}</p>
      </div>

      {/* Account info — compact */}
      <div className="divide-y divide-[#e8e8e8] rounded-xl bg-[#f8f8f8] px-3">
        <InfoRow label="Chủ TK" value={PAYMENT_ACCOUNT_NAME} />
        <InfoRow label="Số TK" value={PAYMENT_ACCOUNT_NO} copyable highlight />
        <InfoRow label="Số tiền" value={formatPrice(amount)} copyable highlight />
        <InfoRow label="Nội dung CK" value={addInfo} copyable highlight />
      </div>
    </>
  );
};

// ─── COD Panel (compact) ──────────────────────────────────────────────────────
const CODPanel: FC<{ amount: number }> = ({ amount }) => (
  <>
    <div className="flex flex-col items-center gap-2 py-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f5f5f7]">
        <Truck className="h-6 w-6 text-[#6e6e73]" />
      </div>
      <p className="text-sm font-semibold text-[#1d1d1f]">Thanh toán khi nhận hàng</p>
      <p className="text-xs text-center text-[#6e6e73]">
        Trả <strong className="text-[#1d1d1f]">{formatPrice(amount)}</strong> khi nhận hàng
      </p>
    </div>
    <div className="divide-y divide-[#e8e8e8] rounded-xl bg-[#f5f5f7] px-3">
      {[
        { icon: ShieldCheck, text: "Miễn phí giao hàng", cls: "text-green-500" },
        { icon: Check, text: "Kiểm tra trước khi thanh toán", cls: "text-green-500" },
      ].map(({ icon: Icon, text, cls }) => (
        <div key={text} className="flex items-center gap-2 py-2">
          <Icon className={`h-3.5 w-3.5 shrink-0 ${cls}`} />
          <span className="text-xs text-[#6e6e73]">{text}</span>
        </div>
      ))}
    </div>
  </>
);

// ─── Main Modal (compact, centered) ──────────────────────────────────────────
const PaymentQRModal: FC<PaymentQRModalProps> = ({
  isOpen,
  paymentMethod,
  amount,
  phone,
  onClose,
  onConfirm,
  onSubmitOrder,
}) => {
  const [confirmState, setConfirmState] = useState<ConfirmState>("idle");
  const [submitError, setSubmitError] = useState("");

  // Transfer content: uses phone as identifier (orderId comes after POST)
  const addInfo = `${PAYMENT_COMPANY_PREFIX} ${phone}`;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setConfirmState("idle");
      setSubmitError("");
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Confirm: POST to Google Sheet, then signal success
  const handleConfirm = useCallback(async () => {
    setConfirmState("submitting");
    setSubmitError("");

    try {
      const result = await onSubmitOrder();
      setConfirmState("done");
      setTimeout(() => onConfirm(result.orderId), 700);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gửi đơn hàng thất bại. Vui lòng thử lại.";
      setSubmitError(msg);
      setConfirmState("idle");
    }
  }, [onSubmitOrder, onConfirm]);

  if (!isOpen) return null;

  const titles: Record<PaymentMethod, string> = {
    vietqr: "Thanh toán QR",
    manual: "Chuyển khoản ngân hàng",
    cod: "Thanh toán khi nhận hàng",
  };
  const icons: Record<PaymentMethod, typeof QrCode> = {
    vietqr: QrCode,
    manual: Banknote,
    cod: Truck,
  };
  const IconEl = icons[paymentMethod];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Centered panel */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div
          className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-[slideUp_0.25s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header — compact */}
          <div className="flex items-center justify-between border-b border-[#f0f0f0] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#8B5E3C]/10 text-[#8B5E3C]">
                <IconEl className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-semibold text-[#1d1d1f]">
                {titles[paymentMethod]}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={confirmState === "submitting"}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#86868b] hover:bg-[#f5f5f7] disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content — no scroll needed */}
          <div className="px-4 py-3">
            {paymentMethod === "vietqr" && <VietQRPanel amount={amount} addInfo={addInfo} />}
            {paymentMethod === "manual" && <ManualPanel amount={amount} addInfo={addInfo} />}
            {paymentMethod === "cod" && <CODPanel amount={amount} />}
          </div>

          {/* Footer — confirm + back */}
          <div className="space-y-2 px-4 pb-4">
            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}

            {/* Confirm button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirmState !== "idle"}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition-all disabled:cursor-not-allowed ${
                confirmState === "idle"
                  ? "bg-[#8B5E3C] shadow-sm hover:bg-[#6F4A2F] active:scale-[0.97]"
                  : confirmState === "submitting"
                    ? "bg-[#8B5E3C]/80"
                    : "bg-green-500"
              }`}
            >
              {confirmState === "idle" && (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {paymentMethod === "cod" ? "Xác nhận đặt hàng" : "Tôi đã chuyển khoản"}
                </>
              )}
              {confirmState === "submitting" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang gửi đơn…
                </>
              )}
              {confirmState === "done" && (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Đã xác nhận!
                </>
              )}
            </button>

            {/* Back button */}
            <button
              type="button"
              onClick={onClose}
              disabled={confirmState !== "idle"}
              className="inline-flex h-9 w-full items-center justify-center rounded-full border border-[#d2d2d7] text-xs text-[#6e6e73] hover:bg-[#f5f5f7] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {confirmState === "idle" ? "Quay lại chỉnh sửa" : "…"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentQRModal;