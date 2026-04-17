import { useState, type FC } from "react";
import { Check, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import productImg1 from "@/assets/img1.jpg";
import productImg2 from "@/assets/img2.jpg";
import productImg3 from "@/assets/img3.jpg";

const PRODUCT_COLORS = [
  { name: "Đen", value: "#1d1d1f", image: productImg1 },
  { name: "Trắng", value: "#f0f0f0", image: productImg2 },
  { name: "Nâu", value: "#8B5E3C", image: productImg3 },
];

const PRODUCT = {
  id: "basew-device",
  name: "BA.SEW — Thiết bị cảnh báo khẩn cấp",
  price: 400000,
};

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderModal: FC<OrderModalProps> = ({ isOpen, onClose }) => {
  const { addItem, toggleCart } = useCart();
  const [selectedColor, setSelectedColor] = useState(PRODUCT_COLORS[0]);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addItem({ ...PRODUCT, image: selectedColor.image, color: selectedColor.name }, qty);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      toggleCart();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[26rem] overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-[slideDown_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f5f5f7] px-8 py-5">
          <h3 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Chọn sản phẩm</h3>
          <button type="button" onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#86868b] hover:bg-[#f5f5f7] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8">
          {/* Product image */}
          <div className="overflow-hidden rounded-2xl bg-[#f5f5f7]">
            <img
              src={selectedColor.image}
              alt={`BA.SEW — ${selectedColor.name}`}
              className="mx-auto h-48 w-full object-contain"
            />
          </div>

          {/* Name + price */}
          <div className="mt-5 flex items-start justify-between gap-4">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{PRODUCT.name}</p>
            <p className="text-[15px] font-bold text-[#1d1d1f] whitespace-nowrap">
              {PRODUCT.price.toLocaleString("vi-VN")}đ
            </p>
          </div>

          {/* Color picker */}
          <div className="mt-6">
            <p className="mb-3 text-[13px] text-[#86868b]">
              Màu sắc: <span className="font-semibold text-[#1d1d1f]">{selectedColor.name}</span>
            </p>
            <div className="flex gap-4">
              {PRODUCT_COLORS.map((color) => (
                <button key={color.name} type="button" onClick={() => setSelectedColor(color)}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all ${selectedColor.name === color.name
                    ? "border-[#0066cc] ring-2 ring-[#0066cc]/20 scale-110"
                    : "border-transparent hover:border-[#d2d2d7]"
                    }`}>
                  <span className="h-8 w-8 rounded-full border border-black/5" style={{ backgroundColor: color.value }} />
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-6">
            <p className="mb-3 text-[13px] text-[#86868b]">Số lượng</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full bg-[#f5f5f7] p-1">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-white hover:shadow-sm transition-all text-[#1d1d1f]">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center text-[15px] font-semibold text-[#1d1d1f]">{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#f5f5f7] hover:bg-white hover:shadow-sm transition-all text-[#1d1d1f]">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <span className="ml-auto text-lg font-bold text-[#1d1d1f]">
                {(PRODUCT.price * qty).toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          {/* Add to cart */}
          <button type="button" onClick={handleAddToCart}
            className={`mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white transition-all ${added ? "bg-green-500 scale-[1.02]" : "bg-[#0066cc] hover:bg-[#005bb5] hover:scale-[1.02] active:scale-[0.98]"
              }`}>
            {added
              ? <><Check className="h-5 w-5" />Đã thêm vào giỏ!</>
              : <><ShoppingBag className="h-5 w-5" />Thêm vào giỏ hàng</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderModal;