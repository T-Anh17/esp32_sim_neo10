import type { FC } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";

function formatPrice(price: number): string {
  return price.toLocaleString("vi-VN") + "đ";
}

interface CartDropdownProps {
  onCheckout?: () => void;
}

const CartDropdown: FC<CartDropdownProps> = ({ onCheckout }) => {
  const { items, isOpen, totalItems, totalPrice, removeItem, updateQuantity, closeCart } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={closeCart} />

      {/* Dropdown panel */}
      <div className="fixed right-0 top-12 z-50 w-full max-w-[26rem] animate-[slideDown_0.2s_ease-out] sm:right-6 sm:top-16">
        <div className="mx-3 overflow-hidden rounded-[2rem] bg-white apple-shadow sm:mx-0">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#f5f5f7] px-6 py-5">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-[#1d1d1f]" />
              <h3 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Giỏ hàng {totalItems > 0 && `(${totalItems})`}</h3>
            </div>
            <button type="button" onClick={closeCart}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#86868b] hover:bg-[#f5f5f7] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-[#d2d2d7]" />
                <p className="mt-4 text-[15px] font-medium text-[#86868b]">Chưa có sản phẩm nào</p>
                <a
                  href="#pricing-order"
                  onClick={closeCart}
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[#0066cc] px-6 text-[15px] font-medium text-white transition-all hover:bg-[#005bb5] hover:scale-[1.02]"
                >
                  Đặt hàng ngay
                </a>
              </div>
            ) : (
              <div className="divide-y divide-[#f5f5f7]">
                {items.map((item) => (
                  <div key={`${item.id}-${item.color}`} className="flex gap-3 px-5 py-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f5f5f7]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold text-[#1d1d1f] line-clamp-1">{item.name}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span
                              className="inline-block h-3.5 w-3.5 rounded-full border border-[#d2d2d7]"
                              style={{ backgroundColor: item.color === "Trắng" ? "#f0f0f0" : item.color === "Đen" ? "#1d1d1f" : "#8B5E3C" }}
                            />
                            <span className="text-[13px] text-[#86868b]">{item.color}</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id, item.color)}
                          className="shrink-0 p-1 text-[#86868b] hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-full bg-[#f5f5f7] p-1">
                          <button type="button" onClick={() => updateQuantity(item.id, item.color, item.quantity - 1)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-[#1d1d1f]">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-[13px] font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(item.id, item.color, item.quantity + 1)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-[#1d1d1f]">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-[15px] font-bold text-[#1d1d1f]">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="bg-[#f5f5f7] px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[15px] font-medium text-[#86868b]">Tổng cộng</span>
                <span className="text-lg font-bold text-[#1d1d1f]">{formatPrice(totalPrice)}</span>
              </div>
              <button type="button" onClick={() => { closeCart(); onCheckout?.(); }}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#1d1d1f] text-[15px] font-medium text-white transition-all hover:bg-[#3a3a3c] hover:scale-[1.02] active:scale-[0.98]">
                Thanh toán ({totalItems} sản phẩm)
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CartDropdown;