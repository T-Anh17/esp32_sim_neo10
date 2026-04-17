import type { FC } from "react";
import { cn } from "@/lib/utils";
import type { BrandLogoProps } from "@/types";
import logo from "@/assets/logo.webp";

const BrandLogo: FC<BrandLogoProps> = ({ className, compact = false, showSubtitle = true }) => {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg">
        <img src={logo} alt="Logo BA.SEW" className="h-full w-full object-contain" />
      </span>
      <div className={cn("min-w-0 flex flex-col justify-center", compact && "space-y-0")}>
        <p className="text-[17px] font-bold tracking-tight text-[#1d1d1f] leading-none">BA.SEW</p>
        {showSubtitle && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[#86868b] mt-0.5">
            Smart Emergency Warning
          </p>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
