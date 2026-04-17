import { useState, type FC, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  Globe,
  Loader2,
  MapPin,
  MapPinned,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  Truck,
  User,
} from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAddressSelector } from "@/hooks/useAddressSelector";
import BrandLogo from "@/components/BrandLogo";
import PaymentQRModal, { type PaymentMethod } from "@/components/PaymentQRModal";
import {
  validateOrderForm,
  mapPaymentMethod,
  submitOrder,
  type OrderPayload,
} from "@/services/forms/orderService";

type CheckoutStatus = "idle" | "sending" | "success" | "error";

function formatPrice(price: number): string {
  return price.toLocaleString("vi-VN") + "đ";
}

interface CheckoutSectionProps {
  isOpen: boolean;
  onClose: () => void;
}

const CheckoutSection: FC<CheckoutSectionProps> = ({ isOpen, onClose }) => {
  const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderId, setOrderId] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    note: "",
    payment: "cod" as PaymentMethod,
  });
  const [detailAddress, setDetailAddress] = useState("");
  const {
    provinces,
    districts,
    wards,
    selected,
    loading: addrLoading,
    error: addrError,
    fullAddress,
    isValid: addressValid,
    selectProvince,
    selectDistrict,
    selectWard,
  } = useAddressSelector(detailAddress);

  const shipping = 0;
  const grandTotal = totalPrice + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  // ── Build location string from 3-level address selectors ──────────────────
  const buildLocationString = (): string => {
    const parts = [
      selected.province?.name,
      selected.district?.name,
      selected.ward?.name,
    ].filter(Boolean);
    return parts.join(", ");
  };

  // ── Build the order payload ───────────────────────────────────────────────
  const buildPayload = (): OrderPayload => ({
    fullName: form.name.trim(),
    phoneNumber: form.phone.replace(/[\s-]/g, ""),
    email: form.email.trim(),
    location: buildLocationString(),
    addressDetail: detailAddress.trim(),
    paymentMethod: mapPaymentMethod(form.payment),
    totalAmount: formatPrice(grandTotal),
    note: form.note.trim(),
  });

  // ── Call the backend API ──────────────────────────────────────────────────
  const processOrder = async () => {
    // Validate
    const validationError = validateOrderForm({
      fullName: form.name,
      phoneNumber: form.phone,
      email: form.email,
      addressValid,
    });
    if (validationError) {
      setErrorMessage(validationError);
      setStatus("error");
      return;
    }

    if (form.payment === "vietqr" || form.payment === "manual") {
      // For QR/bank payments: just open payment modal, defer POST to confirmation
      setShowQR(true);
      return;
    }

    // COD: submit to Google Sheet immediately
    setStatus("sending");
    setErrorMessage("");

    try {
      const payload = buildPayload();
      const result = await submitOrder(payload);
      setOrderId(result.orderId);
      setStatus("success");
      clearCart();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đặt hàng thất bại. Vui lòng thử lại.";
      setErrorMessage(msg);
      setStatus("error");
    }
  };

  // ── Handle form submit ────────────────────────────────────────────────────
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Quick client-side validation before API call
    const validationError = validateOrderForm({
      fullName: form.name,
      phoneNumber: form.phone,
      email: form.email,
      addressValid,
    });

    if (validationError) {
      setErrorMessage(validationError);
      // Focus first invalid field
      if (!form.name.trim()) document.getElementById("field-name")?.focus();
      else if (!form.phone.trim()) document.getElementById("field-phone")?.focus();
      else if (!detailAddress.trim()) document.getElementById("field-detail-address")?.focus();
      return;
    }

    // All methods go through processOrder (API call first)
    processOrder();
  };

  // ── Handle payment modal confirm (after user says "tôi đã chuyển khoản") ─
  const handlePaymentConfirmed = (returnedOrderId: string) => {
    setOrderId(returnedOrderId);
    setShowQR(false);
    setStatus("success");
    clearCart();
  };

  // ── Called by modal to POST order to Google Sheet ─────────────────────────
  const handleModalSubmitOrder = async (): Promise<{ orderId: string }> => {
    const payload = buildPayload();
    const result = await submitOrder(payload);
    return { orderId: result.orderId };
  };

  // ── Reset & go back ───────────────────────────────────────────────────────
  const handleBackToShop = () => {
    setStatus("idle");
    setErrorMessage("");
    setOrderId("");
    onClose();
  };

  // ── Reset form fields ─────────────────────────────────────────────────────
  const resetForm = () => {
    setForm({ name: "", phone: "", email: "", note: "", payment: "cod" });
    setDetailAddress("");
    setOrderId("");
    setErrorMessage("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f5f5f7]">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-[#d2d2d7]/40 bg-white/80 backdrop-blur-2xl">
        <div className="container flex h-12 items-center justify-between">
          <button type="button" onClick={handleBackToShop}
            className="inline-flex items-center gap-1.5 text-sm text-[#8B5E3C] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Tiếp tục mua hàng
          </button>
          <BrandLogo compact showSubtitle={false} />
          <div className="flex items-center gap-2 text-xs text-[#6e6e73]">
            <ShieldCheck className="h-4 w-4" />
            Thanh toán an toàn
          </div>
        </div>
      </div>

      {/* Success */}
      {status === "success" ? (
        <div className="container py-20 text-center">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-10 shadow-sm">
            <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-500">
              <Check className="h-8 w-8" />
            </span>
            <h2 className="text-xl font-semibold text-[#1d1d1f]">Đặt hàng thành công!</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
              {form.payment === "cod" ? (
                <>
                  Mã đơn của bạn là <strong className="text-[#1d1d1f]">{orderId}</strong>.{" "}
                  TA SOLUTIONS sẽ liên hệ sớm để xác nhận.
                </>
              ) : (
                <>
                  Cảm ơn bạn đã đặt mua BA.SEW. Chúng tôi sẽ xác nhận thanh toán và giao hàng trong thời gian sớm nhất.
                </>
              )}
            </p>
            <p className="mt-4 rounded-xl bg-[#f5f5f7] p-4 text-xs text-[#6e6e73]">
              Mã đơn hàng: <span className="font-bold text-[#1d1d1f]">{orderId || "N/A"}</span>
            </p>
            <button type="button" onClick={() => { resetForm(); handleBackToShop(); }}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#8B5E3C] px-6 text-sm font-medium text-white hover:bg-[#6F4A2F]">
              Về trang chủ
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="container py-20 text-center">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-10 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1d1d1f]">Giỏ hàng trống</h2>
            <p className="mt-2 text-sm text-[#6e6e73]">Hãy thêm sản phẩm BA.SEW vào giỏ hàng.</p>
            <button type="button" onClick={handleBackToShop}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#8B5E3C] px-6 text-sm font-medium text-white hover:bg-[#6F4A2F]">
              <ArrowLeft className="h-4 w-4" />
              Quay lại mua hàng
            </button>
          </div>
        </div>
      ) : (
        <div className="container py-8">
          {/* Checkout steps */}
          <div className="mb-8 flex items-center justify-center gap-8">
            {[
              { icon: MapPin, label: "Giao hàng", active: true },
              { icon: CreditCard, label: "Thanh toán", active: true },
              { icon: Check, label: "Xác nhận", active: false },
            ].map(({ icon: Icon, label, active }, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className={`h-px w-8 ${active ? "bg-[#8B5E3C]" : "bg-[#d2d2d7]"}`} />}
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${active ? "bg-[#8B5E3C] text-white" : "bg-[#d2d2d7] text-[#6e6e73]"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className={`text-xs font-medium ${active ? "text-[#1d1d1f]" : "text-[#6e6e73]"}`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Error banner */}
          {errorMessage && (
            <div className="mb-6 mx-auto max-w-2xl flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm animate-[slideDown_0.25s_ease-out]">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                <button type="button" onClick={() => setErrorMessage("")}
                  className="mt-1 text-xs text-red-500 hover:text-red-700 underline">
                  Đóng
                </button>
              </div>
            </div>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left - Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Customer info */}
              <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C]/10 text-[#8B5E3C]">
                    <User className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Thông tin người nhận</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Họ và tên *</label>
                    <input id="field-name" name="name" type="text" required value={form.name} onChange={handleChange}
                      placeholder="Nhập họ và tên"
                      className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20" />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Số điện thoại *</label>
                      <input id="field-phone" name="phone" type="tel" required value={form.phone} onChange={handleChange}
                        placeholder="Nhập số điện thoại"
                        className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#6e6e73]">Email</label>
                      <input name="email" type="email" value={form.email} onChange={handleChange}
                        placeholder="Nhập email (không bắt buộc)"
                        className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm text-[#1d1d1f] outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping address */}
              <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C]/10 text-[#8B5E3C]">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Địa chỉ giao hàng</h3>
                </div>

                {/* ── 3-level address cascade ── */}
                {addrError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">
                    {addrError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Tỉnh / Thành phố */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                      Tỉnh / Thành phố <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selected.province?.code ?? ""}
                        onChange={(e) => {
                          const p = provinces.find((x) => x.code === Number(e.target.value)) ?? null;
                          selectProvince(p);
                        }}
                        disabled={addrLoading.provinces}
                        className="h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-sm text-[#1d1d1f] outline-none transition-all focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20 disabled:cursor-not-allowed disabled:bg-[#f5f5f7] disabled:text-[#86868b]"
                      >
                        <option value="">{addrLoading.provinces ? "Đang tải..." : "-- Chọn Tỉnh/TP --"}</option>
                        {provinces.map((p) => (
                          <option key={p.code} value={p.code}>{p.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#86868b]">
                        {addrLoading.provinces
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Quận / Huyện */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                      Quận / Huyện <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selected.district?.code ?? ""}
                        onChange={(e) => {
                          const d = districts.find((x) => x.code === Number(e.target.value)) ?? null;
                          selectDistrict(d);
                        }}
                        disabled={!selected.province || addrLoading.districts}
                        className="h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-sm text-[#1d1d1f] outline-none transition-all focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20 disabled:cursor-not-allowed disabled:bg-[#f5f5f7] disabled:text-[#86868b]"
                      >
                        <option value="">
                          {!selected.province
                            ? "-- Chọn Quận/Huyện --"
                            : addrLoading.districts
                              ? "Đang tải..."
                              : "-- Chọn Quận/Huyện --"}
                        </option>
                        {districts.map((d) => (
                          <option key={d.code} value={d.code}>{d.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#86868b]">
                        {addrLoading.districts
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>

                  {/* Phường / Xã */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                      Phường / Xã <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={selected.ward?.code ?? ""}
                        onChange={(e) => {
                          const w = wards.find((x) => x.code === Number(e.target.value)) ?? null;
                          selectWard(w);
                        }}
                        disabled={!selected.district || addrLoading.wards}
                        className="h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white px-4 pr-9 text-sm text-[#1d1d1f] outline-none transition-all focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20 disabled:cursor-not-allowed disabled:bg-[#f5f5f7] disabled:text-[#86868b]"
                      >
                        <option value="">
                          {!selected.district
                            ? "-- Chọn Phường/Xã --"
                            : addrLoading.wards
                              ? "Đang tải..."
                              : "-- Chọn Phường/Xã --"}
                        </option>
                        {wards.map((w) => (
                          <option key={w.code} value={w.code}>{w.name}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#86868b]">
                        {addrLoading.wards
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <ChevronDown className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Địa chỉ chi tiết */}
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
                    Địa chỉ chi tiết <span className="text-red-400">*</span>
                    <span className="ml-1 font-normal text-[#86868b]">(Số nhà, tên đường, tầng...)</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#86868b]">
                      <Globe className="h-4 w-4" />
                    </span>
                    <input
                      id="field-detail-address"
                      type="text"
                      value={detailAddress}
                      onChange={(e) => setDetailAddress(e.target.value)}
                      placeholder="VD: 123 Nguyễn Huệ, P. Bến Nghé, Tầng 3..."
                      className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white pl-10 pr-4 text-sm text-[#1d1d1f] outline-none transition-all placeholder:text-[#86868b] focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20"
                    />
                  </div>
                </div>

                {/* Full address preview */}
                {fullAddress && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#8B5E3C]/20 bg-[#FDF6F0] p-3">
                    <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5E3C]" />
                    <div>
                      <p className="text-xs font-semibold text-[#8B5E3C]">Địa chỉ giao hàng</p>
                      <p className="mt-0.5 text-sm text-[#1d1d1f]">{fullAddress}</p>
                    </div>
                  </div>
                )}

                {/* Ghi chú giao hàng */}
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Ghi chú giao hàng</label>
                  <textarea name="note" value={form.note} onChange={handleChange} rows={2}
                    placeholder="VD: Giao giờ hành chính, gọi trước khi giao..."
                    className="w-full rounded-xl border border-[#d2d2d7] bg-white px-4 py-3 text-sm text-[#1d1d1f] outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C]/20" />
                </div>
              </div>

              {/* Payment method */}
              <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#8B5E3C]/10 text-[#8B5E3C]">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Phương thức thanh toán</h3>
                </div>

                <div className="space-y-3">
                  {([
                    {
                      value: "vietqr" as PaymentMethod,
                      label: "VietQR / MoMo",
                      desc: "Quét mã QR bằng App Ngân hàng hoặc MoMo — tự động điền số tiền & nội dung",
                      icon: QrCode,
                      badge: "Khuyên dùng",
                    },
                    {
                      value: "manual" as PaymentMethod,
                      label: "Chuyển khoản thủ công",
                      desc: "Xem thông tin tài khoản và tự nhập nội dung chuyển khoản",
                      icon: Banknote,
                      badge: null,
                    },
                    {
                      value: "cod" as PaymentMethod,
                      label: "Thanh toán khi nhận hàng (COD)",
                      desc: "Trả tiền mặt khi nhận hàng, không cần chuyển khoản trước",
                      icon: Truck,
                      badge: null,
                    },
                  ] as const).map(({ value, label, desc, icon: Icon, badge }) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${form.payment === value
                        ? "border-[#8B5E3C] bg-[#8B5E3C]/5 shadow-sm"
                        : "border-[#d2d2d7] hover:bg-[#f5f5f7]"
                        }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={value}
                        checked={form.payment === value}
                        onChange={handleChange}
                        className="mt-0.5 h-4 w-4 accent-[#8B5E3C]"
                      />
                      <Icon
                        className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${form.payment === value ? "text-[#8B5E3C]" : "text-[#6e6e73]"
                          }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[#1d1d1f]">{label}</span>
                          {badge && (
                            <span className="rounded-full bg-[#8B5E3C] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              {badge}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-[#6e6e73]">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* VietQR info hint */}
                {form.payment === "vietqr" && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#FDF6F0] p-3.5 ring-1 ring-[#8B5E3C]/15">
                    <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-[#8B5E3C]" />
                    <p className="text-xs leading-relaxed text-[#6e6e73]">
                      Sau khi nhấn <strong className="text-[#1d1d1f]">Đặt hàng</strong>, mã QR sẽ hiện ra với{" "}
                      <strong className="text-[#1d1d1f]">số tiền và nội dung chuyển khoản tự động</strong>.{" "}
                      Quét bằng bất kỳ App Ngân hàng hoặc MoMo.
                    </p>
                  </div>
                )}

                {/* COD note */}
                {form.payment === "cod" && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f5f5f7] p-3.5">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#6e6e73]" />
                    <p className="text-xs leading-relaxed text-[#6e6e73]">
                      Bạn chỉ cần chuẩn bị{" "}
                      <strong className="text-[#1d1d1f]">{formatPrice(grandTotal)}</strong>{" "}
                      khi nhận hàng. Shipper sẽ liên hệ trước khi giao.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit - mobile */}
              <button type="submit" disabled={status === "sending"}
                className="h-12 w-full rounded-full bg-[#8B5E3C] text-[15px] font-medium text-white transition-all hover:bg-[#6F4A2F] disabled:opacity-60 lg:hidden">
                {status === "sending" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  `Đặt hàng — ${formatPrice(grandTotal)}`
                )}
              </button>
            </form>

            {/* Right - Order summary */}
            <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8 lg:sticky lg:top-20">
              <h3 className="mb-5 text-base font-semibold text-[#1d1d1f]">
                Đơn hàng ({totalItems} sản phẩm)
              </h3>

              <div className="divide-y divide-[#f5f5f7]">
                {items.map((item) => (
                  <div key={`${item.id}-${item.color}`} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1d1d1f] text-[10px] font-bold text-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1d1d1f] line-clamp-1">{item.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-block h-3.5 w-3.5 rounded-full border border-[#d2d2d7]"
                            style={{ backgroundColor: item.color === "Trắng" ? "#f0f0f0" : item.color === "Đen" ? "#1d1d1f" : "#8B5E3C" }} />
                          <span className="text-xs text-[#6e6e73]">{item.color}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateQuantity(item.id, item.color, item.quantity - 1)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed]">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.color, item.quantity + 1)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-[#e8e8ed]">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#1d1d1f]">{formatPrice(item.price * item.quantity)}</span>
                          <button type="button" onClick={() => removeItem(item.id, item.color)}
                            className="text-[#6e6e73] hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-5 space-y-2 border-t border-[#f5f5f7] pt-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6e6e73]">Tạm tính</span>
                  <span className="text-[#1d1d1f]">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6e6e73]">Phí vận chuyển</span>
                  <span className="font-medium text-green-600">Miễn phí</span>
                </div>
                <div className="flex justify-between border-t border-[#f5f5f7] pt-3 text-base">
                  <span className="font-semibold text-[#1d1d1f]">Tổng cộng</span>
                  <span className="text-lg font-bold text-[#1d1d1f]">{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Submit - desktop */}
              <button type="button" disabled={status === "sending"}
                onClick={() => {
                  const formEl = document.querySelector("form") as HTMLFormElement;
                  formEl?.requestSubmit();
                }}
                className="mt-6 hidden h-12 w-full rounded-full bg-[#8B5E3C] text-[15px] font-medium text-white transition-all hover:bg-[#6F4A2F] disabled:opacity-60 lg:inline-flex lg:items-center lg:justify-center">
                {status === "sending" ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </span>
                ) : (
                  `Đặt hàng — ${formatPrice(grandTotal)}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment QR modal */}
      <PaymentQRModal
        isOpen={showQR}
        paymentMethod={form.payment}
        amount={grandTotal}
        phone={form.phone}
        onClose={() => setShowQR(false)}
        onConfirm={handlePaymentConfirmed}
        onSubmitOrder={handleModalSubmitOrder}
      />
    </div>
  );
};

export default CheckoutSection;
