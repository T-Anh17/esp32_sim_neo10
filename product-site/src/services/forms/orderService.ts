/**
 * Order Service — handles checkout order submission to Google Sheets backend.
 *
 * The Google Apps Script endpoint returns a redirect (302) before serving JSON.
 * We use `redirect: "follow"` to transparently follow it and parse the final JSON.
 */

const ORDER_API_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxJQAbxKFrGSvxYXryyx3mu3Cdj3ZRTVmYFr6Y9V59ZnUfM0oESExIqso-hKv9NCT0EDQ/exec";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderPayload {
  fullName: string;
  phoneNumber: string;
  email: string;
  location: string;
  addressDetail: string;
  paymentMethod: string; // "VietQR" | "MoMo" | "Bank" | "COD"
  totalAmount: string;
  note: string;
}

export interface OrderResult {
  success: true;
  orderId: string;
}

export interface OrderError {
  success: false;
  message: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VN_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])\d{7}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrderForm(data: {
  fullName: string;
  phoneNumber: string;
  email: string;
  addressValid: boolean;
}): string | null {
  if (!data.fullName.trim()) return "Vui lòng nhập họ và tên.";

  const cleanPhone = data.phoneNumber.replace(/[\s-]/g, "");
  if (!cleanPhone) return "Vui lòng nhập số điện thoại.";
  if (!VN_PHONE_REGEX.test(cleanPhone)) {
    return "Số điện thoại không đúng định dạng Việt Nam (VD: 0775316675).";
  }

  if (data.email.trim() && !EMAIL_REGEX.test(data.email.trim())) {
    return "Email không đúng định dạng.";
  }

  if (!data.addressValid) {
    return "Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập địa chỉ chi tiết.";
  }

  return null;
}

// ─── Payment method mapping (internal → backend) ─────────────────────────────

export function mapPaymentMethod(internal: string): string {
  switch (internal) {
    case "vietqr":
      return "VietQR";
    case "manual":
      return "Bank";
    case "cod":
      return "COD";
    default:
      return internal;
  }
}

// ─── Submit Order ─────────────────────────────────────────────────────────────

export async function submitOrder(payload: OrderPayload): Promise<OrderResult> {
  const body = { ...payload };

  try {
    const res = await fetch(ORDER_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow",
    });

    // Google Apps Script may return opaque responses in no-cors mode.
    // With redirect: "follow" the browser follows the 302 and we get the JSON.
    let json: Record<string, unknown>;

    try {
      json = await res.json();
    } catch {
      // If JSON parsing fails, attempt text
      const text = await res.text().catch(() => "");
      throw new Error(text || `Lỗi server (HTTP ${res.status})`);
    }

    if (json.status === "success" || json.result === "success") {
      return {
        success: true,
        orderId: String(json.orderId || json.order_id || "N/A"),
      };
    }

    // Backend returned an error
    throw new Error(
      String(json.message || json.error || "Đặt hàng thất bại. Vui lòng thử lại.")
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Failed to fetch") {
        throw new Error("Không thể kết nối đến server. Vui lòng kiểm tra mạng và thử lại.");
      }
      throw error;
    }
    throw new Error("Đặt hàng thất bại. Vui lòng thử lại.");
  }
}
